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

export interface SearchResponse {
  events: Event[];
  found: number;
  tookMs: number;
}
