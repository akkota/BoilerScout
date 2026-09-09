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
