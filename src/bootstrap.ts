import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import type { Express } from 'express';
import express from 'express';
import { AppModule } from './app.module';
import { ENV, setupSwagger } from './config';
import { CORS_OPTIONS } from './constants';

export async function createNestExpressApp(): Promise<Express> {
  const expressApp = express();
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
  );

  app.enableCors(CORS_OPTIONS);
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  setupSwagger(app);

  await app.init();
  return expressApp;
}

export async function startHttpServer(): Promise<void> {
  const expressApp = await createNestExpressApp();
  await expressApp.listen(ENV.APP_PORT ?? 8000);
}
