export interface Event {
  id: string;
  title: string;
  description: string;
  organization?: string;
  categories: string[];
  startsAt: number;
  endsAt?: number;

  locationName?: string;
  location?: {
    name: string;
    lat?: number;
    lng?: number;
  };

  imageUrl?: string;
  url?: string;
  source: string;
  free?: boolean;
  distanceMiles?: number;
  detourMinutes?: number;
  reasons: string[];
}

