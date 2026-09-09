import { Event } from "./event";

export interface SearchFilters {
  startAfter?: number;
  startBefore?: number;
  center?: {
    lat: number;
    lng: number;
  };
  radiusMiles?: number;
  categories?: string[];
  freeOnly?: boolean;
}

export interface RouteOptions {
  points: {
    lat: number;
    lng: number;
  }[];
  /**
   * Corridor width in meters around the walking route.
   * Preferred field name used by RouteScout.
   */
  corridorMeters?: number;
  /**
   * Alias for corridorMeters (documented API contract name).
   * Accepted for backwards compatibility with clients sending bufferMeters.
   */
  bufferMeters?: number;
}

export interface SearchRequest {
  query: string;
  filters?: SearchFilters;
  route?: RouteOptions;
}

/** Resolved RouteScout geometry returned only for an active route search. */
export interface RouteScoutResponse {
  points: RouteOptions["points"];
  corridorMeters: number;
  originName?: string;
  destinationName?: string;
}

export interface SearchResponse {
  events: Event[];
  found: number;
  tookMs: number;
  /** Optional, backward-compatible metadata for rendering the walking route. */
  routeScout?: RouteScoutResponse;
}
