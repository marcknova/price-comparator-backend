import { Field, ID, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class SearchResult {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  image: string;

  @Field()
  store: string;
}