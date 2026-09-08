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

/**
 * Executes a search query using Typesense hybrid search with:
 * - Time filtering (startAfter, startBefore)
 * - Geo filtering (center lat/lng, radiusMiles)
 * - Category filtering
 * - Free events filtering
 * - Factual "Why this result?" explanations
 * - Distance calculation in miles
 * Falls back gracefully to mock events if Typesense Cloud is unavailable.
 */
export async function searchEvents(request: SearchRequest): Promise<SearchResponse> {
  const startTime = Date.now();
  const rawQuery = request.query?.trim() || "";

  try {
    const searchClient = getTypesenseSearchClient();

    // 1. Build Typesense filter_by string
    const filterConditions: string[] = [];

    // Time filtering: starts_at >= startAfter
    if (request.filters?.startAfter !== undefined) {
      filterConditions.push(`starts_at:>=${request.filters.startAfter}`);
    }

    // Time filtering: starts_at <= startBefore
    if (request.filters?.startBefore !== undefined) {
      filterConditions.push(`starts_at:<=${request.filters.startBefore}`);
    }

    // Geo filtering: location:(lat, lng, radius mi)
    // Only applied if all three parameters (lat, lng, radiusMiles > 0) are provided
    const hasGeoFilter =
      request.filters?.center?.lat !== undefined &&
      request.filters?.center?.lng !== undefined &&
      request.filters?.radiusMiles !== undefined &&
      request.filters.radiusMiles > 0;

    if (
      hasGeoFilter &&
      request.filters?.center &&
      request.filters?.radiusMiles
    ) {
      filterConditions.push(
        `location:(${request.filters.center.lat}, ${request.filters.center.lng}, ${request.filters.radiusMiles} mi)`
      );
    }

    // Category filtering
    if (request.filters?.categories && request.filters.categories.length > 0) {
      const escapedCategories = request.filters.categories
        .map((cat) => `\`${cat.replace(/`/g, "")}\``)
        .join(",");
      filterConditions.push(`categories:[${escapedCategories}]`);
    }

    // Free events filtering
    if (request.filters?.freeOnly) {
      filterConditions.push("free:=true");
    }

    const filterBy = filterConditions.length > 0 ? filterConditions.join(" && ") : undefined;

    // 2. Configure search parameters
    let searchParams: SearchParams<TypesenseEventDocument>;

    if (rawQuery.length === 0) {
      // Browse / empty query: Return events sorted by distance if geo center provided, or by starts_at
      let sortBy = "starts_at:asc";
      if (hasGeoFilter && request.filters?.center) {
        sortBy = `location(${request.filters.center.lat}, ${request.filters.center.lng}):asc,starts_at:asc`;
      }

      searchParams = {
        q: "*",
        query_by: "title,description",
        sort_by: sortBy,
        per_page: 50,
        ...(filterBy ? { filter_by: filterBy } : {}),
      };
    } else {
      // Hybrid Keyword + Semantic Search
      searchParams = {
        q: rawQuery,
        query_by: "title,description,organization,categories,embedding",
        num_typos: 2,
        drop_tokens_threshold: 0,
        per_page: 50,
        ...(filterBy ? { filter_by: filterBy } : {}),
      };
    }

    // 3. Execute search against Typesense Cloud
    const result = await searchClient
      .collections<TypesenseEventDocument>(EVENTS_COLLECTION_NAME)
      .documents()
      .search(searchParams);

    const hits = result.hits || [];
    const events: Event[] = hits.map((hit) =>
      mapTypesenseDocToEvent(
        hit.document,
        {
          highlights: hit.highlights as SearchHighlight[] | undefined,
          text_match: hit.text_match,
          vector_distance: (hit as { vector_distance?: number }).vector_distance,
        },
        rawQuery,
        request.filters?.center,
        request.filters?.categories
      )
    );

    const tookMs = Date.now() - startTime;

    return {
      events,
      found: result.found ?? events.length,
      tookMs,
    };
  } catch (error) {
    console.error("Typesense search error, falling back to cached events:", error);

    // Reliable fallback for demo resiliency
    let fallback = [...mockEvents];

    // Query text match
    if (rawQuery) {
      const q = rawQuery.toLowerCase();
      fallback = fallback.filter((evt) => {
        const matchTitle = evt.title.toLowerCase().includes(q);
        const matchDesc = evt.description.toLowerCase().includes(q);
        const matchOrg = evt.organization?.toLowerCase().includes(q) ?? false;
        const matchLoc = evt.location?.name?.toLowerCase().includes(q) ?? false;
        const matchCategory = evt.categories.some((cat) => cat.toLowerCase().includes(q));
        return matchTitle || matchDesc || matchOrg || matchLoc || matchCategory;
      });
    }

    // Time filters
    if (request.filters?.startAfter !== undefined) {
      const startAfter = request.filters.startAfter;
      fallback = fallback.filter((evt) => evt.startsAt >= startAfter);
    }
    if (request.filters?.startBefore !== undefined) {
      const startBefore = request.filters.startBefore;
      fallback = fallback.filter((evt) => evt.startsAt <= startBefore);
    }

    // Category filter
    if (request.filters?.categories && request.filters.categories.length > 0) {
      const filterCategories = request.filters.categories.map((c) => c.toLowerCase());
      fallback = fallback.filter((evt) =>
        evt.categories.some((c) => filterCategories.includes(c.toLowerCase()))
      );
    }

    // Free filter
    if (request.filters?.freeOnly) {
      fallback = fallback.filter((evt) => evt.free === true);
    }

    // Geo filter
    const center = request.filters?.center;
    const radiusMiles = request.filters?.radiusMiles;
    if (
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

    // Compute distanceMiles on fallback if center is available
    if (center && typeof center.lat === "number" && typeof center.lng === "number") {
      fallback = fallback.map((evt) => {
        if (evt.location?.lat && evt.location?.lng) {
          const dist = calculateDistanceMiles(
            center.lat,
            center.lng,
            evt.location.lat,
            evt.location.lng
          );
          return {
            ...evt,
            distanceMiles: dist,
          };
        }
        return evt;
      });
    }

    const tookMs = Date.now() - startTime;

    return {
      events: fallback,
      found: fallback.length,
      tookMs,
    };
  }
}

