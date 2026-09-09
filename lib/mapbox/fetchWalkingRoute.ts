type LatLng = { lat: number; lng: number };

interface DirectionsResponse {
  code?: string;
  routes?: Array<{
    geometry?: {
      coordinates?: number[][];
    };
  }>;
  message?: string;
}

const DIRECTIONS_BASE =
  "https://api.mapbox.com/directions/v5/mapbox/walking";

/** Cap vertices so Typesense polygon filters stay small. */
const MAX_ROUTE_POINTS = 80;

function downsample(points: LatLng[], maxPoints: number): LatLng[] {
  if (points.length <= maxPoints) return points;
  const out: LatLng[] = [];
  const last = points.length - 1;
  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.round((i * last) / (maxPoints - 1));
    out.push(points[idx]);
  }
  return out;
}

/**
 * Fetch a walking route polyline from Mapbox Directions.
 * On failure, returns a straight line between origin and destination
 * so RouteScout corridor search can still run.
 */
export async function fetchWalkingRoutePoints(
  origin: LatLng,
  destination: LatLng
): Promise<LatLng[]> {
  const fallback = [origin, destination];
  const token = process.env.MAPBOX_ACCESS_TOKEN?.trim();
  if (!token) {
    console.warn("MAPBOX_ACCESS_TOKEN missing; using straight-line RouteScout path");
    return fallback;
  }

  const path = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const url = new URL(`${DIRECTIONS_BASE}/${path}`);
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("overview", "full");
  url.searchParams.set("access_token", token);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      console.error(
        "Mapbox Directions failed:",
        response.status,
        response.statusText
      );
      return fallback;
    }

    const data = (await response.json()) as DirectionsResponse;
    if (data.code !== "Ok") {
      console.error(
        "Mapbox Directions invalid:",
        data.code || data.message || "unknown"
      );
      return fallback;
    }

    const coords = data.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) {
      return fallback;
    }

    const points: LatLng[] = [];
    for (const pair of coords) {
      if (!Array.isArray(pair) || pair.length < 2) continue;
      const lng = pair[0];
      const lat = pair[1];
      if (
        typeof lat !== "number" ||
        typeof lng !== "number" ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lng)
      ) {
        continue;
      }
      points.push({ lat, lng });
    }

    if (points.length < 2) return fallback;
    return downsample(points, MAX_ROUTE_POINTS);
  } catch (error) {
    console.error("Mapbox Directions request error:", error);
    return fallback;
  }
}
