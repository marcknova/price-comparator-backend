import { Module } from '@nestjs/common';
import { ProductsRepository } from './repositories/products.repository.js';
import { JsonProductsRepository } from './repositories/json-products.repository.js';
import { ProductsService } from './products.service.js';
import { ProductsResolver } from './products.resolver.js';


@Module({
  providers: [
    ProductsResolver,
    ProductsService,
    {
      provide: ProductsRepository,
      useClass: JsonProductsRepository,
    },
  ],
})
export class ProductsModule {}