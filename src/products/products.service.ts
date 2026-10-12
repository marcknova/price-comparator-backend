import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductsRepository, RawProductFixture } from './repositories/products.repository.js';
import { SearchResult } from './models/search-result.model.js';
import { ProductDetail } from './models/product-detail.model.js';
import { PricePoint } from './models/price-point.model.js';
import { PriceStats } from './models/price-stats.model.js';

@Injectable()
export class ProductsService {
  constructor(private readonly productsRepository: ProductsRepository) {}

  async search(query: string): Promise<SearchResult[]> {
    return this.productsRepository.search(query);
  }

  async getDetail(id: string): Promise<ProductDetail> {
    const raw = await this.productsRepository.findById(id);
    if (!raw) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const history = this.mergePriceHistory(raw.pricesByStore);
    const stats = this.computeStats(raw.pricesByStore, history);

    return {
      product: {
        id: raw.id,
        name: raw.name,
        image: raw.imageUrl,
        brand: raw.brand,
        model: raw.model,
        storage: raw.storage,
        color: raw.color,
        category: raw.category,
      },
      history,
      stats,
    };
  }

  private mergePriceHistory(pricesByStore: RawProductFixture['pricesByStore']): PricePoint[] {
    const dateMap = new Map<string, PricePoint>();

    const stores = ['amazon', 'mercadolibre', 'walmart', 'liverpool'] as const;
    for (const store of stores) {
      const entries = pricesByStore[store] ?? [];
      for (const entry of entries) {
        if (!dateMap.has(entry.date)) {
          dateMap.set(entry.date, { date: entry.date });
        }
        const point = dateMap.get(entry.date)!;
        point[store] = entry.price;
      }
    }

    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  private computeStats(
    pricesByStore: RawProductFixture['pricesByStore'],
    history: PricePoint[],
  ): PriceStats {
    let globalMin = Infinity;
    let globalMinDate = '';
    let globalMinStore = '';

    let globalMax = -Infinity;
    let globalMaxDate = '';
    let globalMaxStore = '';

    const stores = ['amazon', 'mercadolibre', 'walmart', 'liverpool'] as const;

    for (const store of stores) {
      const entries = pricesByStore[store] ?? [];
      for (const entry of entries) {
        if (entry.price < globalMin) {
          globalMin = entry.price;
          globalMinDate = entry.date;
          globalMinStore = store;
        }
        if (entry.price > globalMax) {
          globalMax = entry.price;
          globalMaxDate = entry.date;
          globalMaxStore = store;
        }
      }
    }

    // Precio actual: extraer de la última fecha registrada en el histórico ordenado
    const lastPoint = history[history.length - 1];
    let currentPrice = Infinity;
    let currentStore = '';

    if (lastPoint) {
      for (const store of stores) {
        const p = lastPoint[store];
        if (p !== undefined && p < currentPrice) {
          currentPrice = p;
          currentStore = store;
        }
      }
    }

    return {
      globalMin,
      globalMinDate,
      globalMinStore,
      globalMax,
      globalMaxDate,
      globalMaxStore,
      currentPrice: currentPrice === Infinity ? 0 : currentPrice,
      currentStore,
      currency: 'MXN',
    };
  }
}