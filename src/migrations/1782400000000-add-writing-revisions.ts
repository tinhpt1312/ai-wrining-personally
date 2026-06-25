import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWritingRevisions1782400000000 implements MigrationInterface {
  name = 'AddWritingRevisions1782400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "writing_revisions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "writing_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "content" text NOT NULL,
        "source" character varying(50) NOT NULL DEFAULT 'manual',
        "analysis_id" uuid,
        "parent_revision_id" uuid,
        "revision_number" integer NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_writing_revisions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_writing_revisions_writing_id" FOREIGN KEY ("writing_id")
          REFERENCES "writings"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_writing_revisions_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_writing_revisions_writing_id" ON "writing_revisions" ("writing_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_writing_revisions_user_id" ON "writing_revisions" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_writing_revisions_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_writing_revisions_writing_id"`,
    );
    await queryRunner.query(`DROP TABLE "writing_revisions"`);
  }
}
