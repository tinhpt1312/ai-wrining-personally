import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWritingOutlineJson1782500000000 implements MigrationInterface {
  name = 'AddWritingOutlineJson1782500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "writings"
      ADD COLUMN "outline_json" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "writings"
      DROP COLUMN "outline_json"
    `);
  }
}
