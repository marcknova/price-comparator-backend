import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'path/win32';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { PingResolver } from './ping.resolver.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({ 
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src', 'schema.gql'),
      sortSchema: true,
      graphiql: true,
    }),
  ],
  providers: [PingResolver],
})
export class AppModule {}
 