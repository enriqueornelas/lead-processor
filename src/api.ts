/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Lead } from "./types";

export interface AppData {
  leads: Lead[];
  completed: Record<string, boolean>;
}

export interface AuthStatus {
  configured: boolean;
  authenticated: boolean;
}

const jsonHeaders = { "Content-Type": "application/json" };

async function parseJson(res: Response) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(err.error || `Request failed (${res.status})`) as Error & {
      status?: number;
      authRequired?: boolean;
    };
    error.status = res.status;
    error.authRequired = Boolean(err.authRequired) || res.status === 401;
    throw error;
  }
  return res.json();
}

export async function fetchAuthStatus(): Promise<AuthStatus> {
  const res = await fetch("/api/auth/status", { credentials: "include" });
  return parseJson(res);
}

export async function login(password: string): Promise<void> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders,
    body: JSON.stringify({ password }),
  });
  await parseJson(res);
}

export async function logout(): Promise<void> {
  const res = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
  await parseJson(res);
}

export async function fetchAppData(): Promise<AppData> {
  const res = await fetch("/api/leads", { credentials: "include" });
  return parseJson(res);
}

export async function saveLead(lead: Lead): Promise<AppData> {
  const res = await fetch("/api/leads", {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders,
    body: JSON.stringify(lead),
  });
  return parseJson(res);
}

export async function removeLead(id: string): Promise<AppData> {
  const res = await fetch(`/api/leads/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
  return parseJson(res);
}

export async function importLeadsApi(leads: Lead[]): Promise<AppData> {
  const res = await fetch("/api/leads/import", {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders,
    body: JSON.stringify(leads),
  });
  return parseJson(res);
}

export async function toggleProgress(id: string): Promise<AppData> {
  const res = await fetch(`/api/progress/${encodeURIComponent(id)}/toggle`, {
    method: "POST",
    credentials: "include",
  });
  return parseJson(res);
}
