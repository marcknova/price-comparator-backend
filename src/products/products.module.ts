import { Module } from '@nestjs/common';
import { ProductsRepository } from './repositories/products.repository.js';
import { ProductsService } from './products.service.js';
import { ProductsResolver } from './products.resolver.js';
import { PrismaProductsRepository } from './repositories/prisma-products.repository.js';


@Module({
  providers: [
    ProductsResolver,
    ProductsService,
    {
      provide: ProductsRepository,
      useClass: PrismaProductsRepository,
    },
  ],
})
export class ProductsModule {}