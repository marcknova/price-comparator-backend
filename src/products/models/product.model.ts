import { Field, ID, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class Product {
    @Field(() => ID)
    id: string;

    @Field()
    name: string;
    
    @Field()
    image: string;

    @Field({ nullable: true })
    brand?: string;

    @Field({ nullable: true })
    model?: string;

    @Field({ nullable: true })
    storage?: string;

    @Field({ nullable: true })
    color?: string;

    @Field({ nullable: true })
    category?: string;
}