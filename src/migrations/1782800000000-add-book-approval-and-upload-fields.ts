import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBookApprovalAndUploadFields1782800000000
  implements MigrationInterface
{
  name = 'AddBookApprovalAndUploadFields1782800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "books"
        ADD COLUMN "approval_status" character varying(20) NOT NULL DEFAULT 'approved',
        ADD COLUMN "uploaded_by_user_id" uuid,
        ADD COLUMN "file_format" character varying(10),
        ADD COLUMN "rejection_reason" text
    `);

    await queryRunner.query(`
      ALTER TABLE "books"
        ADD CONSTRAINT "fk_books_uploaded_by_user_id"
        FOREIGN KEY ("uploaded_by_user_id")
        REFERENCES "users"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_books_approval_status" ON "books" ("approval_status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_books_uploaded_by_user_id" ON "books" ("uploaded_by_user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_books_uploaded_by_user_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_books_approval_status"`);
    await queryRunner.query(`
      ALTER TABLE "books" DROP CONSTRAINT "fk_books_uploaded_by_user_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "books"
        DROP COLUMN "rejection_reason",
        DROP COLUMN "file_format",
        DROP COLUMN "uploaded_by_user_id",
        DROP COLUMN "approval_status"
    `);
  }
}
