import { NextRequest, NextResponse } from "next/server";
import { searchEvents } from "@/lib/search/searchEvents";
import { SearchRequest } from "@/types/search";

/**
 * Search API endpoint
 * POST /api/search
 * Owned by: Backend / Typesense developer
 */
export async function POST(request: NextRequest) {
  try {
    let body: SearchRequest;
    try {
      body = (await request.json()) as SearchRequest;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    if (body.query === undefined) {
      return NextResponse.json(
        { error: "Missing 'query' field in request body" },
        { status: 400 }
      );
    }

    const response = await searchEvents(body);
    return NextResponse.json(response);
  } catch (error) {
    console.error("Search API route error:", error);
    return NextResponse.json(
      { error: "Internal server error processing search request" },
      { status: 500 }
    );
  }
}
