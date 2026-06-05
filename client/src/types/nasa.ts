export interface BlackHoleEntry {
  name: string;
  slug: string;
  description: string;
  mass_solar: number;
  distance_ly: number;
  spin: number;
  type: "stellar" | "supermassive" | "ultramassive";
  discovered: number;
  source: string;
  image_url: string | null;
}

export interface NASACatalog {
  count: number;
  black_holes: BlackHoleEntry[];
}

export interface APOD {
  title: string;
  explanation: string;
  url: string | null;
  date?: string;
}
