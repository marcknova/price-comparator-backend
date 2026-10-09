import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface PriceEntry {
    date: string;
    price: number;
}

interface ProductSeed {
    id: string;
    name: string;
    brand: string;
    model: string;
    storage: string;
    color: string;
    category: string;
    basePrice: number;
    imageUrl: string;
}

const STORES = [
  { name: 'amazon', baseOffset: 0.98, volatility: 0.035 },
  { name: 'mercadolibre', baseOffset: 0.99, volatility: 0.03 },
  { name: 'walmart', baseOffset: 1.01, volatility: 0.02 },
  { name: 'liverpool', baseOffset: 1.05, volatility: 0.015 },
] as const;

const SEED_PRODUCTS: ProductSeed[] = [
    {
    id: 'prod-001',
    name: 'Apple iPhone 15 Pro Max 256GB - Titanio Negro',
    brand: 'Apple',
    model: 'A2849',
    storage: '256GB',
    color: 'Titanio Negro',
    category: 'Telefonía',
    basePrice: 25999,
    imageUrl: 'https://picsum.photos/seed/prod-001/300/300',
  },
  {
    id: 'prod-002',
    name: 'Samsung Galaxy S24 Ultra 512GB - Titanium Gray',
    brand: 'Samsung',
    model: 'SM-S928B',
    storage: '512GB',
    color: 'Titanium Gray',
    category: 'Telefonía',
    basePrice: 24499,
    imageUrl: 'https://picsum.photos/seed/prod-002/300/300',
  },
  {
    id: 'prod-003',
    name: 'Sony WH-1000XM5 Audífonos Inalámbricos Noise Cancelling',
    brand: 'Sony',
    model: 'WH1000XM5/B',
    storage: 'N/A',
    color: 'Negro',
    category: 'Audio',
    basePrice: 6799,
    imageUrl: 'https://picsum.photos/seed/prod-003/300/300',
  },
  {
    id: 'prod-004',
    name: 'Apple MacBook Air 13 Pulgadas M3 256GB SSD 8GB RAM',
    brand: 'Apple',
    model: 'MRXV3LL/A',
    storage: '256GB',
    color: 'Medianoche',
    category: 'Cómputo',
    basePrice: 22999,
    imageUrl: 'https://picsum.photos/seed/prod-004/300/300',
  },
  {
    id: 'prod-005',
    name: 'Nintendo Switch OLED 64GB Edición Estándar',
    brand: 'Nintendo',
    model: 'HEG-001',
    storage: '64GB',
    color: 'Blanco',
    category: 'Videojuegos',
    basePrice: 5999,
    imageUrl: 'https://picsum.photos/seed/prod-005/300/300',
  },
];

const STORE_PROFILES: Record<string, {baseOffset: number; volatility: number}> = {
    amazon: { baseOffset: 0.98, volatility: 0.035 },      
  mercadolibre: { baseOffset: 0.99, volatility: 0.03 }, 
  walmart: { baseOffset: 1.01, volatility: 0.02 },      
  liverpool: { baseOffset: 1.05, volatility: 0.015 },
}

function getIsoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// 2. Función de curva estacional paramétrica
function calculateSeasonalMultiplier(date: Date): number {
  const month = date.getMonth(); // 0 = Enero, 10 = Noviembre
  const day = date.getDate();

  // Buen Fin / Black Friday (Noviembre)
  if (month === 10 && day >= 15 && day <= 30) {
    return 0.82; // 18% de descuento estacional promedio
  }

  // Cuesta de Enero (Rebajas de inicio de año)
  if (month === 0 && day <= 20) {
    return 0.91; // 9% de descuento estacional
  }

  // Hot Sale / Prime Day simulado (Mayo / Julio)
  if ((month === 4 && day >= 20) || (month === 6 && day >= 10 && day <= 16)) {
    return 0.87; // 13% de descuento temporal
  }

  return 1.0;
}

function generateMockData() {
  console.log('📦 Generando fixtures de datos sintéticos (730 días)...');

  const now = new Date();
  const daysTotal = 730;

  // Pre-generar lista de 730 fechas ordenadas de la más antigua a la actual
  const dateList: Date[] = [];
  for (let i = daysTotal - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dateList.push(d);
  }

  const mockData: any[] = [];
  const searchIndex: any[] = [];

  for (const prod of SEED_PRODUCTS) {
    const searchText = [prod.brand, prod.name, prod.model, prod.storage, prod.color]
      .filter((val) => val && val !== 'N/A')
      .join(' ');

    const pricesByStore: Record<string, PriceEntry[]> = {
      amazon: [],
      mercadolibre: [],
      walmart: [],
      liverpool: [],
    };

    // Generación cronológica día por día
    for (const store of STORES) {
      const profile = STORE_PROFILES[store.name];
      let runningPrice = prod.basePrice * profile.baseOffset;

      for (const date of dateList) {
        const seasonal = calculateSeasonalMultiplier(date);
        
        // Fluctuación estocástica diaria controlada (-volatility a +volatility)
        const dailyDrift = 1 + (Math.random() * 2 - 1) * profile.volatility;
        
        // El precio oscila alrededor del precio base ajustado por temporada y margen de tienda
        const targetPrice = prod.basePrice * profile.baseOffset * seasonal;
        runningPrice = runningPrice * 0.85 + targetPrice * 0.15 * dailyDrift;

        // Redondear a números de retail comunes (terminados en 9 o 99)
        const finalPrice = Math.max(Math.round(runningPrice / 10) * 10 - 1, 99);

        pricesByStore[store.name].push({
          date: getIsoDate(date),
          price: finalPrice,
        });
      }
    }

    // Registro completo para mock-data.json
    mockData.push({
      id: prod.id,
      name: prod.name,
      brand: prod.brand,
      model: prod.model,
      storage: prod.storage,
      color: prod.color,
      imageUrl: prod.imageUrl,
      category: prod.category,
      searchText,
      pricesByStore,
    });

    // Entrada simplificada para search-index.json
    searchIndex.push({
      id: prod.id,
      name: prod.name,
      image: prod.imageUrl,
      store: 'amazon',
    });
  }

  // 4. Escritura de archivos
  const fixturesDir = resolve(process.cwd(), 'src', 'fixtures');
  
  writeFileSync(
    resolve(fixturesDir, 'mock-data.json'),
    JSON.stringify(mockData, null, 2),
    'utf-8',
  );

  writeFileSync(
    resolve(fixturesDir, 'search-index.json'),
    JSON.stringify(searchIndex, null, 2),
    'utf-8',
  );

  console.log(`✅ Archivos generados correctamente en: ${fixturesDir}`);
  console.log(`   - mock-data.json: ${mockData.length} productos con 730 días en 4 tiendas.`);
  console.log(`   - search-index.json: ${searchIndex.length} registros planos para búsqueda.`);
}

generateMockData();