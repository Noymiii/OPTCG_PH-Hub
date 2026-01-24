export interface CardVariant {
  variant_id: string;
  variant_name: string;
  rarity: string;
  finish: string;
  image_url: string;
  price_jpy: number; // <--- BACK TO JPY
  isHighDemand: boolean;
  source?: string; // Optional source URL from scraper
}

export interface CardParent {
  card_code: string;
  base_name?: string; // Optional, defaults to card_code if missing
  type?: string; // Optional, not always present in scraped data
  color?: string; // Optional, not always present in scraped data
  set: string;
  variants: CardVariant[];
}