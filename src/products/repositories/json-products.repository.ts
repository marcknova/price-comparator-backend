import { Injectable, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ProductsRepository, RawProductFixture } from './products.repository.js';
import { SearchResult } from '../models/search-result.model.js';


@Injectable()
export class JsonProductsRepository implements ProductsRepository, OnModuleInit {
  private searchIndex: SearchResult[] = [];
  private productsMap = new Map<string, RawProductFixture>();

  onModuleInit() {
    const fixturesPath = resolve(process.cwd(), 'src', 'fixtures'); 

    const rawSearch = readFileSync(resolve(fixturesPath, 'search-index.json'), 'utf-8');
    this.searchIndex = JSON.parse(rawSearch);

    const rawData = readFileSync(resolve(fixturesPath, 'mock-data.json'), 'utf-8'); 
    const productsList: RawProductFixture[] = JSON.parse(rawData);
    for (const prod of productsList) {
      this.productsMap.set(prod.id, prod);
    }
  }

  async search(query: string): Promise<SearchResult[]> {
    const term = query.toLowerCase().trim();
    if (!term) return [];
    return this.searchIndex.filter((item) =>
      item.name.toLowerCase().includes(term),
    );
  }

  async findById(id: string): Promise<RawProductFixture | null> {
    return this.productsMap.get(id) ?? null;
  }
}