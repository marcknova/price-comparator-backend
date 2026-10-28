import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type Mock,
} from 'vitest';
import { ProductsService } from './products.service.js';
import {
  ProductsRepository,
  RawProductFixture,
} from './repositories/products.repository.js';
import { SearchResult } from './models/search-result.model.js';

describe('ProductsService (Unit Tests)', () => {
  let service: ProductsService;
  let mockRepository: {
    search: Mock<(query: string) => Promise<SearchResult[]>>;
    findById: Mock<(id: string) => Promise<RawProductFixture | null>>;
  };

  const mockProductFixture: RawProductFixture = {
    id: 'prod-test-01',
    name: 'Dispositivo de Prueba Pro',
    brand: 'TestBrand',
    model: 'T-100',
    storage: '128GB',
    color: 'Titanium',
    category: 'Smartphones',
    imageUrl: 'https://example.com/test.jpg',
    pricesByStore: {
      amazon: [
        { date: '2026-01-01', price: 10000 },
        { date: '2026-01-02', price: 9500 },
        { date: '2026-01-03', price: 9800 },
      ],
      mercadolibre: [
        { date: '2026-01-01', price: 10500 },
        { date: '2026-01-02', price: 9200 },
        { date: '2026-01-03', price: 9600 },
      ],
      walmart: [
        { date: '2026-01-01', price: 10200 },
        { date: '2026-01-02', price: 9700 },
        { date: '2026-01-03', price: 9400 },
      ],
      liverpool: [
        { date: '2026-01-01', price: 10400 },
        { date: '2026-01-02', price: 9900 },
        { date: '2026-01-03', price: 9700 },
      ],
    },
  };

  beforeEach(async () => {
    mockRepository = {
      search: vi.fn(),
      findById: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: ProductsRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('search', () => {
    it('debe delegar la busqueda al repositorio y retornar los resultados', async () => {
      const expectedResults: SearchResult[] = [
        {
          id: 'p1',
          name: 'iPhone 15',
          image: 'url',
          store: 'amazon',
        },
      ];
      mockRepository.search.mockResolvedValue(expectedResults);

      const results = await service.search('iphone');

      expect(mockRepository.search).toHaveBeenCalledTimes(1);
      expect(mockRepository.search).toHaveBeenCalledWith('iphone');
      expect(results).toEqual(expectedResults);
    });

    it('debe retornar un arreglo vacío si el repositorio no encuentra coincidencias', async () => {
      mockRepository.search.mockResolvedValue([]);

      const result = await service.search('inexistente');

      expect(mockRepository.search).toHaveBeenCalledWith('inexistente');
      expect(result).toEqual([]);
    });

    it('debe propagar errores si el repositorio falla al buscar', async () => {
      mockRepository.search.mockRejectedValue(new Error('Database timeout'));

      await expect(service.search('iphone')).rejects.toThrow(
        'Database timeout',
      );
      expect(mockRepository.search).toHaveBeenCalledWith('iphone');
    });
  });

  describe('getDetail', () => {
    it('debe lanzar NotFoundException con mensaje exacto si el producto no existe en el repositorio', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.getDetail('prod-404')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getDetail('prod-404')).rejects.toThrow(
        'Product with ID prod-404 not found',
      );
      expect(mockRepository.findById).toHaveBeenCalledWith('prod-404');
    });

    it('debe propagar errores si el repositorio falla al consultar por id', async () => {
      mockRepository.findById.mockRejectedValue(new Error('Connection lost'));

      await expect(service.getDetail('prod-err')).rejects.toThrow(
        'Connection lost',
      );
      expect(mockRepository.findById).toHaveBeenCalledWith('prod-err');
    });

    it('debe mapear correctamente la información del producto', async () => {
      mockRepository.findById.mockResolvedValue(mockProductFixture);

      const detail = await service.getDetail('prod-test-01');

      expect(detail.product).toEqual({
        id: 'prod-test-01',
        name: 'Dispositivo de Prueba Pro',
        image: 'https://example.com/test.jpg',
        brand: 'TestBrand',
        model: 'T-100',
        storage: '128GB',
        color: 'Titanium',
        category: 'Smartphones',
      });
    });

    it('debe calcular matemáticamente el mínimo global, fecha y tienda exactos', async () => {
      mockRepository.findById.mockResolvedValue(mockProductFixture);

      const detail = await service.getDetail('prod-test-01');

      expect(detail.stats.globalMin).toBe(9200);
      expect(detail.stats.globalMinDate).toBe('2026-01-02');
      expect(detail.stats.globalMinStore).toBe('mercadolibre');
    });

    it('debe calcular matemáticamente el máximo global, fecha y tienda exactos', async () => {
      mockRepository.findById.mockResolvedValue(mockProductFixture);

      const detail = await service.getDetail('prod-test-01');

      expect(detail.stats.globalMax).toBe(10500);
      expect(detail.stats.globalMaxDate).toBe('2026-01-01');
      expect(detail.stats.globalMaxStore).toBe('mercadolibre');
    });

    it('debe determinar el precio actual más bajo evaluando únicamente la última fecha cronológica', async () => {
      mockRepository.findById.mockResolvedValue(mockProductFixture);

      const detail = await service.getDetail('prod-test-01');

      expect(detail.stats.currentPrice).toBe(9400);
      expect(detail.stats.currentStore).toBe('walmart');
      expect(detail.stats.currency).toBe('MXN');
    });

    it('debe fusionar y ordenar cronológicamente la serie de tiempo incluso con entradas desordenadas', async () => {
      const fixtureDesordenado: RawProductFixture = {
        ...mockProductFixture,
        pricesByStore: {
          amazon: [
            { date: '2026-01-03', price: 9800 },
            { date: '2026-01-01', price: 10000 },
          ],
          mercadolibre: [
            { date: '2026-01-04', price: 9100 },
            { date: '2026-01-02', price: 9200 },
          ],
        },
      };
      mockRepository.findById.mockResolvedValue(fixtureDesordenado);

      const detail = await service.getDetail('prod-test-01');

      expect(detail.history).toHaveLength(4);
      expect(detail.history.map((h) => h.date)).toEqual([
        '2026-01-01',
        '2026-01-02',
        '2026-01-03',
        '2026-01-04',
      ]);
      expect(detail.history[0]).toEqual({
        date: '2026-01-01',
        amazon: 10000,
      });
      expect(detail.history[1]).toEqual({
        date: '2026-01-02',
        mercadolibre: 9200,
      });
      expect(detail.history[0].mercadolibre).toBeUndefined();
      expect(detail.history[1].amazon).toBeUndefined();
    });

    it('debe manejar tiendas con listas vacías o faltantes sin arrojar errores', async () => {
      const fixtureIncompleto: RawProductFixture = {
        ...mockProductFixture,
        pricesByStore: {
          amazon: [{ date: '2026-01-01', price: 5000 }],
          mercadolibre: [],
          walmart: undefined,
          liverpool: undefined,
        },
      };
      mockRepository.findById.mockResolvedValue(fixtureIncompleto);

      const detail = await service.getDetail('prod-test-01');

      expect(detail.stats.globalMin).toBe(5000);
      expect(detail.stats.globalMinDate).toBe('2026-01-01');
      expect(detail.stats.globalMinStore).toBe('amazon');
      expect(detail.stats.globalMax).toBe(5000);
      expect(detail.stats.globalMaxDate).toBe('2026-01-01');
      expect(detail.stats.globalMaxStore).toBe('amazon');
      expect(detail.stats.currentPrice).toBe(5000);
      expect(detail.stats.currentStore).toBe('amazon');
      expect(detail.history).toHaveLength(1);
      expect(detail.history[0].mercadolibre).toBeUndefined();
      expect(detail.history[0].walmart).toBeUndefined();
      expect(detail.history[0].liverpool).toBeUndefined();
    });

    it('debe manejar productos con pricesByStore completamente indefinido o vacío asignando valores por defecto compatibles con GraphQL', async () => {
      const fixtureSinPrecios: RawProductFixture = {
        ...mockProductFixture,
        pricesByStore:
          undefined as unknown as RawProductFixture['pricesByStore'],
      };
      mockRepository.findById.mockResolvedValue(fixtureSinPrecios);

      const detail = await service.getDetail('prod-test-01');

      expect(detail.stats).toEqual({
        globalMin: 0,
        globalMinDate: '',
        globalMinStore: '',
        globalMax: 0,
        globalMaxDate: '',
        globalMaxStore: '',
        currentPrice: 0,
        currentStore: '',
        currency: 'MXN',
      });
      expect(detail.history).toHaveLength(0);
    });

    it('debe manejar productos con tiendas vacías sin devolver Infinity ni -Infinity', async () => {
      const fixtureListasVacias: RawProductFixture = {
        ...mockProductFixture,
        pricesByStore: {
          amazon: [],
          mercadolibre: [],
          walmart: [],
          liverpool: [],
        },
      };
      mockRepository.findById.mockResolvedValue(fixtureListasVacias);

      const detail = await service.getDetail('prod-test-01');

      expect(detail.stats).toEqual({
        globalMin: 0,
        globalMinDate: '',
        globalMinStore: '',
        globalMax: 0,
        globalMaxDate: '',
        globalMaxStore: '',
        currentPrice: 0,
        currentStore: '',
        currency: 'MXN',
      });
      expect(detail.history).toHaveLength(0);
    });
  });
});
