/**
 * TypeORM CLI Migration Configuration
 *
 * This DataSource is used exclusively by the TypeORM CLI for:
 * - Generating migrations: npm run migration:generate
 * - Running migrations: npm run migration:run
 * - Reverting migrations: npm run migration:revert
 *
 * Usage (from project root):
 *   npm run migration:run
 *   npm run migration:revert
 *   npm run migration:generate -- src/migrations/MigrationName
 *   npm run migration:show
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { DataSource } from 'typeorm';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the api .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export default new DataSource({
  type: 'postgres',
  host: process.env['DATABASE_HOST'] || 'localhost',
  port: parseInt(process.env['DATABASE_PORT'] || '5432', 10),
  username: process.env['DATABASE_USERNAME'] || 'postgres',
  password: process.env['DATABASE_PASSWORD'] || 'postgres',
  database: process.env['DATABASE_NAME'] || 'brewery_tracker',
  // Entities are not needed for running migrations (only for generating)
  entities: [],
  // Migration files using glob pattern
  migrations: [path.resolve(__dirname, '../migrations/*.ts')],
  migrationsTableName: 'migrations',
  // Never sync in CLI - use migrations
  synchronize: false,
  logging: true,
});
