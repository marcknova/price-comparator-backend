import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'node:path';
import { PingResolver } from './ping.resolver.js';
import { ProductsModule } from './products/products.module.js';
import { createObserveModule } from '@nestjs/observe';


export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src', 'schema.gql'),
      sortSchema: true,
      graphiql: true,
    }),
    ProductsModule,
  ],
  providers: [PingResolver],
})
export class AppModule {}