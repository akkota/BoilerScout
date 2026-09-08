import { SearchRequest, SearchResponse } from "@/types/search";
import { mockEvents } from "@/lib/data/mockEvents";

/**
 * Backend Search Service
 * Owned by: Backend / Typesense developer
 *
 * Currently returns filtered mock events.
 * TODO: Replace mock filtering with Typesense Cloud hybrid keyword + semantic search,
 * time filtering, geo-filtering, and RouteScout polygon filtering.
 */
export async function searchEvents(request: SearchRequest): Promise<SearchResponse> {
  const startTime = Date.now();
  const query = request.query?.trim().toLowerCase() || "";

  let filtered = mockEvents;

  if (query) {
    filtered = mockEvents.filter((event) => {
      const matchTitle = event.title.toLowerCase().includes(query);
      const matchDesc = event.description.toLowerCase().includes(query);
      const matchOrg = event.organization?.toLowerCase().includes(query) ?? false;
      const matchLoc = event.location?.name.toLowerCase().includes(query) ?? false;
      const matchCategory = event.categories.some((cat) => cat.toLowerCase().includes(query));

      return matchTitle || matchDesc || matchOrg || matchLoc || matchCategory;
    });
  }

  // Filter by category if specified in filters
  if (request.filters?.categories && request.filters.categories.length > 0) {
    const filterCategories = request.filters.categories.map((c) => c.toLowerCase());
    filtered = filtered.filter((event) =>
      event.categories.some((c) => filterCategories.includes(c.toLowerCase()))
    );
  }

  const tookMs = Date.now() - startTime;

  return {
    events: filtered,
    found: filtered.length,
    tookMs,
  };
}
