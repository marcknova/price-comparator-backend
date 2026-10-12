import { Field, ObjectType } from '@nestjs/graphql';
import { Product } from './product.model.js';
import { PricePoint } from './price-point.model.js';
import { PriceStats } from './price-stats.model.js';

@ObjectType()
export class ProductDetail {
  @Field(() => Product)
  product: Product;

  @Field(() => [PricePoint])
  history: PricePoint[];

  @Field(() => PriceStats)
  stats: PriceStats;
}