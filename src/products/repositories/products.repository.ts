import { SearchResult } from "../models/search-result.model.js";


export interface RawProductFixture {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  storage?: string;
  color?: string;
  imageUrl: string;
  category?: string;
  searchText?: string;
  pricesByStore: {
    amazon?: Array<{ date: string; price: number }>;
    mercadolibre?: Array<{ date: string; price: number }>;
    walmart?: Array<{ date: string; price: number }>;
    liverpool?: Array<{ date: string; price: number }>;
  };
}

export abstract class ProductsRepository {
  abstract search(query: string): Promise<SearchResult[]>;
  abstract findById(id: string): Promise<RawProductFixture | null>;
}