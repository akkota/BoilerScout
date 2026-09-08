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
  corridorMeters: number;
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
