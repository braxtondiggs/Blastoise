import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVenueClosureFields1733800000000 implements MigrationInterface {
  name = 'AddVenueClosureFields1733800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add is_closed column with default false
    await queryRunner.query(`
      ALTER TABLE "venues"
      ADD COLUMN IF NOT EXISTS "is_closed" boolean NOT NULL DEFAULT false
    `);

    // Add closed_at timestamp
    await queryRunner.query(`
      ALTER TABLE "venues"
      ADD COLUMN IF NOT EXISTS "closed_at" TIMESTAMP WITH TIME ZONE
    `);

    // Add last_verified_at timestamp
    await queryRunner.query(`
      ALTER TABLE "venues"
      ADD COLUMN IF NOT EXISTS "last_verified_at" TIMESTAMP WITH TIME ZONE
    `);

    // Add index for filtering out closed venues
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_venues_is_closed" ON "venues" ("is_closed")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_venues_is_closed"`);
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN IF EXISTS "last_verified_at"`);
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN IF EXISTS "closed_at"`);
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN IF EXISTS "is_closed"`);
  }
}
