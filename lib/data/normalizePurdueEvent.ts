import { TypesenseEventDocument } from "@/lib/typesense/schema";
import { resolvePurdueBuilding } from "@/lib/data/purdueBuildings";
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
  room_number?: string | null;
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

/** Approximate centre of the Purdue West Lafayette campus. */
const PURDUE_CAMPUS_CENTER: [number, number] = [40.4266, -86.9166];

/**
 * How far a Localist coordinate may sit from the campus venue its own location name
 * claims before we treat the coordinate as wrong. Localist frequently geocodes a bare
 * street address to the wrong city (e.g. "100 South Grant Street" -> Denver, CO).
 */
const VENUE_MISMATCH_MILES = 2;

function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.8;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Resolve a venue hint against the campus venue directory, then the building lookup. */
function resolveCampusVenue(
  hint: string | undefined | null
): { name: string; location: [number, number] } | undefined {
  if (!hint || !hint.trim()) return undefined;

  const venue = resolveVenueCoordinates(hint);
  if (venue) {
    return { name: venue.name, location: venue.location };
  }

  const building = resolvePurdueBuilding(hint);
  if (building) {
    return { name: building.name, location: [building.lat, building.lng] };
  }

  return undefined;
}

/** Per-run ingestion diagnostics for coordinate quality. */
export interface NormalizationReport {
  /** Events that got coordinates straight from Localist. */
  fromLocalist: number;
  /** Events geocoded from the campus venue / building directory. */
  fromVenueLookup: number;
  /** Localist coordinates replaced because they contradicted a known campus venue. */
  correctedCoordinates: number;
  /** Human-readable log of each correction. */
  corrections: string[];
  /** Events left without coordinates. */
  missing: number;
  /** Unresolved venue names -> occurrence count. */
  unresolvedVenues: Map<string, number>;
}

export function createNormalizationReport(): NormalizationReport {
  return {
    fromLocalist: 0,
    fromVenueLookup: 0,
    correctedCoordinates: 0,
    corrections: [],
    missing: 0,
    unresolvedVenues: new Map(),
  };
}

/**
 * Normalizes a raw Purdue Localist API event into a TypesenseEventDocument.
 * - Cleans HTML tags, HTML entities, and formatting artifacts.
 * - Canonicalizes organization names and deduplicates categories.
 * - Prefers Localist coordinates, unless they contradict the campus venue the event
 *   itself names, in which case the verified campus mapping wins.
 * - Otherwise resolves known campus venues/buildings from the location name or room.
 * - Leaves coordinates undefined when no confident match exists (never guesses).
 * Returns null if the event is missing mandatory identification or title.
 */
export function normalizePurdueEvent(
  raw: RawPurdueEventWrapper,
  report?: NormalizationReport
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

  // Cap description length for memory-efficient neural vectorization on sandbox tiers
  if (description.length > 350) {
    description = description.slice(0, 350).trim();
  }

  // Determine and clean organization (prefer Localist unit when present)
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

  // Geopoint: Typesense requires [latitude, longitude].
  //
  // Resolution order:
  //   1. Localist coordinates, when they are valid and not contradicted by the venue name
  //   2. Known Purdue campus venue / building lookup (location name, then room number)
  //   3. Otherwise undefined -- never invent / guess coordinates.
  let location: [number, number] | undefined;
  const rawLat = item.geo?.latitude;
  const rawLng = item.geo?.longitude;
  if (rawLat != null && rawLng != null && rawLat !== "" && rawLng !== "") {
    const lat = typeof rawLat === "number" ? rawLat : parseFloat(String(rawLat));
    const lng = typeof rawLng === "number" ? rawLng : parseFloat(String(rawLng));

    if (
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180 &&
      (lat !== 0 || lng !== 0)
    ) {
      location = [lat, lng];
    }
  }

  // Known campus venue implied by the event's own location name or room number.
  const campusVenue =
    resolveCampusVenue(location_name) ?? resolveCampusVenue(item.room_number);

  if (campusVenue) {
    if (!location) {
      // Source priority 2: geocode from the verified campus mapping.
      location = campusVenue.location;
      if (report) report.fromVenueLookup++;
    } else {
      // Sanity check: an event that claims a known campus venue must not sit far from it.
      const drift = haversineMiles(
        location[0],
        location[1],
        campusVenue.location[0],
        campusVenue.location[1]
      );
      if (drift > VENUE_MISMATCH_MILES) {
        if (report) {
          report.correctedCoordinates++;
          report.corrections.push(
            `${title} @ "${location_name ?? item.room_number}": Localist [${location[0]}, ${location[1]}] was ` +
              `${Math.round(drift)} mi from ${campusVenue.name}; using verified campus coordinates.`
          );
        }
        location = campusVenue.location;
      } else {
        if (report) report.fromLocalist++;
      }
    }

    // If the location name was just a building code (e.g. "RAWL"), enrich it.
    if (location_name && location_name.length <= 4) {
      location_name = campusVenue.name;
    }
  } else if (location) {
    if (report) report.fromLocalist++;
  }

  if (report) {
    if (!location) {
      report.missing++;
      const key = location_name?.trim() || "(no location name)";
      report.unresolvedVenues.set(key, (report.unresolvedVenues.get(key) ?? 0) + 1);
    } else {
      const fromCampus = haversineMiles(
        location[0],
        location[1],
        PURDUE_CAMPUS_CENTER[0],
        PURDUE_CAMPUS_CENTER[1]
      );
      if (fromCampus > 500) {
        report.corrections.push(
          `WARNING: ${title} @ "${location_name ?? "?"}" kept coordinates ${Math.round(fromCampus)} mi from campus.`
        );
      }
    }
  }

  // URLs
  const image_url = item.photo_url?.trim() || undefined;
  const url = item.localist_url?.trim() || item.url?.trim() || undefined;

  // Free flag
  const free = typeof item.free === "boolean" ? item.free : undefined;

  // For recurring event instances, construct a deterministic composite ID
  // e.g., "${rawId}_${instanceId}" so each occurrence is queryable
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
