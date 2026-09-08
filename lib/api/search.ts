import { SearchRequest, SearchResponse } from "@/types/search";

/**
 * Client-side search API helper
 * Calls POST /api/search
 */
export async function searchEvents(request: SearchRequest): Promise<SearchResponse> {
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
