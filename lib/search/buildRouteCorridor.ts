import buffer from "@turf/buffer";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { lineString, point } from "@turf/helpers";
import simplify from "@turf/simplify";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import type { RouteOptions } from "@/types/search";

export type LatLng = { lat: number; lng: number };

export interface RouteCorridor {
  /** Typesense filter_by fragment, e.g. location:(lat1, lng1, lat2, lng2, ...) */
  filterBy: string;
  /** Exterior ring as [lat, lng] pairs (Typesense order) */
  polygonLatLng: [number, number][];
  /** GeoJSON polygon for fallback point-in-polygon checks */
  geojson: Feature<Polygon | MultiPolygon>;
}

const MAX_CORRIDOR_METERS = 2000;
/** ~5m simplification tolerance to keep Typesense filter strings compact */
const SIMPLIFY_TOLERANCE = 0.00005;

function isValidCoord(p: { lat?: unknown; lng?: unknown }): p is LatLng {
  return (
    typeof p?.lat === "number" &&
    typeof p?.lng === "number" &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    p.lat >= -90 &&
    p.lat <= 90 &&
    p.lng >= -180 &&
    p.lng <= 180
  );
}

function extractExteriorRing(
  geometry: Polygon | MultiPolygon
): number[][] | null {
  if (geometry.type === "Polygon") {
    return geometry.coordinates[0] ?? null;
  }

  // MultiPolygon: pick the ring with the most vertices (main corridor body)
  let best: number[][] | null = null;
  for (const polygon of geometry.coordinates) {
    const ring = polygon[0];
    if (!ring) continue;
    if (!best || ring.length > best.length) {
      best = ring;
    }
  }
  return best;
}

/**
 * Convert a walking route into a buffered corridor polygon for Typesense
 * geo-polygon filtering.
 *
 * Coordinate order:
 * - Input points: { lat, lng }
 * - GeoJSON / Turf: [lng, lat]
 * - Typesense filter / polygonLatLng: [lat, lng]
 *
 * Returns null for invalid/unsafe input (never throws).
 */
export function buildRouteCorridor(
  route: RouteOptions | undefined | null
): RouteCorridor | null {
  if (!route) return null;

  if (!Array.isArray(route.points) || route.points.length < 2) {
    return null;
  }

  if (
    typeof route.corridorMeters !== "number" ||
    !Number.isFinite(route.corridorMeters) ||
    route.corridorMeters <= 0
  ) {
    return null;
  }

  const corridorMeters = Math.min(route.corridorMeters, MAX_CORRIDOR_METERS);

  const validPoints = route.points.filter(isValidCoord);
  if (validPoints.length < 2) return null;

  // Drop consecutive duplicate vertices (invalid LineString for Turf)
  const deduped: LatLng[] = [];
  for (const p of validPoints) {
    const last = deduped[deduped.length - 1];
    if (!last || last.lat !== p.lat || last.lng !== p.lng) {
      deduped.push(p);
    }
  }
  if (deduped.length < 2) return null;

  try {
    // GeoJSON LineString coordinates are [lng, lat]
    const line = lineString(
      deduped.map((p) => [p.lng, p.lat] as [number, number])
    );

    const buffered = buffer(line, corridorMeters, { units: "meters" });
    if (!buffered?.geometry) return null;

    const simplified = simplify(buffered, {
      tolerance: SIMPLIFY_TOLERANCE,
      highQuality: true,
      mutate: false,
    }) as Feature<Polygon | MultiPolygon>;

    if (
      simplified.geometry.type !== "Polygon" &&
      simplified.geometry.type !== "MultiPolygon"
    ) {
      return null;
    }

    const ring = extractExteriorRing(simplified.geometry);
    if (!ring || ring.length < 4) return null;

    // Turf closes the ring (first == last); Typesense examples omit the duplicate
    const openRing =
      ring.length > 1 &&
      ring[0][0] === ring[ring.length - 1][0] &&
      ring[0][1] === ring[ring.length - 1][1]
        ? ring.slice(0, -1)
        : ring;

    if (openRing.length < 3) return null;

    // Convert GeoJSON [lng, lat] → Typesense [lat, lng]
    const polygonLatLng: [number, number][] = openRing.map(([lng, lat]) => [
      lat,
      lng,
    ]);

    const flat = polygonLatLng
      .map(([lat, lng]) => `${lat}, ${lng}`)
      .join(", ");

    return {
      filterBy: `location:(${flat})`,
      polygonLatLng,
      geojson: simplified,
    };
  } catch (error) {
    console.warn("buildRouteCorridor failed:", error);
    return null;
  }
}

/** Point-in-polygon check for mock/fallback filtering (GeoJSON [lng, lat]). */
export function isPointInRouteCorridor(
  lat: number,
  lng: number,
  corridor: RouteCorridor
): boolean {
  try {
    return booleanPointInPolygon(point([lng, lat]), corridor.geojson);
  } catch {
    return false;
  }
}
