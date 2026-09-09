import { RouteScoutResponse, SearchRequest, SearchResponse } from "@/types/search";
import { mockSearch } from "@/lib/mock/sampleResponses";

/**
 * Client-side search API helper
 * Calls POST /api/search
 *
 * Mock mode (frontend dev, backend down): active when the URL has `?mock=1`
 * or `localStorage["boilerscout:mock"] === "1"`. In mock mode the request
 * never leaves the browser — `lib/mock/sampleResponses.ts` answers it.
 */
export function isMockMode(): boolean {
  if (typeof window === "undefined") return false;
  // Never let a bookmarked developer flag replace live results during judging.
  if (process.env.NODE_ENV === "production") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mock") === "1") return true;
    if (params.get("mock") === "0") return false;
    return window.localStorage.getItem("boilerscout:mock") === "1";
  } catch {
    return false;
  }
}

export async function searchEvents(request: SearchRequest): Promise<SearchResponse> {
  if (isMockMode()) {
    return mockSearch(request);
  }

  const res = await fetch("/api/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    throw new Error(await readSearchError(res));
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error("Couldn't load events. Try again.");
  }

  return parseSearchResponse(data);
}

async function readSearchError(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json();
    if (
      body &&
      typeof body === "object" &&
      "error" in body &&
      typeof body.error === "string" &&
      body.error.trim()
    ) {
      return body.error;
    }
  } catch {
    // Non-JSON error pages (HTML) are not useful in the UI.
  }
  return "Couldn't load events. Try again.";
}

function parseSearchResponse(data: unknown): SearchResponse {
  if (!data || typeof data !== "object" || !("events" in data)) {
    throw new Error("Couldn't load events. Try again.");
  }
  const events = (data as SearchResponse).events;
  if (!Array.isArray(events)) {
    throw new Error("Couldn't load events. Try again.");
  }
  const found = (data as SearchResponse).found;
  const tookMs = (data as SearchResponse).tookMs;
  const routeScout = parseRouteScoutResponse((data as SearchResponse).routeScout);
  return {
    events,
    found: typeof found === "number" ? found : events.length,
    tookMs: typeof tookMs === "number" ? tookMs : 0,
    ...(routeScout ? { routeScout } : {}),
  };
}

function parseRouteScoutResponse(value: unknown): RouteScoutResponse | undefined {
  if (!value || typeof value !== "object") return undefined;
  const route = value as Partial<RouteScoutResponse>;
  if (!Array.isArray(route.points) || route.points.length < 2) return undefined;
  if (typeof route.corridorMeters !== "number" || !Number.isFinite(route.corridorMeters)) {
    return undefined;
  }

  const points = route.points.filter(
    (point): point is { lat: number; lng: number } =>
      Boolean(
        point &&
          typeof point.lat === "number" &&
          Number.isFinite(point.lat) &&
          typeof point.lng === "number" &&
          Number.isFinite(point.lng)
      )
  );
  if (points.length < 2) return undefined;

  return {
    points,
    corridorMeters: route.corridorMeters,
    ...(typeof route.originName === "string" ? { originName: route.originName } : {}),
    ...(typeof route.destinationName === "string"
      ? { destinationName: route.destinationName }
      : {}),
  };
}
