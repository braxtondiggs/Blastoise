/**
 * TypeORM Configuration for NestJS Application
 *
 * This is used by TypeOrmModule.forRootAsync in app.module.ts
 * It reuses the shared database configuration and adds NestJS-specific options.
 */
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

// Import migrations directly so they're bundled by webpack
import { InitialSchema1732600000000 } from '../migrations/1732600000000-InitialSchema';
import { AddOnboardingCompleted1732900000000 } from '../migrations/1732900000000-AddOnboardingCompleted';

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
  // Migrations are imported directly to work with webpack bundling
  migrations: [InitialSchema1732600000000, AddOnboardingCompleted1732900000000],
  migrationsTableName: 'migrations',
  // Logging
  logging: configService.get('NODE_ENV') === 'development',
});
