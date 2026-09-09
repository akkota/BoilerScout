export interface Venue {
  id: string;
  name: string;
  shortName?: string;
  aliases: string[];
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  location: {
    lat: number;
    lng: number;
  };
  type?: string;
  imageUrl?: string;
  url?: string;
  localistUrl?: string;
  source: string;
}
