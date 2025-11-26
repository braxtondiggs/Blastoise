/**
 * TypeORM Configuration for NestJS Application
 *
 * This is used by TypeOrmModule.forRootAsync in app.module.ts
 * It reuses the shared database configuration and adds NestJS-specific options.
 */
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';

export const getTypeOrmConfig = (
  configService: ConfigService
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get('DATABASE_HOST', 'localhost'),
  port: configService.get('DATABASE_PORT', 5432),
  username: configService.get('DATABASE_USERNAME', 'postgres'),
  password: configService.get('DATABASE_PASSWORD', 'postgres'),
  database: configService.get('DATABASE_NAME', 'brewery_tracker'),
  // Auto-discover entities registered via forFeature()
  autoLoadEntities: true,
  // NEVER use synchronize in production - use migrations instead
  synchronize: false,
  // Run migrations automatically on app start
  migrationsRun: true,
  // Migration files location
  migrations: [path.join(__dirname, '../migrations/*{.ts,.js}')],
  migrationsTableName: 'migrations',
  // Logging
  logging: configService.get('NODE_ENV') === 'development',
});
