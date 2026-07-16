/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Lead {
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
  hasWebsite: 'yes' | 'no';
  status: string;
  pinned: 'yes' | 'no';
  lat: number;
  lng: number;
  placeId: string;
  
  // Custom fields filled during processing
  flatRate?: number;
  hostingRate?: number;
  firstMonthFree?: boolean;
  email?: string;
  ownerName?: string;
  nextSteps?: string;
  followUpDate?: string; // YYYY-MM-DD
  followUpTime?: string; // HH:MM
  savedAt?: string; // ISO timestamp
}

export type ViewMode = 'process' | 'list';
