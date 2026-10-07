import { Query, Resolver } from '@nestjs/graphql';

@Resolver()
export class PingResolver {
  @Query(() => String, { description: 'Health check query' })
  ping(): string {
    return 'pong';
  }
}