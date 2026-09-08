export interface Event {
  id: string;
  title: string;
  description: string;
  organization?: string;
  categories: string[];
  startsAt: number;
  endsAt?: number;

  location?: {
    name: string;
    lat: number;
    lng: number;
  };

  imageUrl?: string;
  url?: string;
  source: string;
  distanceMiles?: number;
  detourMinutes?: number;
  reasons: string[];
}
