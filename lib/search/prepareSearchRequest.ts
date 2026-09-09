import { fetchWalkingRoutePoints } from "@/lib/mapbox/fetchWalkingRoute";
import { parseRouteIntent } from "@/lib/search/parseRouteIntent";
import { parseTimeWords } from "@/lib/search/parseTimeWords";
import { resolveCampusPlace } from "@/lib/search/resolveCampusPlace";
import type { RouteOptions, SearchFilters, SearchRequest } from "@/types/search";

/** Default corridor width for campus walking RouteScout. */
export const DEFAULT_CORRIDOR_METERS = 220;

export const NORMAL_EVENT_LIMIT = 10;
export const ROUTE_EVENT_LIMIT = 10;

export interface PreparedSearchRequest {
  request: SearchRequest;
  /** True when NL route intent was resolved into route.points. */
  routeScoutActive: boolean;
  originName?: string;
  destinationName?: string;
}

function mergeTimeFilters(
  existing: SearchFilters | undefined,
  startAfter?: number,
  startBefore?: number
): SearchFilters | undefined {
  const clientHasTime =
    existing?.startAfter !== undefined || existing?.startBefore !== undefined;

  // UI time presets win over NL time words.
  if (clientHasTime || (startAfter === undefined && startBefore === undefined)) {
    return existing;
  }

  return {
    ...(existing ?? {}),
    ...(startAfter !== undefined ? { startAfter } : {}),
    ...(startBefore !== undefined ? { startBefore } : {}),
  };
}

/**
 * Expand a SearchRequest: detect "from X to Y" RouteScout intent,
 * resolve campus places, fetch walking geometry, apply tonight/today
 * windows, and strip route/time phrasing out of the Typesense query text.
 *
 * If the client already sent `route.points`, that wins and NL route parse is skipped.
 * If NL parse fails to resolve places, falls back to a normal (non-route) search.
 */
export async function prepareSearchRequest(
  input: SearchRequest
): Promise<PreparedSearchRequest> {
  const existingRoute = input.route;
  const hasClientRoute =
    Array.isArray(existingRoute?.points) && existingRoute.points.length >= 2;

  if (hasClientRoute) {
    const route: RouteOptions = {
      ...existingRoute!,
      corridorMeters:
        existingRoute!.corridorMeters ??
        existingRoute!.bufferMeters ??
        DEFAULT_CORRIDOR_METERS,
    };

    const timed = parseTimeWords(input.query ?? "");
    return {
      request: {
        ...input,
        query: timed.contentQuery,
        route,
        filters: mergeTimeFilters(
          input.filters,
          timed.startAfter,
          timed.startBefore
        ),
      },
      routeScoutActive: true,
    };
  }

  const parsed = parseRouteIntent(input.query ?? "");
  if (!parsed.isRouteQuery || !parsed.originName || !parsed.destinationName) {
    const timed = parseTimeWords(input.query ?? "");
    return {
      request: {
        ...input,
        query: timed.contentQuery,
        filters: mergeTimeFilters(
          input.filters,
          timed.startAfter,
          timed.startBefore
        ),
      },
      routeScoutActive: false,
    };
  }

  const origin = resolveCampusPlace(parsed.originName);
  const destination = resolveCampusPlace(parsed.destinationName);
  if (!origin || !destination) {
    console.warn(
      "RouteScout places unresolved:",
      parsed.originName,
      "→",
      parsed.destinationName
    );
    const timed = parseTimeWords(input.query ?? "");
    return {
      request: {
        ...input,
        query: timed.contentQuery,
        filters: mergeTimeFilters(
          input.filters,
          timed.startAfter,
          timed.startBefore
        ),
      },
      routeScoutActive: false,
    };
  }

  const points = await fetchWalkingRoutePoints(
    { lat: origin.lat, lng: origin.lng },
    { lat: destination.lat, lng: destination.lng }
  );

  // Time words may appear before the route clause ("AI tonight while walking…").
  // A pure RouteScout request intentionally has no content query. Do not put
  // the full natural-language route sentence back into Typesense: the empty
  // query below becomes browse-style `q: "*"` constrained by the corridor.
  const timed = parseTimeWords(parsed.contentQuery.trim());

  return {
    request: {
      ...input,
      query: timed.contentQuery,
      filters: mergeTimeFilters(
        input.filters,
        timed.startAfter,
        timed.startBefore
      ),
      route: {
        points,
        corridorMeters: DEFAULT_CORRIDOR_METERS,
      },
    },
    routeScoutActive: true,
    originName: origin.name,
    destinationName: destination.name,
  };
}
