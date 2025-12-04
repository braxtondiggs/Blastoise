import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveDetectionMethod1733300000000 implements MigrationInterface {
  name = 'RemoveDetectionMethod1733300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, migrate any null source values based on detection_method
    await queryRunner.query(`
      UPDATE visits
      SET source = CASE
        WHEN detection_method = 'auto' THEN 'auto_detect'
        WHEN detection_method = 'manual' THEN 'manual'
        ELSE 'auto_detect'
      END
      WHERE source IS NULL
    `);

    // Make source NOT NULL with default
    await queryRunner.query(`
      ALTER TABLE visits
      ALTER COLUMN source SET NOT NULL,
      ALTER COLUMN source SET DEFAULT 'auto_detect'
    `);

    // Drop the detection_method column
    await queryRunner.query(`
      ALTER TABLE visits DROP COLUMN IF EXISTS detection_method
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add detection_method column back
    await queryRunner.query(`
      ALTER TABLE visits
      ADD COLUMN detection_method varchar(20) NOT NULL DEFAULT 'manual'
    `);

    // Migrate source back to detection_method
    await queryRunner.query(`
      UPDATE visits
      SET detection_method = CASE
        WHEN source = 'auto_detect' THEN 'auto'
        ELSE 'manual'
      END
    `);

    // Make source nullable again
    await queryRunner.query(`
      ALTER TABLE visits
      ALTER COLUMN source DROP NOT NULL,
      ALTER COLUMN source DROP DEFAULT
    `);
  }
}
