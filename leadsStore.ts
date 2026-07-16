/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";

export interface LeadRecord {
  name: string;
  category: string;
  address: string;
  phone: string;
  website: string;
  mapsUrl: string;
  rating: number;
  reviewCount: number;
  businessStatus: string;
  primaryType: string;
  hasWebsite: "yes" | "no";
  status: string;
  pinned: "yes" | "no";
  lat: number;
  lng: number;
  placeId: string;
  flatRate?: number;
  hostingRate?: number;
  firstMonthFree?: boolean;
  email?: string;
  ownerName?: string;
  nextSteps?: string;
  followUpDate?: string;
  followUpTime?: string;
  savedAt?: string;
}

export interface AppData {
  leads: LeadRecord[];
  completed: Record<string, boolean>;
}

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "leads.json");

function emptyData(): AppData {
  return { leads: [], completed: {} };
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readData(): AppData {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) {
    return emptyData();
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      leads: Array.isArray(parsed.leads) ? parsed.leads : [],
      completed:
        parsed.completed && typeof parsed.completed === "object"
          ? parsed.completed
          : {},
    };
  } catch (err) {
    console.error("Failed to read leads data file:", err);
    return emptyData();
  }
}

export function writeData(data: AppData): void {
  ensureDataDir();
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmp, DATA_FILE);
}

export function leadKey(lead: { placeId?: string; name: string }): string {
  return lead.placeId || lead.name;
}

export function upsertLead(lead: LeadRecord): AppData {
  const data = readData();
  const key = leadKey(lead);
  const index = data.leads.findIndex((l) => leadKey(l) === key);
  if (index >= 0) {
    data.leads[index] = lead;
  } else {
    data.leads.unshift(lead);
  }
  writeData(data);
  return data;
}

export function deleteLead(id: string): AppData {
  const data = readData();
  data.leads = data.leads.filter((l) => leadKey(l) !== id);
  delete data.completed[id];
  writeData(data);
  return data;
}

export function importLeads(incoming: LeadRecord[]): AppData {
  const data = readData();
  const merged = [...incoming];
  data.leads.forEach((existing) => {
    if (!merged.some((m) => leadKey(m) === leadKey(existing))) {
      merged.push(existing);
    }
  });
  data.leads = merged;
  writeData(data);
  return data;
}

export function setCompleted(completed: Record<string, boolean>): AppData {
  const data = readData();
  data.completed = completed;
  writeData(data);
  return data;
}

export function toggleCompleted(id: string): AppData {
  const data = readData();
  data.completed[id] = !data.completed[id];
  writeData(data);
  return data;
}
