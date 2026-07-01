import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBooksTable1782600000000 implements MigrationInterface {
  name = 'AddBooksTable1782600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "books" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying(255) NOT NULL,
        "author" character varying(255) NOT NULL,
        "description" text,
        "cover_url" character varying(500),
        "category" character varying(100) NOT NULL,
        "tags" jsonb NOT NULL DEFAULT '[]',
        "source_type" character varying(50) NOT NULL DEFAULT 'external_link',
        "external_url" character varying(500),
        "writing_types" jsonb NOT NULL DEFAULT '[]',
        "reading_time_minutes" integer,
        "is_public" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_books_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_books_category" ON "books" ("category")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_books_is_public" ON "books" ("is_public")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_books_is_public"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_books_category"`);
    await queryRunner.query(`DROP TABLE "books"`);
  }
}
