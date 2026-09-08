import { Event } from "./event";

/**
 * Request accepted by POST /api/discover.
 * This endpoint intentionally has its own contract so POST /api/search
 * remains event-search only.
 */
export interface DiscoverRequest {
  query: string;
  limitPerType?: number;
}

export type DiscoverGroupStatus = "ok" | "fallback" | "unavailable";

export interface DiscoverGroup<T> {
  items: T[];
  found: number;
  status: DiscoverGroupStatus;
}

export type DiscoverEvent = Event & {
  type: "event";
};

export interface DiscoverOrganization {
  type: "organization";
  id: string;
  name: string;
  description: string;
  categories: string[];
  url?: string;
  imageUrl?: string;
  reasons: string[];
}

export interface DiscoverVenue {
  type: "venue";
  id: string;
  name: string;
  description: string;
  address?: string;
  location?: {
    lat: number;
    lng: number;
  };
  url?: string;
  imageUrl?: string;
  reasons: string[];
}

export interface DiscoverResponse {
  query: string;
  groups: {
    events: DiscoverGroup<DiscoverEvent>;
    organizations: DiscoverGroup<DiscoverOrganization>;
    venues: DiscoverGroup<DiscoverVenue>;
  };
  partial: boolean;
  tookMs: number;
}
