import { SearchRequest, SearchResponse } from "@/types/search";
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
  return {
    events,
    found: typeof found === "number" ? found : events.length,
    tookMs: typeof tookMs === "number" ? tookMs : 0,
  };
}
