import { Field, Float, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PriceStats {
  @Field(() => Float)
  globalMin: number;

  @Field()
  globalMinDate: string;

  @Field()
  globalMinStore: string;

  @Field(() => Float)
  globalMax: number;

  @Field()
  globalMaxDate: string;

  @Field()
  globalMaxStore: string;

  @Field(() => Float)
  currentPrice: number;

  @Field()
  currentStore: string;

  @Field()
  currency: string;
}