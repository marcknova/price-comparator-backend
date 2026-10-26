import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const prisma = new PrismaClient();

interface PriceItem {
  date: string;
  price: number;
}

interface ProductFixture {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  storage?: string;
  color?: string;
  category?: string;
  imageUrl: string;
  searchText?: string;
  pricesByStore: {
    amazon?: PriceItem[];
    mercadolibre?: PriceItem[];
    walmart?: PriceItem[];
    liverpool?: PriceItem[];
  };
}

const PRODUCT_UUID_MAP: Record<string, string> = {
  'prod-001': '00000000-0000-0000-0000-000000000001',
  'prod-002': '00000000-0000-0000-0000-000000000002',
  'prod-003': '00000000-0000-0000-0000-000000000003',
  'prod-004': '00000000-0000-0000-0000-000000000004',
  'prod-005': '00000000-0000-0000-0000-000000000005',
};

function getProductUuid(id: string): string {
  if (PRODUCT_UUID_MAP[id]) {
    return PRODUCT_UUID_MAP[id];
  }
  // Fallback determinista RFC 4122 v4-like hash si se agregan más productos
  const hash = createHash('md5').update(id).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

async function main() {
  console.log('🚀 Iniciando siembra masiva de histórico en PostgreSQL (Supabase)...');

  const fixturesPath = resolve(process.cwd(), 'src', 'fixtures', 'mock-data.json');
  const rawData = readFileSync(fixturesPath, 'utf-8');
  const products: ProductFixture[] = JSON.parse(rawData);

  // 1. Obtener el mapa de tiendas existentes en la BD
  const stores = await prisma.store.findMany();
  const storeMap = new Map<string, number>();
  for (const s of stores) {
    storeMap.set(s.name.toLowerCase(), s.id);
  }

  const requiredStores = ['amazon', 'mercadolibre', 'walmart', 'liverpool'];
  for (const slug of requiredStores) {
    if (!storeMap.has(slug)) {
      throw new Error(`La tienda "${slug}" no existe en la base de datos. Ejecuta primero prisma/seed.ts.`);
    }
  }

  // 2. Upsert de los productos base
  console.log('📦 Sincronizando catálogo de productos...');
  for (const p of products) {
    const productUuid = getProductUuid(p.id);
    await prisma.product.upsert({
      where: { uuid: productUuid },
      update: {
        name: p.name,
        brand: p.brand,
        model: p.model,
        storage: p.storage,
        color: p.color,
        category: p.category,
        imageUrl: p.imageUrl,
        searchText: p.searchText,
      },
      create: {
        uuid: productUuid,
        name: p.name,
        brand: p.brand,
        model: p.model,
        storage: p.storage,
        color: p.color,
        category: p.category,
        imageUrl: p.imageUrl,
        searchText: p.searchText,
      },
    });
  }

  // 3. Preparar filas de precios y ejecutar en bloques (chunks) de 1,000
  console.log('⏳ Limpiando registros históricos previos para evitar duplicados...');
  await prisma.price.deleteMany();

  console.log('📊 Generando lote de registros de precios...');
  const recordsToInsert: Array<{
    productUuid: string;
    storeId: number;
    priceAmount: number;
    time: Date;
    currency: string;
    isCurrent: boolean;
  }> = [];

  for (const p of products) {
    const productUuid = getProductUuid(p.id);

    for (const [storeSlug, priceList] of Object.entries(p.pricesByStore)) {
      const storeId = storeMap.get(storeSlug.toLowerCase());
      if (!storeId || !priceList || priceList.length === 0) continue;

      // Identificar la fecha más reciente para asignar isCurrent = true
      let maxDate = priceList[0].date;
      for (const item of priceList) {
        if (item.date > maxDate) {
          maxDate = item.date;
        }
      }

      for (const item of priceList) {
        recordsToInsert.push({
          productUuid,
          storeId,
          priceAmount: item.price,
          time: new Date(`${item.date}T00:00:00.000Z`),
          currency: 'MXN',
          isCurrent: item.date === maxDate,
        });
      }
    }
  }

  const CHUNK_SIZE = 1000;
  for (let i = 0; i < recordsToInsert.length; i += CHUNK_SIZE) {
    const chunk = recordsToInsert.slice(i, i + CHUNK_SIZE);
    await prisma.price.createMany({
      data: chunk,
    });
    console.log(`   -> Insertados ${Math.min(i + CHUNK_SIZE, recordsToInsert.length)} / ${recordsToInsert.length} registros`);
  }

  console.log('✅ Siembra completada exitosamente en Supabase.');
}

main()
  .catch((e) => {
    console.error('❌ Error en el proceso de siembra:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
