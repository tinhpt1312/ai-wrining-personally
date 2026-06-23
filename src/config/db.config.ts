import { Injectable } from '@nestjs/common';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { ENV } from './env.config';
import { config } from 'dotenv';

config();

function isLocalDatabase(host?: string): boolean {
  return !host || host === 'localhost' || host === '127.0.0.1';
}

function buildSharedDatabaseOptions(): DataSourceOptions {
  const useSsl = !isLocalDatabase(ENV.DATABASE.HOST);
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    type: 'postgres',
    host: ENV.DATABASE.HOST,
    port: ENV.DATABASE.PORT,
    username: ENV.DATABASE.USERNAME,
    password: ENV.DATABASE.PASSWORD,
    database: ENV.DATABASE.DATABASE,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    logging: !isProduction,
    synchronize: false,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    extra: useSsl
      ? {
          max: 1,
          idleTimeoutMillis: 20_000,
          connectionTimeoutMillis: 10_000,
        }
      : undefined,
  };
}

export default new DataSource(buildSharedDatabaseOptions());

@Injectable()
export class PostgresConfiguration implements TypeOrmOptionsFactory {
  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      ...buildSharedDatabaseOptions(),
      autoLoadEntities: true,
    };
  }
}
