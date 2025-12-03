import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOnboardingCompleted1732900000000 implements MigrationInterface {
  name = 'AddOnboardingCompleted1732900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "onboarding_completed" boolean NOT NULL DEFAULT false`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "onboarding_completed"`
    );
  }
}
