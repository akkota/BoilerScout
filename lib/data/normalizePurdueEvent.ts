import { TypesenseEventDocument } from "@/lib/typesense/schema";
import {
  cleanOrganizationName,
  cleanTitle,
  normalizeCategories,
  stripHtml,
} from "./cleanPurdueData";
import { resolveVenueCoordinates } from "./campusVenues";

/**
 * Raw Purdue Localist API event structure types (subset of interest)
 */
export interface RawPurdueEventWrapper {
  event?: RawPurdueEvent;
  // In case the API returns flat events
  id?: number | string;
  title?: string;
  description?: string;
  description_text?: string;
  location?: string;
  location_name?: string;
  geo?: {
    latitude?: string | number | null;
    longitude?: string | number | null;
    street?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  };
  departments?: Array<{ id?: number | string; name?: string }>;
  custom_fields?: { unit?: string };
  filters?: {
    event_types?: Array<{ id?: number | string; name?: string }>;
    event_audience?: Array<{ id?: number | string; name?: string }>;
  };
  tags?: string[];
  keywords?: string[];
  event_instances?: Array<{
    event_instance?: {
      id?: number | string;
      start?: string;
      end?: string | null;
      all_day?: boolean;
    };
  }>;
  first_date?: string;
  last_date?: string;
  localist_url?: string;
  url?: string;
  photo_url?: string;
  free?: boolean;
}

export type RawPurdueEvent = Omit<RawPurdueEventWrapper, "event">;

/**
 * Normalizes a raw Purdue Localist API event into a TypesenseEventDocument.
 * - Cleans HTML tags, HTML entities, and formatting artifacts.
 * - Canonicalizes organization names and deduplicates categories.
 * - Enriches missing coordinates using authoritative campus venue references.
 * Returns null if the event is missing mandatory identification or title.
 */
export function normalizePurdueEvent(
  raw: RawPurdueEventWrapper
): TypesenseEventDocument | null {
  const item: RawPurdueEvent = raw.event ? raw.event : raw;

  if (!item.id || !item.title) {
    return null;
  }

  const rawId = String(item.id).trim();
  const title = cleanTitle(item.title);
  if (!title) {
    return null;
  }

  // Extract clean text description
  let description = "";
  if (item.description_text && item.description_text.trim()) {
    description = stripHtml(item.description_text);
  } else if (item.description && item.description.trim()) {
    description = stripHtml(item.description);
  }

  // Determine and clean organization
  let rawOrg: string | undefined;
  if (item.custom_fields?.unit && item.custom_fields.unit.trim()) {
    rawOrg = item.custom_fields.unit;
  } else if (item.departments && item.departments.length > 0 && item.departments[0].name) {
    rawOrg = item.departments[0].name;
  }
  const organization = cleanOrganizationName(rawOrg);

  // Extract, clean, and deduplicate categories
  const rawCatList: string[] = [];

  if (item.filters?.event_types) {
    for (const t of item.filters.event_types) {
      if (t.name) rawCatList.push(t.name);
    }
  }
  if (item.filters?.event_audience) {
    for (const a of item.filters.event_audience) {
      if (a.name) rawCatList.push(a.name);
    }
  }
  if (Array.isArray(item.tags)) {
    for (const tag of item.tags) {
      if (tag) rawCatList.push(tag);
    }
  }
  if (Array.isArray(item.keywords)) {
    for (const kw of item.keywords) {
      if (kw) rawCatList.push(kw);
    }
  }

  const categories = normalizeCategories(rawCatList);

  // Compute start and end timestamps (epoch milliseconds)
  const primaryInstance = item.event_instances?.[0]?.event_instance;
  let starts_at = Date.now();

  const rawStart = primaryInstance?.start || item.first_date;
  if (rawStart) {
    const parsedStart = Date.parse(rawStart);
    if (!isNaN(parsedStart)) {
      starts_at = parsedStart;
    }
  }

  let ends_at: number | undefined;
  const rawEnd = primaryInstance?.end || item.last_date;
  if (rawEnd) {
    const parsedEnd = Date.parse(rawEnd);
    if (!isNaN(parsedEnd) && parsedEnd >= starts_at) {
      ends_at = parsedEnd;
    }
  }

  // Location name
  let location_name: string | undefined;
  if (item.location_name && item.location_name.trim()) {
    location_name = cleanTitle(item.location_name);
  } else if (item.location && item.location.trim()) {
    location_name = cleanTitle(item.location);
  } else if (item.geo?.street && item.geo.street.trim()) {
    location_name = cleanTitle(item.geo.street);
  }

  // Geopoint: Typesense requires [latitude, longitude]
  let location: [number, number] | undefined;
  if (item.geo?.latitude && item.geo?.longitude) {
    const lat =
      typeof item.geo.latitude === "number"
        ? item.geo.latitude
        : parseFloat(String(item.geo.latitude));
    const lng =
      typeof item.geo.longitude === "number"
        ? item.geo.longitude
        : parseFloat(String(item.geo.longitude));

    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && (lat !== 0 || lng !== 0)) {
      location = [lat, lng];
    }
  }

  // If coordinates are missing, resolve from authoritative campus venue directory
  if (!location && location_name) {
    const resolvedVenue = resolveVenueCoordinates(location_name);
    if (resolvedVenue) {
      location = resolvedVenue.location;
      // If the location name was just an abbreviation (e.g. "RAWL"), enrich location_name
      if (location_name.length <= 4 && resolvedVenue.name) {
        location_name = resolvedVenue.name;
      }
    }
  }

  // URLs
  const image_url = item.photo_url?.trim() || undefined;
  const url = item.localist_url?.trim() || item.url?.trim() || undefined;

  // Free flag
  const free = typeof item.free === "boolean" ? item.free : undefined;

  // For recurring event instances, construct a deterministic composite ID
  // e.g., "${rawId}_${instanceId}" or "${rawId}_${starts_at}" so each occurrence is queryable
  const instanceId = primaryInstance?.id ? String(primaryInstance.id).trim() : undefined;
  const id = instanceId && instanceId !== rawId ? `${rawId}_${instanceId}` : rawId;

  return {
    id,
    title,
    description,
    organization,
    categories,
    starts_at,
    ends_at,
    location_name,
    location,
    image_url,
    url,
    source: "purdue-events",
    free,
  };
}
