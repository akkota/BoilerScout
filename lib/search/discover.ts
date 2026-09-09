import { mockEvents } from "@/lib/data/mockEvents";
import { filterCampusEvents } from "@/lib/search/campusScope";
import { mapTypesenseDocToEvent } from "@/lib/search/searchEvents";
import { getTypesenseSearchClient } from "@/lib/typesense/client";
import {
  EVENTS_COLLECTION_NAME,
  TypesenseEventDocument,
} from "@/lib/typesense/schema";
import {
  DiscoverEvent,
  DiscoverGroup,
  DiscoverOrganization,
  DiscoverRequest,
  DiscoverResponse,
  DiscoverVenue,
} from "@/types/discover";

const ORGANIZATIONS_COLLECTION_NAME = "organizations";
const VENUES_COLLECTION_NAME = "venues";
const DEFAULT_LIMIT_PER_TYPE = 5;
const MAX_LIMIT_PER_TYPE = 10;

type RecordValue = Record<string, unknown>;

interface MultiSearchResult {
  found?: unknown;
  hits?: unknown;
  code?: unknown;
  error?: unknown;
}

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringArrayValue(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function hitDocument(hit: unknown): RecordValue | undefined {
  if (!isRecord(hit) || !isRecord(hit.document)) {
    return undefined;
  }

  return hit.document;
}

function hasSearchError(result: MultiSearchResult | undefined): boolean {
  if (!result) {
    return true;
  }

  return (
    typeof result.error === "string" ||
    (typeof result.code === "number" && result.code >= 400)
  );
}

function resultHits(result: MultiSearchResult): unknown[] {
  return Array.isArray(result.hits) ? result.hits : [];
}

function createUnavailableGroup<T>(): DiscoverGroup<T> {
  return { items: [], found: 0, status: "unavailable" };
}

function normalizeGroup<T>(
  result: MultiSearchResult | undefined,
  normalize: (document: RecordValue, hit: RecordValue) => T | undefined
): DiscoverGroup<T> {
  if (!result || hasSearchError(result)) {
    return createUnavailableGroup<T>();
  }

  const items = resultHits(result).flatMap((hit) => {
    const document = hitDocument(hit);
    if (!document || !isRecord(hit)) {
      return [];
    }

    const item = normalize(document, hit);
    return item ? [item] : [];
  });

  return {
    items,
    found: numberValue(result?.found) ?? items.length,
    status: "ok",
  };
}

function searchReasons(
  name: string,
  categories: string[],
  query: string,
  hit: RecordValue,
  fallback: string
): string[] {
  const reasons: string[] = [];
  const normalizedQuery = query.toLowerCase();
  const highlights = Array.isArray(hit.highlights) ? hit.highlights : [];
  const hasHighlight = highlights.some(
    (highlight) => isRecord(highlight) && typeof highlight.field === "string"
  );

  if (name.toLowerCase().includes(normalizedQuery) || hasHighlight) {
    reasons.push("Strong search match");
  }

  const matchingCategory = categories.find(
    (category) =>
      category.toLowerCase().includes(normalizedQuery) ||
      normalizedQuery.includes(category.toLowerCase())
  );
  if (matchingCategory) {
    reasons.push(`Matches ${matchingCategory}`);
  }

  const vectorDistance = numberValue(hit.vector_distance);
  if (vectorDistance !== undefined && vectorDistance < 0.68) {
    reasons.push("Semantic match");
  }

  if (reasons.length === 0) {
    reasons.push(fallback);
  }

  return Array.from(new Set(reasons)).slice(0, 3);
}

function normalizeEvent(
  document: RecordValue,
  hit: RecordValue,
  query: string
): DiscoverEvent | undefined {
  if (
    !stringValue(document.id) ||
    !stringValue(document.title) ||
    numberValue(document.starts_at) === undefined
  ) {
    return undefined;
  }

  const event = mapTypesenseDocToEvent(
    document as unknown as TypesenseEventDocument,
    {
      highlights: Array.isArray(hit.highlights)
        ? (hit.highlights as Array<{ field?: string; snippet?: string; matched_tokens?: string[] }>)
        : undefined,
      text_match: numberValue(hit.text_match),
      vector_distance: numberValue(hit.vector_distance),
    },
    query
  );

  return { ...event, type: "event" };
}

function normalizeOrganization(
  document: RecordValue,
  hit: RecordValue,
  query: string
): DiscoverOrganization | undefined {
  const id = stringValue(document.id);
  const name = stringValue(document.name);
  if (!id || !name) {
    return undefined;
  }

  const categories = stringArrayValue(document.categories);
  return {
    type: "organization",
    id,
    name,
    description: stringValue(document.description) ?? "",
    categories,
    url: stringValue(document.url),
    imageUrl: stringValue(document.photo_url),
    reasons: searchReasons(name, categories, query, hit, "Campus organization match"),
  };
}

function normalizeVenue(
  document: RecordValue,
  hit: RecordValue,
  query: string
): DiscoverVenue | undefined {
  const id = stringValue(document.id);
  const name = stringValue(document.name);
  if (!id || !name) {
    return undefined;
  }

  const location = Array.isArray(document.location)
    ? {
        lat: numberValue(document.location[0]),
        lng: numberValue(document.location[1]),
      }
    : undefined;
  const validLocation =
    location?.lat !== undefined && location.lng !== undefined
      ? { lat: location.lat, lng: location.lng }
      : undefined;

  return {
    type: "venue",
    id,
    name,
    description: stringValue(document.description) ?? "",
    address: stringValue(document.address),
    location: validLocation,
    url: stringValue(document.url),
    imageUrl: stringValue(document.photo_url),
    reasons: searchReasons(name, [], query, hit, "Campus venue match"),
  };
}

function resolveDiscoverArgs(
  queryOrRequest: unknown,
  requestedLimit?: unknown
): { query: string; limit: number } | null {
  let query: unknown = queryOrRequest;
  let limitRaw: unknown = requestedLimit;

  // Accept DiscoverRequest so callers cannot crash fallback with a non-string query.
  if (isRecord(queryOrRequest) && typeof queryOrRequest.query === "string") {
    query = queryOrRequest.query;
    if (limitRaw === undefined) {
      limitRaw = queryOrRequest.limitPerType;
    }
  }

  if (typeof query !== "string") {
    return null;
  }

  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const parsedLimit =
    typeof limitRaw === "number" && Number.isFinite(limitRaw)
      ? Math.floor(limitRaw)
      : DEFAULT_LIMIT_PER_TYPE;

  return {
    query: trimmed,
    limit: Math.min(Math.max(parsedLimit, 1), MAX_LIMIT_PER_TYPE),
  };
}

async function searchCollection(
  collection: string,
  params: {
    q: string;
    query_by: string;
    num_typos: number;
    drop_tokens_threshold: number;
    per_page: number;
    exclude_fields: string;
  }
): Promise<MultiSearchResult> {
  try {
    const result = await getTypesenseSearchClient()
      .collections(collection)
      .documents()
      .search(params);
    return result as MultiSearchResult;
  } catch (error) {
    const httpStatus = (error as { httpStatus?: number }).httpStatus;
    console.error(
      `Discover search failed for collection '${collection}':`,
      httpStatus ?? "request failed"
    );
    return {
      code: typeof httpStatus === "number" ? httpStatus : 500,
      error: "unavailable",
    };
  }
}

function cachedEvents(query: string, limit: number): DiscoverGroup<DiscoverEvent> {
  const normalizedQuery = query.toLowerCase();
  const items = filterCampusEvents(mockEvents)
    .filter((event) => {
      const searchableText = [
        event.title,
        event.description,
        event.organization,
        event.location?.name,
        ...event.categories,
      ]
        .filter((value): value is string => typeof value === "string")
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    })
    .slice(0, limit)
    .map((event) => ({ ...event, type: "event" as const }));

  return { items, found: items.length, status: "fallback" };
}

/**
 * Runs federated campus discovery. Each collection is queried independently so
 * missing organizations/venues collections return `unavailable` without
 * crashing events search or fallback text matching.
 */
export async function discover(
  queryOrRequest: string | DiscoverRequest,
  requestedLimit?: number
): Promise<DiscoverResponse> {
  const startTime = Date.now();
  const resolved = resolveDiscoverArgs(queryOrRequest, requestedLimit);

  if (!resolved) {
    return {
      query: "",
      groups: {
        events: createUnavailableGroup<DiscoverEvent>(),
        organizations: createUnavailableGroup<DiscoverOrganization>(),
        venues: createUnavailableGroup<DiscoverVenue>(),
      },
      partial: true,
      tookMs: Date.now() - startTime,
    };
  }

  const { query, limit } = resolved;

  const [eventsResult, organizationsResult, venuesResult] = await Promise.all([
    searchCollection(EVENTS_COLLECTION_NAME, {
      q: query,
      query_by: "title,description,organization,categories,embedding",
      num_typos: 2,
      drop_tokens_threshold: 0,
      per_page: limit,
      exclude_fields: "embedding",
    }),
    searchCollection(ORGANIZATIONS_COLLECTION_NAME, {
      q: query,
      query_by: "name,description,categories,embedding",
      num_typos: 2,
      drop_tokens_threshold: 0,
      per_page: limit,
      exclude_fields: "embedding",
    }),
    searchCollection(VENUES_COLLECTION_NAME, {
      q: query,
      query_by: "name,short_name,aliases,address,type,embedding",
      num_typos: 2,
      drop_tokens_threshold: 0,
      per_page: limit,
      exclude_fields: "embedding",
    }),
  ]);

  let events = normalizeGroup(eventsResult, (document, hit) =>
    normalizeEvent(document, hit, query)
  );
  if (events.status !== "ok") {
    events = cachedEvents(query, limit);
  } else {
    const campusItems = filterCampusEvents(events.items);
    events = {
      ...events,
      items: campusItems,
      found: campusItems.length,
    };
  }

  const organizations = normalizeGroup(
    organizationsResult,
    (document, hit) => normalizeOrganization(document, hit, query)
  );
  // Keep campus orgs; Localist also indexes Indianapolis units.
  if (organizations.status === "ok") {
    const campusOrgs = organizations.items.filter((org) => {
      const text = `${org.name} ${org.description}`;
      return !/\bindianapolis\b/i.test(text) && !/\bindy\b/i.test(text);
    });
    organizations.items = campusOrgs;
    organizations.found = campusOrgs.length;
  }

  const venues = normalizeGroup(venuesResult, (document, hit) =>
    normalizeVenue(document, hit, query)
  );
  if (venues.status === "ok") {
    const campusVenues = venues.items.filter((venue) => {
      const text = `${venue.name} ${venue.address ?? ""}`;
      return !/\bindianapolis\b/i.test(text) && !/\bindy\b/i.test(text);
    });
    venues.items = campusVenues;
    venues.found = campusVenues.length;
  }

  const groups = { events, organizations, venues };
  return {
    query,
    groups,
    partial: Object.values(groups).some((group) => group.status !== "ok"),
    tookMs: Date.now() - startTime,
  };
}
