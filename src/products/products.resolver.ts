import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { SearchResult } from './models/search-result.model.js';
import { ProductDetail } from './models/product-detail.model.js';
import { ProductsService } from './products.service.js';


@Resolver()
export class ProductsResolver {
  constructor(private readonly productsService: ProductsService) {}

  @Query(() => [SearchResult], { name: 'searchProducts' })
  async searchProducts(@Args('query') query: string): Promise<SearchResult[]> {
    return this.productsService.search(query);
  }

  @Query(() => ProductDetail, { name: 'productDetail' })
  async productDetail(@Args('id', { type: () => ID }) id: string): Promise<ProductDetail> {
    return this.productsService.getDetail(id);
  }
}