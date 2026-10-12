import { Field, Float, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PricePoint {
  @Field()
  date: string; 

  @Field(() => Float, { nullable: true })
  amazon?: number;

  @Field(() => Float, { nullable: true })
  mercadolibre?: number;

  @Field(() => Float, { nullable: true })
  walmart?: number;

  @Field(() => Float, { nullable: true })
  liverpool?: number;
}