export interface Organization {
  id: string;
  name: string;
  shortName?: string;
  aliases: string[];
  type: string;
  description: string;
  categories?: string[];
  imageUrl?: string;
  url?: string;
  localistUrl?: string;
  source: string;
}
