# Registro de Auditorías de Código (Audit Log)

Este archivo documenta de forma cronológica todas las auditorías técnicas realizadas en el repositorio, incluyendo los hallazgos iniciales del auditor (`code-reviewer`), las correcciones aplicadas y el veredicto final.

---

## Índice de Auditorías

| Fecha | Componente / Archivo | Veredicto Inicial | Veredicto Final | Auditor |
| :--- | :--- | :---: | :---: | :--- |
| **2026-10-25** | [`src/products/repositories/prisma-products.repository.ts`](file:///mnt/disco-local/Proyects/compared-products/price-comparator-backend/src/products/repositories/prisma-products.repository.ts) | ⚠️ `NEEDS_WORK` | ✅ `APPROVED` | `code-reviewer` |

---

## Detalle de Auditorías

### Auditoría #1 — 2026-10-25: `PrismaProductsRepository`

- **Archivo auditado:** [`src/products/repositories/prisma-products.repository.ts`](file:///mnt/disco-local/Proyects/compared-products/price-comparator-backend/src/products/repositories/prisma-products.repository.ts)
- **Suite de pruebas:** [`src/products/repositories/prisma-products.repository.spec.ts`](file:///mnt/disco-local/Proyects/compared-products/price-comparator-backend/src/products/repositories/prisma-products.repository.spec.ts)
- **Esquema de referencia:** [`prisma/schema.prisma`](file:///mnt/disco-local/Proyects/compared-products/price-comparator-backend/prisma/schema.prisma)
- **Auditor:** Subagente especialista `code-reviewer`

#### 1. Diagnóstico Inicial y Alineación con Prisma
- El repositorio contenía referencias desactualizadas (`id`, `priceRecords`, `date`, `price`) incompatibles con los tipos generados de Prisma (`uuid`, `prices`, `time`, `priceAmount: Decimal`).
- Se reestructuró la consulta de `search` y `findById` para concordar con el modelo relacional y la especificación en los tests.

#### 2. Hallazgos de la Primera Auditoría (`NEEDS_WORK`)
1. **Sensibilidad a mayúsculas en identificadores:**
   `PROD-001` no coincidía con las llaves en minúsculas de `PRODUCT_UUID_MAP`. Al pasar al fallback de hash MD5 determinista (`getDeterministicUuid`), producía un UUID distinto al mapeado oficial.
2. **Coerción silenciosa de `null`/`""` a precio `0`:**
   `Number(null)` y `Number("")` en JavaScript evalúan a `0`, lo que registraba precios de `$0.00` y alteraba las estadísticas en `ProductsService.computeStats` (`globalMin`).
3. **Conversión indebida de `null` en fechas:**
   `new Date(null)` generaba la época Unix (`"1970-01-01"`). Además, faltaba comprobación para registros nulos en `product.prices`.
4. **Falta de límite de longitud en `search`:**
   Cadenas extensas podían generar sobrecarga en PostgreSQL ejecutando comparaciones `contains: term, mode: 'insensitive'`.

#### 3. Cambios Implementados
- **Normalización canónica de IDs:** Se aplicó `trimmedId.toLowerCase()` al inicio de `findById`, homogeneizando la validación para `UUID_REGEX`, `PRODUCT_UUID_MAP` y `LEGACY_ID_REGEX`.
- **Filtro estricto contra nulos:** Descarte explícito antes de procesar:
  ```typescript
  if (
    !record ||
    !record.time ||
    record.priceAmount == null ||
    (typeof record.priceAmount === 'string' &&
      (record.priceAmount as string).trim() === '')
  ) {
    continue;
  }
  ```
- **Validación numérica estricta:** Sustitución de `as any` por tipado seguro `{ toNumber?: () => number }` y validación de número finito no negativo: `!isNaN(price) && Number.isFinite(price) && price >= 0`.
- **Mitigación DoS:** Truncamiento de término de búsqueda a 100 caracteres (`query.trim().slice(0, 100)`).
- **Ampliación de pruebas:** Se añadieron 3 casos de prueba en `prisma-products.repository.spec.ts` para mayúsculas (`PROD-001`), descarte de nulos/vacíos/negativos y consultas largas.

#### 4. Veredicto Final
> **✅ APPROVED**
- **Pruebas unitarias:** 11/11 tests superados exitosamente (`npm test`).
- **Compilación TypeScript:** Exitosa sin errores (`npm run build`).
- **Análisis estático:** 0 errores y 0 advertencias (`npm run lint` / `oxlint`).
