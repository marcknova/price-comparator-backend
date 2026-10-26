import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaProductsRepository } from './prisma-products.repository.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Decimal } from '@prisma/client/runtime/library';

describe('PrismaProductsRepository', () => {
  let repository: PrismaProductsRepository;
  let prismaService: any;

  beforeEach(() => {
    prismaService = {
      product: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
    };
    repository = new PrismaProductsRepository(
      prismaService as unknown as PrismaService,
    );
  });

  describe('search', () => {
    it('returns empty array when query is empty or whitespace', async () => {
      expect(await repository.search('')).toEqual([]);
      expect(await repository.search('   ')).toEqual([]);
      expect(prismaService.product.findMany).not.toHaveBeenCalled();
    });

    it('queries products with insensitive search and maps search results correctly', async () => {
      prismaService.product.findMany.mockResolvedValue([
        {
          uuid: '00000000-0000-0000-0000-000000000001',
          name: 'iPhone 15',
          imageUrl: 'https://example.com/iphone.png',
          prices: [
            {
              store: {
                name: 'Mercado Libre',
              },
            },
          ],
        },
        {
          uuid: '00000000-0000-0000-0000-000000000002',
          name: 'Galaxy S24',
          imageUrl: 'https://example.com/galaxy.png',
          prices: [],
        },
      ]);

      const results = await repository.search(' phone ');

      expect(prismaService.product.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            {
              name: {
                contains: 'phone',
                mode: 'insensitive',
              },
            },
            {
              searchText: {
                contains: 'phone',
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

      expect(results).toEqual([
        {
          id: '00000000-0000-0000-0000-000000000001',
          name: 'iPhone 15',
          image: 'https://example.com/iphone.png',
          store: 'mercadolibre',
        },
        {
          id: '00000000-0000-0000-0000-000000000002',
          name: 'Galaxy S24',
          image: 'https://example.com/galaxy.png',
          store: 'amazon',
        },
      ]);
    });

    it('truncates search queries longer than 100 characters', async () => {
      prismaService.product.findMany.mockResolvedValue([]);
      const longQuery = 'a'.repeat(120);

      await repository.search(longQuery);

      expect(prismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              {
                name: {
                  contains: 'a'.repeat(100),
                  mode: 'insensitive',
                },
              },
              {
                searchText: {
                  contains: 'a'.repeat(100),
                  mode: 'insensitive',
                },
              },
            ],
          },
        }),
      );
    });
  });

  describe('findById', () => {
    it('returns null if the id is invalid and not in map', async () => {
      const result = await repository.findById('invalid-id');
      expect(result).toBeNull();
      expect(prismaService.product.findUnique).not.toHaveBeenCalled();
    });

    it('returns null for non-string, empty or whitespace id', async () => {
      expect(await repository.findById('')).toBeNull();
      expect(await repository.findById('   ')).toBeNull();
      expect(await repository.findById(null as any)).toBeNull();
      expect(await repository.findById(undefined as any)).toBeNull();
      expect(prismaService.product.findUnique).not.toHaveBeenCalled();
    });

    it('resolves legacy alias prod-001 to mapped UUID', async () => {
      prismaService.product.findUnique.mockResolvedValue(null);

      const result = await repository.findById('prod-001');

      expect(result).toBeNull();
      expect(prismaService.product.findUnique).toHaveBeenCalledWith({
        where: { uuid: '00000000-0000-0000-0000-000000000001' },
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
    });

    it('resolves legacy alias PROD-001 in uppercase to mapped UUID', async () => {
      prismaService.product.findUnique.mockResolvedValue(null);

      const result = await repository.findById('PROD-001');

      expect(result).toBeNull();
      expect(prismaService.product.findUnique).toHaveBeenCalledWith({
        where: { uuid: '00000000-0000-0000-0000-000000000001' },
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
    });

    it('resolves unmapped prod-006 to deterministic UUID hash', async () => {
      prismaService.product.findUnique.mockResolvedValue(null);

      const result = await repository.findById('prod-006');

      expect(result).toBeNull();
      expect(prismaService.product.findUnique).toHaveBeenCalledWith({
        where: { uuid: 'ef23906b-656f-4cb1-aed6-28a03d421e5c' },
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
    });

    it('returns null when product is not found', async () => {
      prismaService.product.findUnique.mockResolvedValue(null);

      const result = await repository.findById(
        '00000000-0000-0000-0000-000000000001',
      );

      expect(result).toBeNull();
    });

    it('correctly maps and groups prices by store, formatting dates and decimals and deduplicating per day', async () => {
      const mockProduct = {
        uuid: '00000000-0000-0000-0000-000000000001',
        name: 'Apple iPhone 15 Pro Max',
        brand: 'Apple',
        model: 'A2849',
        storage: '256GB',
        color: 'Titanio Negro',
        category: 'Telefonía',
        imageUrl: 'https://example.com/iphone.png',
        searchText: 'Apple iPhone 15 Pro Max',
        prices: [
          {
            time: new Date('2024-10-10T08:00:00.000Z'),
            priceAmount: new Decimal(25500.0),
            store: { name: 'Amazon' },
          },
          {
            time: new Date('2024-10-10T14:00:00.000Z'),
            priceAmount: new Decimal(25429.5),
            store: { name: 'Amazon' },
          },
          {
            time: new Date('2024-10-11T00:00:00.000Z'),
            priceAmount: new Decimal(25419.0),
            store: { name: 'Amazon' },
          },
          {
            time: new Date('2024-10-10T00:00:00.000Z'),
            priceAmount: new Decimal(26000.0),
            store: { name: 'Mercado Libre' },
          },
          {
            time: new Date('2024-10-10T00:00:00.000Z'),
            priceAmount: new Decimal(25999.0),
            store: { name: 'Walmart' },
          },
          {
            time: new Date('2024-10-10T00:00:00.000Z'),
            priceAmount: new Decimal(26500.0),
            store: { name: 'Liverpool' },
          },
          {
            time: new Date('2024-10-10T00:00:00.000Z'),
            priceAmount: new Decimal(30000.0),
            store: { name: 'constructor' }, // Test prototype safety
          },
          {
            time: new Date('2024-10-10T00:00:00.000Z'),
            priceAmount: new Decimal(30000.0),
            store: { name: 'UnknownStore' },
          },
        ],
      };

      prismaService.product.findUnique.mockResolvedValue(mockProduct);

      const result = await repository.findById(
        '00000000-0000-0000-0000-000000000001',
      );

      expect(result).toEqual({
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Apple iPhone 15 Pro Max',
        brand: 'Apple',
        model: 'A2849',
        storage: '256GB',
        color: 'Titanio Negro',
        category: 'Telefonía',
        imageUrl: 'https://example.com/iphone.png',
        searchText: 'Apple iPhone 15 Pro Max',
        pricesByStore: {
          amazon: [
            { date: '2024-10-10', price: 25429.5 }, // Latest price of that day
            { date: '2024-10-11', price: 25419 },
          ],
          mercadolibre: [{ date: '2024-10-10', price: 26000 }],
          walmart: [{ date: '2024-10-10', price: 25999 }],
          liverpool: [{ date: '2024-10-10', price: 26500 }],
        },
      });
    });

    it('ignores records with null/empty priceAmount, null time, or negative price', async () => {
      const mockProduct = {
        uuid: '00000000-0000-0000-0000-000000000001',
        name: 'Apple iPhone 15 Pro Max',
        imageUrl: 'https://example.com/iphone.png',
        prices: [
          null,
          {
            time: null,
            priceAmount: new Decimal(25000),
            store: { name: 'Amazon' },
          },
          {
            time: new Date('2024-10-10T00:00:00.000Z'),
            priceAmount: null,
            store: { name: 'Amazon' },
          },
          {
            time: new Date('2024-10-10T00:00:00.000Z'),
            priceAmount: '',
            store: { name: 'Amazon' },
          },
          {
            time: new Date('2024-10-10T00:00:00.000Z'),
            priceAmount: new Decimal(-50),
            store: { name: 'Amazon' },
          },
          {
            time: new Date('2024-10-10T10:00:00.000Z'),
            priceAmount: new Decimal(25429.5),
            store: { name: 'Amazon' },
          },
        ],
      };

      prismaService.product.findUnique.mockResolvedValue(mockProduct);

      const result = await repository.findById(
        '00000000-0000-0000-0000-000000000001',
      );

      expect(result?.pricesByStore.amazon).toEqual([
        { date: '2024-10-10', price: 25429.5 },
      ]);
    });
  });
});
