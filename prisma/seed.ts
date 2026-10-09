import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STORES = [
    {
        name: "Amazon", countryCode: 'MX', isActive: true
    },
    {
        name: "Walmart", countryCode: 'MX', isActive: true
    },
    {
        name: "mercadoLibre", countryCode: 'MX', isActive: true 
    },
    {
        name: "Liverpool", countryCode: 'MX', isActive: true
    }
];

async function main() {
    console.log('🌱 Iniciando siembra de tiendas...');

    for (const store of STORES) {
        const record = await prisma.store.upsert({
            where: { name: store.name },
            update: {},
            create: {
                name: store.name,
                countryCode: store.countryCode,
                isActive: store.isActive
            }
        });
        console.log(`✅ Tienda ${record.name} insertada o actualizada correctamente.`);
    }
    console.log('🌱 Siembra de tiendas completada.');
}

main().catch((e) => {
    console.error('Error durante la siembra de tiendas:', e);
    process.exit(1);
})
.finally(async () => {
    await prisma.$disconnect();
});