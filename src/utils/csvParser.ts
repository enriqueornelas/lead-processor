/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Lead } from '../types';

/**
 * Parses a single CSV line, respecting double quotes.
 */
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Cleans string field (removes wrapping quotes if any).
 */
function cleanField(val: string): string {
  if (!val) return '';
  let str = val.trim();
  if (str.startsWith('"') && str.endsWith('"')) {
    str = str.substring(1, str.length - 1);
  }
  return str.replace(/""/g, '"').trim();
}

/**
 * Parses the pasted CSV text and returns a Lead object.
 * It is robust enough to handle:
 * - Header row present
 * - Raw data row only
 * - Multiple rows (takes the first valid data row)
 */
export function parseLeadCSV(text: string): Lead | null {
  if (!text || !text.trim()) return null;

  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length === 0) return null;

  // Determine if a line is a header line
  const isHeaderLine = (fields: string[]): boolean => {
    const combined = fields.join(',').toLowerCase();
    return (
      combined.includes('name,category') ||
      combined.includes('place_id') ||
      combined.includes('review_count') ||
      combined.includes('maps_url')
    );
  };

  let dataLine = '';
  
  // If the first line is a header and there is a second line, take the second line as data
  const firstLineFields = parseCSVLine(lines[0]);
  if (isHeaderLine(firstLineFields)) {
    if (lines.length > 1) {
      dataLine = lines[1];
    } else {
      return null; // Only header was provided
    }
  } else {
    dataLine = lines[0];
  }

  const fields = parseCSVLine(dataLine);
  if (fields.length < 5) return null; // Too short to be a valid lead row

  // Map fields to Lead object based on the standard format:
  // name,category,address,phone,website,maps_url,rating,review_count,business_status,primary_type,has_website,status,pinned,lat,lng,place_id
  const name = cleanField(fields[0] || '');
  if (!name) return null;

  return {
    name,
    category: cleanField(fields[1] || 'Business'),
    address: cleanField(fields[2] || ''),
    phone: cleanField(fields[3] || ''),
    website: cleanField(fields[4] || ''),
    mapsUrl: cleanField(fields[5] || ''),
    rating: parseFloat(fields[6]) || 0,
    reviewCount: parseInt(fields[7], 10) || 0,
    businessStatus: cleanField(fields[8] || 'OPERATIONAL'),
    primaryType: cleanField(fields[9] || ''),
    hasWebsite: (cleanField(fields[10] || '').toLowerCase() === 'yes' || cleanField(fields[10] || '').toLowerCase() === 'true') ? 'yes' : 'no',
    status: cleanField(fields[11] || 'new'),
    pinned: (cleanField(fields[12] || '').toLowerCase() === 'yes' || cleanField(fields[12] || '').toLowerCase() === 'true') ? 'yes' : 'no',
    lat: parseFloat(fields[13]) || 0,
    lng: parseFloat(fields[14]) || 0,
    placeId: cleanField(fields[15] || ''),
  };
}
