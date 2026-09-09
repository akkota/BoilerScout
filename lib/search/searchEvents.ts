import { SearchRequest, SearchResponse } from "@/types/search";
import { Event } from "@/types/event";
import { getTypesenseSearchClient } from "@/lib/typesense/client";
import {
  EVENTS_COLLECTION_NAME,
  TypesenseEventDocument,
} from "@/lib/typesense/schema";
import { mockEvents } from "@/lib/data/mockEvents";
import {
  explainResult,
  SearchHighlight,
  TypesenseHitMeta,
} from "@/lib/search/explainResult";
import {
  buildRouteCorridor,
  isPointInRouteCorridor,
  type RouteCorridor,
} from "@/lib/search/buildRouteCorridor";
import { attachDetourMinutes } from "@/lib/search/attachDetourMinutes";
import { filterCampusEvents } from "@/lib/search/campusScope";
import {
  analyzeQueryTerms,
  buildSearchQueryText,
  expandSemanticIntent,
  eventPassesContentRelevance,
  scoreContentMatch,
  type RelevanceMetadata,
} from "@/lib/search/contentRelevance";
import {
  NORMAL_EVENT_LIMIT,
  prepareSearchRequest,
  ROUTE_EVENT_LIMIT,
} from "@/lib/search/prepareSearchRequest";
import type { SearchParams } from "typesense/lib/Typesense/Documents";

export { type TypesenseHitMeta, type SearchHighlight };

/**
 * Calculates the great-circle distance between two geographic coordinates
 * using the Haversine formula. Returns distance in miles rounded to 1 decimal place.
 */
export function calculateDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8; // Earth radius in miles
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const dist = R * c;
  return Math.round(dist * 10) / 10;
}

/**
 * Maps a Typesense document to the shared Event interface expected by frontend.
 * Computes distanceMiles if center coordinates are provided and generates factual explanations.
 */
export function mapTypesenseDocToEvent(
  doc: TypesenseEventDocument,
  hit?: TypesenseHitMeta,
  query?: string,
  center?: { lat: number; lng: number },
  selectedCategories?: string[]
): Event {
  let locationObj: Event["location"] = undefined;
  let distanceMiles: number | undefined = undefined;

  if (doc.location && Array.isArray(doc.location) && doc.location.length === 2) {
    locationObj = {
      name: doc.location_name || "Campus",
      lat: doc.location[0],
      lng: doc.location[1],
    };

    if (
      center &&
      typeof center.lat === "number" &&
      typeof center.lng === "number"
    ) {
      distanceMiles = calculateDistanceMiles(
        center.lat,
        center.lng,
        doc.location[0],
        doc.location[1]
      );
    }
  } else if (doc.location_name) {
    locationObj = {
      name: doc.location_name,
    };
  }

  const reasons = explainResult({
    doc,
    hit,
    query,
    distanceMiles,
    selectedCategories,
  });

  return {
    id: String(doc.id),
    title: doc.title || "Untitled Event",
    description: doc.description || "",
    organization: doc.organization,
    categories: doc.categories || [],
    startsAt: Number(doc.starts_at),
    endsAt: doc.ends_at ? Number(doc.ends_at) : undefined,
    locationName: doc.location_name,
    location: locationObj,
    imageUrl: doc.image_url,
    url: doc.url,
    source: doc.source || "purdue-events",
    free: doc.free,
    distanceMiles,
    reasons,
  };
}

function hasUsableCoordinates(event: Event): boolean {
  return (
    typeof event.location?.lat === "number" &&
    typeof event.location?.lng === "number" &&
    Number.isFinite(event.location.lat) &&
    Number.isFinite(event.location.lng)
  );
}

interface EventCandidate {
  event: Event;
  relevance?: RelevanceMetadata;
}

/**
 * RouteScout ranking: prefer low detour, then preserve Typesense relevance order.
 */
function rankRouteEvents(events: Event[]): Event[] {
  return [...events].sort((a, b) => {
    const aDetour =
      typeof a.detourMinutes === "number" && Number.isFinite(a.detourMinutes)
        ? a.detourMinutes
        : Number.POSITIVE_INFINITY;
    const bDetour =
      typeof b.detourMinutes === "number" && Number.isFinite(b.detourMinutes)
        ? b.detourMinutes
        : Number.POSITIVE_INFINITY;
    if (aDetour !== bDetour) return aDetour - bDetour;
    return 0;
  });
}

/**
 * Normal discovery ranking.
 * With content intent: strongest topic/category match first, then proximity
 * (when a geo constraint is active), then Typesense order (stable sort).
 * Without a topic query: upcoming first, nearest first when geo is active.
 */
function rankNormalEvents(
  events: Event[],
  contentQuery: string,
  geoActive: boolean
): Event[] {
  const now = Date.now();
  const { hasContentIntent } = analyzeQueryTerms(contentQuery);

  if (hasContentIntent) {
    const scores = new Map(
      events.map((event) => [event.id, scoreContentMatch(event, contentQuery)])
    );
    return [...events].sort((a, b) => {
      const scoreDiff = (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      if (geoActive) {
        const aDist = a.distanceMiles ?? Number.POSITIVE_INFINITY;
        const bDist = b.distanceMiles ?? Number.POSITIVE_INFINITY;
        if (aDist !== bDist) return aDist - bDist;
      }
      return 0;
    });
  }

  if (geoActive) {
    return [...events].sort((a, b) => {
      const aDist = a.distanceMiles ?? Number.POSITIVE_INFINITY;
      const bDist = b.distanceMiles ?? Number.POSITIVE_INFINITY;
      if (aDist !== bDist) return aDist - bDist;
      return a.startsAt - b.startsAt;
    });
  }

  return [...events].sort((a, b) => {
    const aUpcoming = a.startsAt >= now ? 0 : 1;
    const bUpcoming = b.startsAt >= now ? 0 : 1;

    if (aUpcoming !== bUpcoming) return aUpcoming - bUpcoming;
    if (aUpcoming === 0 && a.startsAt !== b.startsAt) {
      return a.startsAt - b.startsAt;
    }
    return 0;
  });
}

interface GeoConstraint {
  center: { lat: number; lng: number };
  radiusMiles: number;
}

function finalizeEvents(
  candidates: EventCandidate[],
  routeCorridor: RouteCorridor | null,
  contentQuery: string,
  limit: number,
  geo: GeoConstraint | null
): Event[] {
  let next = candidates.filter((candidate) =>
    filterCampusEvents([candidate.event]).length === 1
  );

  // Hard geo constraint: an event without coordinates, or outside the radius,
  // can never be returned. Typesense already filters, this is the guarantee.
  if (geo && !routeCorridor) {
    next = next.filter(({ event }) => {
      if (!hasUsableCoordinates(event)) return false;
      const miles = calculateDistanceMiles(
        geo.center.lat,
        geo.center.lng,
        event.location!.lat!,
        event.location!.lng!
      );
      return miles <= geo.radiusMiles;
    });
  }

  if (routeCorridor) {
    // RouteScout: coordinates required; re-check corridor membership.
    next = next.filter(({ event }) => {
      if (!hasUsableCoordinates(event)) return false;
      return isPointInRouteCorridor(
        event.location!.lat!,
        event.location!.lng!,
        routeCorridor
      );
    });
  }

  next = next.filter(({ event, relevance }) =>
    eventPassesContentRelevance(event, contentQuery, relevance)
  );

  const events = next.map(({ event }) => event);

  if (routeCorridor) {
    return rankRouteEvents(events).slice(0, limit);
  } else {
    return rankNormalEvents(events, contentQuery, Boolean(geo)).slice(0, limit);
  }
}

function routeScoutResponse(
  routeCorridor: RouteCorridor | null,
  route: SearchRequest["route"],
  originName?: string,
  destinationName?: string
): SearchResponse["routeScout"] {
  if (!routeCorridor || !route?.points || route.points.length < 2) {
    return undefined;
  }

  const corridorMeters = route.corridorMeters ?? route.bufferMeters;
  if (typeof corridorMeters !== "number" || !Number.isFinite(corridorMeters)) {
    return undefined;
  }

  return {
    points: route.points,
    corridorMeters,
    ...(originName ? { originName } : {}),
    ...(destinationName ? { destinationName } : {}),
  };
}

/**
 * Executes a search query using Typesense hybrid search with:
 * - NL RouteScout intent ("from X to Y") → walking corridor filter
 * - Time filtering (startAfter, startBefore)
 * - Geo filtering (center lat/lng, radiusMiles)
 * - Category / free filters
 * - Campus scope + result limits
 */
export async function searchEvents(request: SearchRequest): Promise<SearchResponse> {
  const startTime = Date.now();
  const prepared = await prepareSearchRequest(request);

  if (prepared.routeError) {
    return {
      events: [],
      found: 0,
      tookMs: Date.now() - startTime,
      routeError: prepared.routeError,
    };
  }

  // An unresolvable "near <place>" is surfaced, never silently ignored.
  if (prepared.locationError) {
    return {
      events: [],
      found: 0,
      tookMs: Date.now() - startTime,
      locationError: prepared.locationError,
    };
  }

  const activeRequest = prepared.request;
  // Strip filler ("events about … or …") so keyword + vector search see topics only.
  const rawQuery = buildSearchQueryText(
    expandSemanticIntent(activeRequest.query?.trim() || "")
  );
  const nearPlace = prepared.nearPlace;
  const routeScoutActive = prepared.routeScoutActive;
  const resultLimit = routeScoutActive ? ROUTE_EVENT_LIMIT : NORMAL_EVENT_LIMIT;

  // Invalid route input yields null and is ignored (other filters still apply)
  const routeCorridor = buildRouteCorridor(activeRequest.route);
  const routeScout = routeScoutResponse(
    routeCorridor,
    activeRequest.route,
    prepared.originName,
    prepared.destinationName
  );

  try {
    const searchClient = getTypesenseSearchClient();

    const filterConditions: string[] = [];

    if (activeRequest.filters?.startAfter !== undefined) {
      filterConditions.push(`starts_at:>=${activeRequest.filters.startAfter}`);
    }
    if (activeRequest.filters?.startBefore !== undefined) {
      filterConditions.push(`starts_at:<=${activeRequest.filters.startBefore}`);
    }

    const hasGeoFilter =
      activeRequest.filters?.center?.lat !== undefined &&
      activeRequest.filters?.center?.lng !== undefined &&
      activeRequest.filters?.radiusMiles !== undefined &&
      activeRequest.filters.radiusMiles > 0;

    const geoConstraint: GeoConstraint | null =
      hasGeoFilter && activeRequest.filters?.center && activeRequest.filters?.radiusMiles
        ? {
            center: activeRequest.filters.center,
            radiusMiles: activeRequest.filters.radiusMiles,
          }
        : null;

    if (routeCorridor) {
      filterConditions.push(routeCorridor.filterBy);
    } else if (
      hasGeoFilter &&
      activeRequest.filters?.center &&
      activeRequest.filters?.radiusMiles
    ) {
      filterConditions.push(
        `location:(${activeRequest.filters.center.lat}, ${activeRequest.filters.center.lng}, ${activeRequest.filters.radiusMiles} mi)`
      );
    }

    if (
      activeRequest.filters?.categories &&
      activeRequest.filters.categories.length > 0
    ) {
      const escapedCategories = activeRequest.filters.categories
        .map((cat) => `\`${cat.replace(/`/g, "")}\``)
        .join(",");
      filterConditions.push(`categories:[${escapedCategories}]`);
    }

    if (activeRequest.filters?.freeOnly) {
      filterConditions.push("free:=true");
    }

    const filterBy =
      filterConditions.length > 0 ? filterConditions.join(" && ") : undefined;

    // Fetch a candidate pool, then rank + slice to the UI limit. A hard geo /
    // corridor filter already bounds the set, so pull deeper there: the topic
    // gate would otherwise starve on the first 30 hybrid hits.
    const candidatePages =
      geoConstraint || routeCorridor
        ? 100
        : Math.min(30, Math.max(resultLimit * 3, 20));

    let searchParams: SearchParams<TypesenseEventDocument>;

    if (rawQuery.length === 0) {
      // Browse / pure RouteScout: do not run semantic search on the full NL sentence.
      let sortBy = "starts_at:asc";
      if (hasGeoFilter && activeRequest.filters?.center && !routeCorridor) {
        sortBy = `location(${activeRequest.filters.center.lat}, ${activeRequest.filters.center.lng}):asc,starts_at:asc`;
      }

      searchParams = {
        q: "*",
        query_by: "title,description",
        sort_by: sortBy,
        per_page: candidatePages,
        ...(filterBy ? { filter_by: filterBy } : {}),
      };
    } else {
      searchParams = {
        q: rawQuery,
        query_by: "title,description,organization,categories,embedding",
        num_typos: 2,
        drop_tokens_threshold: 0,
        per_page: candidatePages,
        ...(filterBy ? { filter_by: filterBy } : {}),
      };
    }

    const result = await searchClient
      .collections<TypesenseEventDocument>(EVENTS_COLLECTION_NAME)
      .documents()
      .search(searchParams);

    const hits = result.hits || [];
    let candidates: EventCandidate[] = hits.map((hit) => {
      const relevance = {
        textMatch: hit.text_match,
        vectorDistance: (hit as { vector_distance?: number }).vector_distance,
      };
      return {
        event: mapTypesenseDocToEvent(
          hit.document,
          {
          highlights: hit.highlights as SearchHighlight[] | undefined,
            text_match: relevance.textMatch,
            vector_distance: relevance.vectorDistance,
          },
          rawQuery,
          activeRequest.filters?.center,
          activeRequest.filters?.categories
        ),
        relevance,
      };
    });

    if (routeCorridor && activeRequest.route) {
      const detoured = await attachDetourMinutes(
        candidates.map(({ event }) => event),
        activeRequest.route
      );
      candidates = candidates.map((candidate, index) => ({
        ...candidate,
        event: detoured[index] ?? candidate.event,
      }));
    }

    const limited = finalizeEvents(
      candidates,
      routeCorridor,
      rawQuery,
      resultLimit,
      geoConstraint
    );
    const tookMs = Date.now() - startTime;

    return {
      events: limited,
      found: limited.length,
      tookMs,
      ...(routeScout ? { routeScout } : {}),
      ...(nearPlace ? { nearPlace } : {}),
    };
  } catch (error) {
    console.error("Typesense search error, falling back to cached events:", error);

    let fallback = [...mockEvents];

    if (activeRequest.filters?.startAfter !== undefined) {
      const startAfter = activeRequest.filters.startAfter;
      fallback = fallback.filter((evt) => evt.startsAt >= startAfter);
    }
    if (activeRequest.filters?.startBefore !== undefined) {
      const startBefore = activeRequest.filters.startBefore;
      fallback = fallback.filter((evt) => evt.startsAt <= startBefore);
    }

    if (
      activeRequest.filters?.categories &&
      activeRequest.filters.categories.length > 0
    ) {
      const filterCategories = activeRequest.filters.categories.map((c) =>
        c.toLowerCase()
      );
      fallback = fallback.filter((evt) =>
        evt.categories.some((c) => filterCategories.includes(c.toLowerCase()))
      );
    }

    if (activeRequest.filters?.freeOnly) {
      fallback = fallback.filter((evt) => evt.free === true);
    }

    const center = activeRequest.filters?.center;
    const radiusMiles = activeRequest.filters?.radiusMiles;
    if (routeCorridor) {
      fallback = fallback.filter((evt) => {
        if (!hasUsableCoordinates(evt)) return false;
        return isPointInRouteCorridor(
          evt.location!.lat!,
          evt.location!.lng!,
          routeCorridor
        );
      });
    } else if (
      center &&
      typeof center.lat === "number" &&
      typeof center.lng === "number" &&
      radiusMiles !== undefined &&
      radiusMiles > 0
    ) {
      fallback = fallback.filter((evt) => {
        if (!evt.location?.lat || !evt.location?.lng) return false;
        const dist = calculateDistanceMiles(
          center.lat,
          center.lng,
          evt.location.lat,
          evt.location.lng
        );
        return dist <= radiusMiles;
      });
    }

    if (center && typeof center.lat === "number" && typeof center.lng === "number") {
      fallback = fallback.map((evt) => {
        if (evt.location?.lat && evt.location?.lng) {
          const dist = calculateDistanceMiles(
            center.lat,
            center.lng,
            evt.location.lat,
            evt.location.lng
          );
          return { ...evt, distanceMiles: dist };
        }
        return evt;
      });
    }

    if (routeCorridor && activeRequest.route) {
      fallback = await attachDetourMinutes(fallback, activeRequest.route);
    }

    const limited = finalizeEvents(
      fallback.map((event) => ({ event })),
      routeCorridor,
      rawQuery,
      resultLimit,
      center &&
      typeof center.lat === "number" &&
      typeof center.lng === "number" &&
      radiusMiles !== undefined &&
      radiusMiles > 0
        ? { center, radiusMiles }
        : null
    );
    const tookMs = Date.now() - startTime;

    return {
      events: limited,
      found: limited.length,
      tookMs,
      ...(routeScout ? { routeScout } : {}),
      ...(nearPlace ? { nearPlace } : {}),
    };
  }
}
