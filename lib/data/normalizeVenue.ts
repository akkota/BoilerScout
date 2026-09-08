import { TypesenseVenueDocument } from "@/lib/typesense/schema";
import { cleanTitle, stripHtml } from "./cleanPurdueData";
import { CANONICAL_CAMPUS_BUILDINGS } from "./campusVenues";

export interface RawPurduePlaceWrapper {
  place?: RawPurduePlace;
  id?: number | string;
  name?: string;
  display_name?: string;
  description?: string;
  description_text?: string;
  type?: string;
  address?: string;
  geo?: {
    latitude?: string | number | null;
    longitude?: string | number | null;
    street?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    country?: string | null;
  };
  url?: string;
  localist_url?: string;
  photo_url?: string;
}

export type RawPurduePlace = Omit<RawPurduePlaceWrapper, "place">;

/**
 * Common typo and abbreviation cleanups for Purdue facilities
 */
const VENUE_NAME_FIXES: Array<[RegExp, string]> = [
  [/Phenotypiing/gi, "Phenotyping"],
  [/Resid Hall/gi, "Residence Hall"],
  [/Res Hall/gi, "Residence Hall"],
  [/Cmptr Sci Bldg/gi, "Computer Science Building"],
  [/Ctr for Entrepreneurshp/gi, "Center for Entrepreneurship"],
  [/Student Servcs/gi, "Student Services"],
  [/Lib Arts & Ed/gi, "Liberal Arts & Education"],
  [/Strc Bio/gi, "Structural Biology"],
  [/Turfgrass Rsch&Diag Ct/gi, "Turfgrass Research & Diagnostic Center"],
];

/**
 * Normalizes a raw Purdue Localist place into a TypesenseVenueDocument.
 */
export function normalizeVenue(raw: RawPurduePlaceWrapper): TypesenseVenueDocument | null {
  const item: RawPurduePlace = raw.place ? raw.place : raw;

  if (!item.id) {
    return null;
  }

  const rawName = item.display_name || item.name || "";
  let name = cleanTitle(rawName);
  if (!name) {
    return null;
  }

  // Apply known facility name fixes
  for (const [pattern, replacement] of VENUE_NAME_FIXES) {
    name = name.replace(pattern, replacement);
  }

  // Geopoints: validate latitude & longitude
  let lat: number | undefined;
  let lng: number | undefined;

  if (item.geo?.latitude && item.geo?.longitude) {
    lat =
      typeof item.geo.latitude === "number"
        ? item.geo.latitude
        : parseFloat(String(item.geo.latitude));
    lng =
      typeof item.geo.longitude === "number"
        ? item.geo.longitude
        : parseFloat(String(item.geo.longitude));
  }

  // Cross-reference with canonical campus buildings
  const lowerName = name.toLowerCase();
  const matchedCanonical = CANONICAL_CAMPUS_BUILDINGS.find((bldg) => {
    if (bldg.name.toLowerCase() === lowerName) return true;
    if (bldg.shortName.toLowerCase() === lowerName) return true;
    return bldg.aliases.some((alias) => alias.toLowerCase() === lowerName);
  });

  // Fallback coordinates from canonical list if missing in API
  if ((lat === undefined || isNaN(lat) || lng === undefined || isNaN(lng)) && matchedCanonical) {
    lat = matchedCanonical.location[0];
    lng = matchedCanonical.location[1];
  }

  if (lat === undefined || isNaN(lat) || lng === undefined || isNaN(lng)) {
    // Venue without valid geo coordinates cannot be queried by geo
    return null;
  }

  const short_name = matchedCanonical?.shortName;

  // Build aliases set
  const aliasSet = new Set<string>();
  if (short_name) aliasSet.add(short_name);

  if (matchedCanonical) {
    for (const a of matchedCanonical.aliases) {
      if (a.toLowerCase() !== lowerName) aliasSet.add(a);
    }
  }

  // Extract sub-name if hyphenated, e.g. "Fowler Hall - Stewart Center" -> "Fowler Hall", "Stewart Center"
  if (name.includes(" - ")) {
    const parts = name.split(" - ").map((p) => p.trim());
    for (const part of parts) {
      if (part && part.toLowerCase() !== lowerName) {
        aliasSet.add(part);
      }
    }
  }

  // Address details
  const address = item.address ? stripHtml(item.address) : item.geo?.street ? stripHtml(item.geo.street) : undefined;
  const city = item.geo?.city ? stripHtml(item.geo.city) : "West Lafayette";
  const state = item.geo?.state ? stripHtml(item.geo.state) : "IN";
  const zip = item.geo?.zip ? stripHtml(item.geo.zip) : undefined;

  // Determine type
  let type = matchedCanonical?.type;
  if (!type && item.type) {
    const rawType = item.type.toLowerCase();
    if (rawType.includes("academic") || rawType.includes("education")) type = "academic";
    else if (rawType.includes("residence") || rawType.includes("housing")) type = "residence";
    else if (rawType.includes("athletic") || rawType.includes("sports")) type = "athletic";
    else if (rawType.includes("recreation")) type = "recreation";
    else if (rawType.includes("student")) type = "student_center";
    else type = "venue";
  }

  const photo_url = item.photo_url?.trim() || undefined;
  const url = item.url?.trim() || undefined;
  const localist_url = item.localist_url?.trim() || undefined;

  return {
    id: String(item.id),
    name,
    short_name,
    aliases: Array.from(aliasSet),
    address,
    city,
    state,
    zip,
    location: [lat, lng],
    type: type || "venue",
    photo_url,
    url,
    localist_url,
    source: "purdue-places",
  };
}
