import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  ProductsRepository,
  RawProductFixture,
} from './products.repository.js';
import { SearchResult } from '../models/search-result.model.js';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEGACY_ID_REGEX = /^prod-\d+$/i;

const PRODUCT_UUID_MAP = new Map<string, string>([
  ['prod-001', '00000000-0000-0000-0000-000000000001'],
  ['prod-002', '00000000-0000-0000-0000-000000000002'],
  ['prod-003', '00000000-0000-0000-0000-000000000003'],
  ['prod-004', '00000000-0000-0000-0000-000000000004'],
  ['prod-005', '00000000-0000-0000-0000-000000000005'],
]);

const VALID_STORES = [
  'amazon',
  'mercadolibre',
  'walmart',
  'liverpool',
] as const;
type StoreSlug = (typeof VALID_STORES)[number];

function getStoreSlug(storeName?: string | null): StoreSlug | null {
  if (!storeName || typeof storeName !== 'string') return null;
  const normalized = storeName.toLowerCase().replace(/[\s_-]+/g, '');
  if ((VALID_STORES as readonly string[]).includes(normalized)) {
    return normalized as StoreSlug;
  }
  return null;
}

function getDeterministicUuid(id: string): string {
  const hash = createHash('md5').update(id).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

@Injectable()
export class PrismaProductsRepository implements ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: string): Promise<SearchResult[]> {
    if (!query || typeof query !== 'string') return [];
    const term = query.trim().slice(0, 100);
    if (!term) return [];

    const products = await this.prisma.product.findMany({
      where: {
        OR: [
          {
            name: {
              contains: term,
              mode: 'insensitive',
            },
          },
          {
            searchText: {
              contains: term,
              mode: 'insensitive',
            },
          },
        ],
      },
      select: {
        uuid: true,
        name: true,
        imageUrl: true,
        prices: {
          orderBy: [{ isCurrent: 'desc' }, { priceAmount: 'asc' }],
          take: 1,
          select: {
            store: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      take: 10,
    });

    return products.map((p) => {
      const storeName = p.prices?.[0]?.store?.name;
      const storeSlug = getStoreSlug(storeName) ?? 'amazon';

      return {
        id: p.uuid,
        name: p.name,
        image: p.imageUrl,
        store: storeSlug,
      };
    });
  }

  async findById(id: string): Promise<RawProductFixture | null> {
    console.log(`\x1b[36m[PostgreSQL / Supabase]\x1b[0m Consultando histórico relacional para ID: ${id}`);
    if (!id || typeof id !== 'string') return null;
    const trimmedId = id.trim();
    if (!trimmedId) return null;

    const lowerId = trimmedId.toLowerCase();
    let targetUuid: string;
    if (UUID_REGEX.test(lowerId)) {
      targetUuid = lowerId;
    } else if (PRODUCT_UUID_MAP.has(lowerId)) {
      targetUuid = PRODUCT_UUID_MAP.get(lowerId)!;
    } else if (LEGACY_ID_REGEX.test(lowerId)) {
      targetUuid = getDeterministicUuid(lowerId);
    } else {
      return null;
    }

    const product = await this.prisma.product.findUnique({
      where: { uuid: targetUuid },
      include: {
        prices: {
          include: {
            store: true,
          },
          orderBy: {
            time: 'asc',
          },
        },
      },
    });

    if (!product) return null;

    const storeDailyPrices: Record<StoreSlug, Map<string, number>> = {
      amazon: new Map(),
      mercadolibre: new Map(),
      walmart: new Map(),
      liverpool: new Map(),
    };

    if (Array.isArray(product.prices)) {
      for (const record of product.prices) {
        if (
          !record ||
          !record.time ||
          record.priceAmount == null ||
          (typeof record.priceAmount === 'string' &&
            (record.priceAmount as string).trim() === '')
        ) {
          continue;
        }

        const storeSlug = getStoreSlug(record.store?.name);
        if (
          storeSlug &&
          Object.prototype.hasOwnProperty.call(storeDailyPrices, storeSlug)
        ) {
          const dateObj =
            record.time instanceof Date ? record.time : new Date(record.time);
          if (isNaN(dateObj.getTime())) continue;
          const isoDate = dateObj.toISOString().split('T')[0];
          const price =
            typeof record.priceAmount === 'number'
              ? record.priceAmount
              : typeof (record.priceAmount as { toNumber?: () => number })
                    ?.toNumber === 'function'
                ? (
                    record.priceAmount as { toNumber: () => number }
                  ).toNumber()
                : Number(record.priceAmount);

          if (!isNaN(price) && Number.isFinite(price) && price >= 0) {
            storeDailyPrices[storeSlug].set(isoDate, price);
          }
        }
      }
    }

    const pricesByStore: RawProductFixture['pricesByStore'] = {
      amazon: Array.from(storeDailyPrices.amazon.entries()).map(([date, price]) => ({
        date,
        price,
      })),
      mercadolibre: Array.from(storeDailyPrices.mercadolibre.entries()).map(
        ([date, price]) => ({
          date,
          price,
        }),
      ),
      walmart: Array.from(storeDailyPrices.walmart.entries()).map(
        ([date, price]) => ({
          date,
          price,
        }),
      ),
      liverpool: Array.from(storeDailyPrices.liverpool.entries()).map(
        ([date, price]) => ({
          date,
          price,
        }),
      ),
    };

    return {
      id: product.uuid,
      name: product.name,
      brand: product.brand ?? undefined,
      model: product.model ?? undefined,
      storage: product.storage ?? undefined,
      color: product.color ?? undefined,
      category: product.category ?? undefined,
      imageUrl: product.imageUrl,
      searchText: product.searchText ?? undefined,
      pricesByStore,
    };
  }
}
