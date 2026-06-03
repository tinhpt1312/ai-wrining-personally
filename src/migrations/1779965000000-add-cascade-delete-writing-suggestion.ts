import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCascadeDeleteWritingSuggestion1779965000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the old foreign key constraint
    await queryRunner.query(
      `ALTER TABLE "writing_suggestions" DROP CONSTRAINT "FK_20ce53d09a70711652c9974ddd1"`,
    );

    // Add new foreign key constraint with CASCADE DELETE
    await queryRunner.query(
      `ALTER TABLE "writing_suggestions" ADD CONSTRAINT "FK_20ce53d09a70711652c9974ddd1" FOREIGN KEY ("writing_id") REFERENCES "writings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to the original foreign key constraint
    await queryRunner.query(
      `ALTER TABLE "writing_suggestions" DROP CONSTRAINT "FK_20ce53d09a70711652c9974ddd1"`,
    );

    await queryRunner.query(
      `ALTER TABLE "writing_suggestions" ADD CONSTRAINT "FK_20ce53d09a70711652c9974ddd1" FOREIGN KEY ("writing_id") REFERENCES "writings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
