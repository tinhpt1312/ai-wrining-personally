import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCascadeDeleteWritingAnalytics1779714000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the old foreign key constraint
    await queryRunner.query(
      `ALTER TABLE "analysis" DROP CONSTRAINT "fk_analysis_writing_id"`,
    );

    // Add new foreign key constraint with CASCADE DELETE
    await queryRunner.query(
      `ALTER TABLE "analysis" ADD CONSTRAINT "fk_analysis_writing_id" FOREIGN KEY ("writing_id") REFERENCES "writings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to the original foreign key constraint
    await queryRunner.query(
      `ALTER TABLE "analysis" DROP CONSTRAINT "fk_analysis_writing_id"`,
    );

    await queryRunner.query(
      `ALTER TABLE "analysis" ADD CONSTRAINT "fk_analysis_writing_id" FOREIGN KEY ("writing_id") REFERENCES "writings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
