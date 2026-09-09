import { resolveVenueCoordinates } from "@/lib/data/campusVenues";
import { resolvePurdueBuilding } from "@/lib/data/purdueBuildings";

export interface CampusPlace {
  name: string;
  lat: number;
  lng: number;
}

/**
 * Resolve a campus place name/alias to lat/lng.
 * Prefers the venue directory (same order as event ingestion), then buildings.
 */
export function resolveCampusPlace(raw: string): CampusPlace | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;

  const venue = resolveVenueCoordinates(trimmed);
  if (venue) {
    return {
      name: venue.name,
      lat: venue.location[0],
      lng: venue.location[1],
    };
  }

  const building = resolvePurdueBuilding(trimmed);
  if (building) {
    return {
      name: building.name,
      lat: building.lat,
      lng: building.lng,
    };
  }

  // Retry without trailing "Hall" / "Building" / "Center" when the full string missed.
  const shortened = trimmed
    .replace(/\s+(hall|building|center|residence|dormitory)\.?$/i, "")
    .trim();
  if (shortened && shortened.toLowerCase() !== trimmed.toLowerCase()) {
    return resolveCampusPlace(shortened);
  }

  return undefined;
}

// Purdue campus center for Mapbox proximity bias (lng, lat for Mapbox API)
const PURDUE_CENTER_LNG = -86.9150;
const PURDUE_CENTER_LAT = 40.4274;
const MAX_GEOCODE_DISTANCE_KM = 25;

interface SearchBoxSuggestion {
  name?: string;
  mapbox_id?: string;
  full_address?: string;
}

interface SearchBoxSuggestResponse {
  suggestions?: SearchBoxSuggestion[];
}

interface SearchBoxRetrieveFeature {
  geometry?: {
    coordinates?: [number, number]; // [lng, lat]
  };
  properties?: {
    name?: string;
    full_address?: string;
  };
}

interface SearchBoxRetrieveResponse {
  features?: SearchBoxRetrieveFeature[];
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

let sessionCounter = 0;

function normalizeForComparison(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function suggestionMatchesQuery(queryRaw: string, suggestion: SearchBoxSuggestion): boolean {
  const query = normalizeForComparison(queryRaw);
  const name = normalizeForComparison(suggestion.name ?? "");
  if (!query || !name) return false;
  // The suggestion name must contain the query, or the query must contain the suggestion name
  if (name.includes(query) || query.includes(name)) return true;
  // Also accept if the first significant word of the query appears at the start of the suggestion
  const queryFirstWord = query.replace(/[0-9]/g, "").slice(0, Math.max(4, query.length));
  return queryFirstWord.length >= 3 && name.includes(queryFirstWord);
}

/**
 * Async place resolution with Mapbox Search Box fallback.
 * Tries local campus dictionaries first, then Mapbox Search Box API
 * (suggest → retrieve) biased around Purdue / West Lafayette.
 */
export async function resolveCampusPlaceAsync(
  raw: string
): Promise<CampusPlace | undefined> {
  const local = resolveCampusPlace(raw);
  if (local) return local;

  const token = process.env.MAPBOX_ACCESS_TOKEN?.trim();
  if (!token) return undefined;

  const trimmed = raw?.trim();
  if (!trimmed) return undefined;

  const sessionToken = `route-${++sessionCounter}-${Date.now()}`;

  try {
    // Step 1: Search Box suggest
    const suggestUrl =
      `https://api.mapbox.com/search/searchbox/v1/suggest` +
      `?q=${encodeURIComponent(trimmed)}` +
      `&proximity=${PURDUE_CENTER_LNG},${PURDUE_CENTER_LAT}` +
      `&limit=3` +
      `&session_token=${sessionToken}` +
      `&access_token=${token}`;

    const suggestRes = await fetch(suggestUrl, {
      headers: { Accept: "application/json" },
    });

    if (!suggestRes.ok) {
      console.warn("Mapbox Search suggest failed:", suggestRes.status);
      return undefined;
    }

    const suggestData = (await suggestRes.json()) as SearchBoxSuggestResponse;
    const suggestions = suggestData.suggestions;
    if (!Array.isArray(suggestions) || suggestions.length === 0) return undefined;

    // Find the first suggestion whose name actually matches the query
    const matched = suggestions.find((s) => suggestionMatchesQuery(trimmed, s));
    if (!matched) return undefined;

    const mapboxId = matched.mapbox_id;
    if (!mapboxId) return undefined;

    // Step 2: Retrieve full feature with coordinates
    const retrieveUrl =
      `https://api.mapbox.com/search/searchbox/v1/retrieve/${mapboxId}` +
      `?session_token=${sessionToken}` +
      `&access_token=${token}`;

    const retrieveRes = await fetch(retrieveUrl, {
      headers: { Accept: "application/json" },
    });

    if (!retrieveRes.ok) {
      console.warn("Mapbox Search retrieve failed:", retrieveRes.status);
      return undefined;
    }

    const retrieveData = (await retrieveRes.json()) as SearchBoxRetrieveResponse;
    const feature = retrieveData.features?.[0];
    const coords = feature?.geometry?.coordinates;
    if (!coords || coords.length < 2) return undefined;

    const [lng, lat] = coords;
    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return undefined;
    }

    // Reject results that are clearly not near Purdue / West Lafayette
    const distKm = haversineKm(PURDUE_CENTER_LAT, PURDUE_CENTER_LNG, lat, lng);
    if (distKm > MAX_GEOCODE_DISTANCE_KM) {
      console.warn(
        `Mapbox result for "${trimmed}" too far from campus: ${distKm.toFixed(1)} km`,
        feature?.properties?.full_address
      );
      return undefined;
    }

    return {
      name: feature?.properties?.name ?? trimmed,
      lat,
      lng,
    };
  } catch (error) {
    console.warn("Mapbox Search error:", error);
    return undefined;
  }
}

export interface ResolvedNearPlace {
  place: CampusPlace;
  /** Words after the matched place name, returned to the content query. */
  leftover: string;
}

/** Longest place name we will try to match out of a "near <tail>" phrase. */
const MAX_PLACE_WORDS = 5;

/**
 * Resolve the tail of a "near <tail>" phrase, which may carry trailing
 * non-place words ("near Lawson this week"). Tries the longest prefix first so
 * "Lawson Computer Science Building" wins over "Lawson", then falls back to
 * Mapbox for the longest and shortest candidates only (bounded network calls).
 */
export async function resolveNearPlaceTail(
  tail: string
): Promise<ResolvedNearPlace | undefined> {
  const words = (tail ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return undefined;

  const maxWords = Math.min(MAX_PLACE_WORDS, words.length);

  for (let count = maxWords; count >= 1; count--) {
    const place = resolveCampusPlace(words.slice(0, count).join(" "));
    if (place) {
      return { place, leftover: words.slice(count).join(" ") };
    }
  }

  // Local dictionaries missed — try Mapbox on the longest and single-word forms.
  const candidates = Array.from(
    new Set([words.slice(0, maxWords).join(" "), words[0]])
  );
  for (const candidate of candidates) {
    const place = await resolveCampusPlaceAsync(candidate);
    if (place) {
      const count = candidate.split(/\s+/).length;
      return { place, leftover: words.slice(count).join(" ") };
    }
  }

  return undefined;
}
