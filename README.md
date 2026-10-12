# Price Comparator Backend

Backend de un comparador de precios desarrollado con NestJS, GraphQL y Prisma. El proyecto está pensado para servir como base para consultar productos, comparar precios entre distintas tiendas y revisar el historial de costos de un mismo artículo.

> Estado actual: proyecto en desarrollo activo. La estructura base ya está implementada, pero aún se está definiendo la capa de persistencia real, la integración con fuentes de datos externas y la finalización de funcionalidades más avanzadas.

## ¿De qué trata este proyecto?

Este backend busca centralizar la lógica para:

- buscar productos por nombre o palabra clave,
- consultar el detalle de un producto concreto,
- comparar precios por tienda,
- analizar el precio mínimo, máximo y actual de un producto,
- preparar la base para conectar datos reales de marketplaces o tiendas en línea.

La idea general es crear una API que pueda servir a una aplicación frontend (web o móvil) para mostrar comparaciones de precios de forma clara y reutilizable.

## Arquitectura actual

El proyecto usa una estructura NestJS con los siguientes bloques principales:

- `src/app.module.ts`: módulo raíz de la aplicación.
- `src/products/`: módulo encargado de productos y comparativas.
- `src/fixtures/`: datos de ejemplo utilizados como mock para pruebas y desarrollo.
- `prisma/schema.prisma`: definición de modelos de base de datos (`Product`, `Store`, `Price`).
- `prisma/seed.ts`: script para inicializar tiendas base.

## Funcionalidad actual

Actualmente el backend expone consultas GraphQL relacionadas con productos. Entre las principales se encuentran:

- `searchProducts(query: String!)`: busca productos por texto.
- `productDetail(id: ID!)`: devuelve el detalle de un producto y su historial de precios.

### Modelo de datos

El proyecto tiene una lógica de productos y precios basada en estos modelos:

- `Product`: información base del artículo.
- `Store`: tiendas o marketplaces soportados.
- `Price`: historial de precios por producto y tienda.

También se consideran campos como:

- nombre
- marca
- modelo
- almacenamiento
- color
- categoría
- imagen
- historial de precios por fecha

## Estructura del proyecto

```bash
.
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── src/
│   ├── app.module.ts
│   ├── fixtures/
│   │   ├── mock-data.json
│   │   └── search-index.json
│   ├── products/
│   │   ├── models/
│   │   ├── repositories/
│   │   ├── products.module.ts
│   │   ├── products.resolver.ts
│   │   └── products.service.ts
│   ├── ping.resolver.ts
│   └── schema.gql
├── package.json
├── tsconfig.json
├── .env
├── README.md
└── ...
```

## Tecnologías utilizadas

- Node.js
- TypeScript
- NestJS
- GraphQL
- Prisma
- PostgreSQL (preparado en schema)
- Vitest (para pruebas)

## Requisitos

Antes de ejecutar el proyecto asegúrate de tener instalado:

- Node.js 18+
- npm o pnpm
- PostgreSQL (si vas a usar Prisma con base de datos real)

## Instalación

```bash
npm install
```

## Variables de entorno

Crea un archivo `.env` con la configuración de Prisma y la base de datos. Un ejemplo básico sería:

```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/price_comparator?schema=public"
DIRECT_URL="postgresql://usuario:password@localhost:5432/price_comparator?schema=public"
```

## Ejecutar el proyecto

### Desarrollo

```bash
npm run start
```

### Modo observador

```bash
npm run start:dev
```

### Producción

```bash
npm run build
npm run start:prod
```

## Scripts disponibles

```bash
npm run test        # ejecuta pruebas
npm run test:watch  # pruebas en modo watch
npm run test:cov    # cobertura
npm run lint        # validación con oxlint
npm run build       # compilación del backend
npm run generate-mock # generación de datos de ejemplo
```

## Pruebas

El proyecto ya incluye una configuración de pruebas con Vitest. Se usa para validar la lógica del backend y facilitar cambios futuros.

```bash
npm run test
```

## Datos actuales

La aplicación actualmente usa información mockeada dentro de `src/fixtures/` para simular productos y búsqueda. Esto permite desarrollar y validar el comportamiento del API antes de conectar fuentes de datos reales.

Esto es especialmente útil para:

- definir el contrato del API,
- validar consultas GraphQL,
- establecer el flujo de comparación de precios,
- preparar la integración con tiendas reales.

## Roadmap sugerido

Este proyecto sigue en proceso y puede evolucionar en varias direcciones:

1. Integración real con APIs de tiendas y marketplaces.
2. Persistencia completa con Prisma y PostgreSQL.
3. Scraping o sincronización automática de precios.
4. Autenticación y autorización.
5. Endpoints adicionales para historial, alertas y favoritos.
6. Dashboard de análisis de precios y tendencias.
7. Optimización de consultas y caché.

## Nota importante

Este repositorio aún no está en una versión final de producción. La base funcional ya existe, pero la capa de negocio, integración y datos reales están en evolución.

Si quieres participar o continuar con el desarrollo, este proyecto sirve como base sólida para construir un comparador de precios más completo.

## Licencia

Este proyecto aún no define una licencia específica en el código base. Se recomienda revisar este punto antes de compartirlo públicamente o usarlo en producción.
