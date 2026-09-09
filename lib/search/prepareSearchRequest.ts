import { fetchWalkingRoutePoints } from "@/lib/mapbox/fetchWalkingRoute";
import { NEAR_RADIUS_MILES, parseNearIntent } from "@/lib/search/parseNearIntent";
import { parseRouteIntent } from "@/lib/search/parseRouteIntent";
import { parseTimeWords } from "@/lib/search/parseTimeWords";
import {
  resolveCampusPlaceAsync,
  resolveNearPlaceTail,
} from "@/lib/search/resolveCampusPlace";
import type {
  NearPlace,
  RouteOptions,
  SearchFilters,
  SearchRequest,
} from "@/types/search";

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
  /** Set when route intent was detected but places couldn't be resolved. */
  routeError?: string;
  /** Resolved NL "near <place>" constraint, applied as a hard geo filter. */
  nearPlace?: NearPlace;
  /** Set when "near <place>" was detected but the place couldn't be resolved. */
  locationError?: string;
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
 * If NL parse detects a route but cannot resolve places, returns routeError
 * instead of silently falling back to normal search.
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
    const timedFilters = mergeTimeFilters(
      input.filters,
      timed.startAfter,
      timed.startBefore
    );

    const near = parseNearIntent(timed.contentQuery);
    if (!near.isNearQuery || !near.placeTail) {
      return {
        request: { ...input, query: timed.contentQuery, filters: timedFilters },
        routeScoutActive: false,
      };
    }

    const resolved = await resolveNearPlaceTail(near.placeTail);
    if (!resolved) {
      // Never silently drop an explicit location constraint.
      console.warn('Near-place unresolved:', near.placeTail);
      return {
        request: { ...input, query: "", filters: timedFilters },
        routeScoutActive: false,
        locationError: `Could not find "${near.placeTail}" on or near campus. Try a building name like "Lawson" or "Purdue Memorial Union".`,
      };
    }

    // Explicit "near <place>" text wins over the UI center; the UI radius,
    // when the user set one, still controls how wide the circle is.
    const radiusMiles =
      input.filters?.radiusMiles !== undefined && input.filters.radiusMiles > 0
        ? input.filters.radiusMiles
        : NEAR_RADIUS_MILES;

    const contentQuery = [near.contentQuery, resolved.leftover]
      .filter((part) => part.trim().length > 0)
      .join(" ")
      .trim();

    return {
      request: {
        ...input,
        query: contentQuery,
        filters: {
          ...(timedFilters ?? {}),
          center: { lat: resolved.place.lat, lng: resolved.place.lng },
          radiusMiles,
        },
      },
      routeScoutActive: false,
      nearPlace: {
        name: resolved.place.name,
        lat: resolved.place.lat,
        lng: resolved.place.lng,
        radiusMiles,
      },
    };
  }

  // Try local dictionaries first (sync), then Mapbox geocoding (async)
  const [origin, destination] = await Promise.all([
    resolveCampusPlaceAsync(parsed.originName),
    resolveCampusPlaceAsync(parsed.destinationName),
  ]);

  if (!origin || !destination) {
    const unresolved: string[] = [];
    if (!origin) unresolved.push(`"${parsed.originName}"`);
    if (!destination) unresolved.push(`"${parsed.destinationName}"`);

    console.warn(
      "RouteScout places unresolved:",
      parsed.originName,
      "→",
      parsed.destinationName
    );

    return {
      request: {
        ...input,
        query: "",
      },
      routeScoutActive: false,
      routeError: `Could not find ${unresolved.join(" or ")}. Try a more specific location name.`,
    };
  }

  const points = await fetchWalkingRoutePoints(
    { lat: origin.lat, lng: origin.lng },
    { lat: destination.lat, lng: destination.lng }
  );

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
