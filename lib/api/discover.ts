import { isMockMode } from "@/lib/api/search";
import type { DiscoverRequest, DiscoverResponse } from "@/types/discover";

/**
 * Client-side federated discovery helper.
 * Calls POST /api/discover for events + organizations + venues.
 */
export async function discoverCampus(
  request: DiscoverRequest
): Promise<DiscoverResponse> {
  if (isMockMode()) {
    return {
      query: request.query,
      groups: {
        events: { items: [], found: 0, status: "unavailable" },
        organizations: { items: [], found: 0, status: "unavailable" },
        venues: { items: [], found: 0, status: "unavailable" },
      },
      partial: true,
      tookMs: 0,
    };
  }

  const res = await fetch("/api/discover", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    throw new Error(await readDiscoverError(res));
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error("Couldn't load campus discovery. Try again.");
  }

  return parseDiscoverResponse(data);
}

async function readDiscoverError(res: Response): Promise<string> {
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
    // ignore non-JSON
  }
  return "Couldn't load campus discovery. Try again.";
}

function parseDiscoverResponse(data: unknown): DiscoverResponse {
  if (!data || typeof data !== "object" || !("groups" in data)) {
    throw new Error("Couldn't load campus discovery. Try again.");
  }
  return data as DiscoverResponse;
}
