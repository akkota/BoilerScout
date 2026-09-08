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
    const errorText = await res.text().catch(() => "Unknown error");
    throw new Error(`Failed to search events: ${res.status} ${errorText}`);
  }

  return res.json();
}
