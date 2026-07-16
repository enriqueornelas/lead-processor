/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Lead } from "./types";

export interface AppData {
  leads: Lead[];
  completed: Record<string, boolean>;
}

async function parseJson(res: Response) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function fetchAppData(): Promise<AppData> {
  const res = await fetch("/api/leads");
  return parseJson(res);
}

export async function saveLead(lead: Lead): Promise<AppData> {
  const res = await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(lead),
  });
  return parseJson(res);
}

export async function removeLead(id: string): Promise<AppData> {
  const res = await fetch(`/api/leads/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return parseJson(res);
}

export async function importLeadsApi(leads: Lead[]): Promise<AppData> {
  const res = await fetch("/api/leads/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(leads),
  });
  return parseJson(res);
}

export async function toggleProgress(id: string): Promise<AppData> {
  const res = await fetch(`/api/progress/${encodeURIComponent(id)}/toggle`, {
    method: "POST",
  });
  return parseJson(res);
}
