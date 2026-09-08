import { NextRequest, NextResponse } from "next/server";
import { discover } from "@/lib/search/discover";
import { DiscoverRequest } from "@/types/discover";

const MAX_LIMIT_PER_TYPE = 10;

/**
 * POST /api/discover
 * Federated campus discovery across events, organizations, and venues.
 */
export async function POST(request: NextRequest) {
  let body: DiscoverRequest;

  try {
    body = (await request.json()) as DiscoverRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body" },
      { status: 400 }
    );
  }

  if (typeof body.query !== "string" || body.query.trim().length === 0) {
    return NextResponse.json(
      { error: "A non-empty 'query' field is required" },
      { status: 400 }
    );
  }

  if (
    body.limitPerType !== undefined &&
    (!Number.isInteger(body.limitPerType) ||
      body.limitPerType < 1 ||
      body.limitPerType > MAX_LIMIT_PER_TYPE)
  ) {
    return NextResponse.json(
      { error: `'limitPerType' must be an integer between 1 and ${MAX_LIMIT_PER_TYPE}` },
      { status: 400 }
    );
  }

  try {
    const response = await discover(body.query.trim(), body.limitPerType);
    return NextResponse.json(response);
  } catch (error) {
    console.error("Discover API route error:", error);
    return NextResponse.json(
      { error: "Internal server error processing discover request" },
      { status: 500 }
    );
  }
}
