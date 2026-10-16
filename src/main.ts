import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  // Escuchar en 0.0.0.0 para responder tanto a IPv4 (127.0.0.1) como a IPv6 (::1/localhost)
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Servidor GraphQL listo en: http://localhost:${port}/graphql`);
}
await bootstrap();