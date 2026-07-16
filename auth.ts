/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";

const COOKIE_NAME = "lp_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function masterPassword(): string {
  return process.env.MASTER_PASSWORD || "";
}

function sessionSecret(): string {
  return (
    process.env.SESSION_SECRET ||
    masterPassword() ||
    "lead-processor-dev-secret"
  );
}

export function isAuthConfigured(): boolean {
  return Boolean(masterPassword());
}

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie || "";
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    out[key] = decodeURIComponent(value);
  }
  return out;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", sessionSecret()).update(payload).digest("hex");
}

export function createSessionToken(): string {
  const exp = Date.now() + SESSION_TTL_MS;
  const nonce = crypto.randomBytes(16).toString("hex");
  const payload = `${exp}.${nonce}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [expStr, nonce, sig] = parts;
  const payload = `${expStr}.${nonce}`;
  const expected = sign(payload);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  return true;
}

export function passwordMatches(input: string): boolean {
  const expected = masterPassword();
  if (!expected) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    // Still do a compare to avoid leaking length timing too cheaply
    crypto.timingSafeEqual(Buffer.alloc(b.length), b);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

export function isAuthenticated(req: Request): boolean {
  if (!isAuthConfigured()) return true;
  const cookies = parseCookies(req);
  return verifySessionToken(cookies[COOKIE_NAME]);
}

export function setSessionCookie(res: Response, token: string) {
  const secure = process.env.COOKIE_SECURE === "true";
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (secure) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

export function clearSessionCookie(res: Response) {
  const secure = process.env.COOKIE_SECURE === "true";
  const parts = [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (secure) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!isAuthConfigured()) return next();
  if (isAuthenticated(req)) return next();
  return res.status(401).json({ error: "Unauthorized", authRequired: true });
}
