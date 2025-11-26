import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial database schema migration for Brewery Tracker.
 *
 * Creates all core tables:
 * - users: User accounts with password authentication
 * - refresh_tokens: JWT refresh token storage
 * - password_reset_tokens: Password reset flow tokens
 * - venues: Breweries and wineries
 * - visits: User visits to venues
 * - user_preferences: User settings
 * - shared_visits: Public sharing links
 * - import_history: Google Timeline import tracking
 */
export class InitialSchema1732600000000 implements MigrationInterface {
  name = 'InitialSchema1732600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================================
    // Authentication Tables
    // ========================================

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" varchar(255) UNIQUE NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_users_email" ON "users"("email")`);

    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "token_hash" varchar(64) UNIQUE NOT NULL,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "expires_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "revoked_at" timestamptz
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_refresh_tokens_token_hash" ON "refresh_tokens"("token_hash")`);
    await queryRunner.query(`CREATE INDEX "idx_refresh_tokens_user_id" ON "refresh_tokens"("user_id")`);
    await queryRunner.query(`CREATE INDEX "idx_refresh_tokens_expires_at" ON "refresh_tokens"("expires_at")`);

    await queryRunner.query(`
      CREATE TABLE "password_reset_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "token_hash" varchar(64) UNIQUE NOT NULL,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "expires_at" timestamptz NOT NULL,
        "used" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_password_reset_tokens_token_hash" ON "password_reset_tokens"("token_hash")`);
    await queryRunner.query(`CREATE INDEX "idx_password_reset_tokens_user_id" ON "password_reset_tokens"("user_id")`);

    // ========================================
    // Core Domain Tables
    // ========================================

    await queryRunner.query(`
      CREATE TABLE "venues" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(200) NOT NULL,
        "address" varchar(500),
        "city" varchar(100),
        "state" varchar(50),
        "country" varchar(50),
        "postal_code" varchar(20),
        "latitude" decimal(10, 7) NOT NULL,
        "longitude" decimal(10, 7) NOT NULL,
        "venue_type" varchar(20) NOT NULL,
        "source" varchar(20) NOT NULL DEFAULT 'manual',
        "source_id" varchar(255),
        "google_place_id" varchar(255) UNIQUE,
        "verification_tier" smallint CHECK ("verification_tier" IN (1, 2, 3)),
        "metadata" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_venues_name" ON "venues"("name")`);
    await queryRunner.query(`CREATE INDEX "idx_venues_location" ON "venues"("latitude", "longitude")`);
    await queryRunner.query(`CREATE INDEX "idx_venues_google_place_id" ON "venues"("google_place_id") WHERE "google_place_id" IS NOT NULL`);
    await queryRunner.query(`CREATE INDEX "idx_venues_source" ON "venues"("source")`);

    await queryRunner.query(`
      CREATE TABLE "visits" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "venue_id" uuid NOT NULL REFERENCES "venues"("id") ON DELETE CASCADE,
        "arrival_time" timestamptz NOT NULL,
        "departure_time" timestamptz,
        "duration_minutes" integer,
        "is_active" boolean NOT NULL DEFAULT true,
        "detection_method" varchar(20) NOT NULL DEFAULT 'manual',
        "source" varchar(20) DEFAULT 'manual',
        "imported_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_visits_user_id" ON "visits"("user_id")`);
    await queryRunner.query(`CREATE INDEX "idx_visits_venue_id" ON "visits"("venue_id")`);
    await queryRunner.query(`CREATE INDEX "idx_visits_arrival_time" ON "visits"("arrival_time")`);
    await queryRunner.query(`CREATE INDEX "idx_visits_user_arrival" ON "visits"("user_id", "arrival_time")`);
    await queryRunner.query(`CREATE INDEX "idx_visits_source" ON "visits"("source")`);

    // ========================================
    // User Settings Table
    // ========================================

    await queryRunner.query(`
      CREATE TABLE "user_preferences" (
        "user_id" uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
        "location_tracking_enabled" boolean NOT NULL DEFAULT true,
        "background_tracking_enabled" boolean NOT NULL DEFAULT false,
        "sharing_preference" varchar(20) NOT NULL DEFAULT 'ask',
        "data_retention_months" integer,
        "notifications_enabled" boolean NOT NULL DEFAULT true,
        "notification_preferences" jsonb NOT NULL DEFAULT '{}',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    // ========================================
    // Sharing Table
    // ========================================

    await queryRunner.query(`
      CREATE TABLE "shared_visits" (
        "id" varchar(64) PRIMARY KEY,
        "visit_id" uuid NOT NULL REFERENCES "visits"("id") ON DELETE CASCADE,
        "venue_name" varchar(200) NOT NULL,
        "venue_city" varchar(100),
        "visit_date" date NOT NULL,
        "shared_at" timestamptz NOT NULL DEFAULT now(),
        "expires_at" timestamptz,
        "view_count" integer NOT NULL DEFAULT 0
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_shared_visits_visit_id" ON "shared_visits"("visit_id")`);

    // ========================================
    // Import History Table
    // ========================================

    await queryRunner.query(`
      CREATE TABLE "import_history" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "source" varchar(50) NOT NULL DEFAULT 'google_timeline',
        "imported_at" timestamptz NOT NULL DEFAULT now(),
        "file_name" varchar(255),
        "job_id" varchar(100),
        "total_places" integer NOT NULL DEFAULT 0,
        "visits_created" integer NOT NULL DEFAULT 0,
        "visits_skipped" integer NOT NULL DEFAULT 0,
        "new_venues_created" integer NOT NULL DEFAULT 0,
        "existing_venues_matched" integer,
        "processing_time_ms" integer,
        "metadata" jsonb
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_import_history_user_id" ON "import_history"("user_id")`);
    await queryRunner.query(`CREATE INDEX "idx_import_history_imported_at" ON "import_history"("imported_at" DESC)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "import_history" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "shared_visits" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_preferences" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "visits" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "venues" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "password_reset_tokens" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);
  }
}
