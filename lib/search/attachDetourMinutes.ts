import type { Event } from "@/types/event";
import type { RouteOptions } from "@/types/search";

const MAX_DETOUR_EVENTS = 12;
const MATRIX_BASE_URL =
  "https://api.mapbox.com/directions-matrix/v1/mapbox/walking";

type LatLng = { lat: number; lng: number };

interface MatrixResponse {
  code?: string;
  durations?: (number | null)[][];
  message?: string;
}

function isFiniteCoord(lat?: number, lng?: number): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  );
}

function routeEndpoints(route: RouteOptions): {
  origin: LatLng;
  destination: LatLng;
} | null {
  const points = route.points;
  if (!Array.isArray(points) || points.length < 2) return null;

  const origin = points[0];
  const destination = points[points.length - 1];
  if (
    !isFiniteCoord(origin?.lat, origin?.lng) ||
    !isFiniteCoord(destination?.lat, destination?.lng)
  ) {
    return null;
  }

  return {
    origin: { lat: origin.lat, lng: origin.lng },
    destination: { lat: destination.lat, lng: destination.lng },
  };
}

function toMapboxCoord({ lat, lng }: LatLng): string {
  return `${lng},${lat}`;
}

function durationSeconds(
  matrix: (number | null)[][],
  from: number,
  to: number
): number | null {
  const value = matrix[from]?.[to];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return value;
}

/**
 * Attach walking detourMinutes to top RouteScout results using one
 * Mapbox Matrix API call.
 *
 * detourSeconds = origin→event + event→destination − origin→destination
 * Failures leave detourMinutes undefined and never throw.
 */
export async function attachDetourMinutes(
  events: Event[],
  route: RouteOptions
): Promise<Event[]> {
  const token = process.env.MAPBOX_ACCESS_TOKEN?.trim();
  if (!token) {
    return events;
  }

  const endpoints = routeEndpoints(route);
  if (!endpoints) {
    return events;
  }

  const candidates: { index: number; lat: number; lng: number }[] = [];
  for (let i = 0; i < events.length && candidates.length < MAX_DETOUR_EVENTS; i++) {
    const lat = events[i].location?.lat;
    const lng = events[i].location?.lng;
    if (!isFiniteCoord(lat, lng)) continue;
    candidates.push({ index: i, lat: lat as number, lng: lng as number });
  }

  if (candidates.length === 0) {
    return events;
  }

  // Matrix indices: 0 = origin, 1 = destination, 2.. = event candidates
  const coordinates = [
    toMapboxCoord(endpoints.origin),
    toMapboxCoord(endpoints.destination),
    ...candidates.map((c) => toMapboxCoord({ lat: c.lat, lng: c.lng })),
  ].join(";");

  const url = new URL(`${MATRIX_BASE_URL}/${coordinates}`);
  url.searchParams.set("annotations", "duration");
  url.searchParams.set("access_token", token);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      console.error(
        "Mapbox Matrix detour request failed:",
        response.status,
        response.statusText
      );
      return events;
    }

    const data = (await response.json()) as MatrixResponse;
    if (data.code !== "Ok" || !Array.isArray(data.durations)) {
      console.error(
        "Mapbox Matrix detour response invalid:",
        data.code || data.message || "missing durations"
      );
      return events;
    }

    const durations = data.durations;
    const originToDest = durationSeconds(durations, 0, 1);
    if (originToDest === null) {
      console.error("Mapbox Matrix missing origin→destination duration");
      return events;
    }

    const enriched = events.map((event) => ({ ...event }));

    for (let i = 0; i < candidates.length; i++) {
      const eventIndex = candidates[i].index;
      const matrixIndex = 2 + i;
      const originToEvent = durationSeconds(durations, 0, matrixIndex);
      const eventToDest = durationSeconds(durations, matrixIndex, 1);
      if (originToEvent === null || eventToDest === null) {
        continue;
      }

      const detourSeconds = Math.max(
        0,
        originToEvent + eventToDest - originToDest
      );
      enriched[eventIndex] = {
        ...enriched[eventIndex],
        detourMinutes: Math.round(detourSeconds / 60),
      };
    }

    return enriched;
  } catch (error) {
    console.error("Mapbox Matrix detour enrichment failed:", error);
    return events;
  }
}
