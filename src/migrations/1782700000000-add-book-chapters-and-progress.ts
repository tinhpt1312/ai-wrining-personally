import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBookChaptersAndProgress1782700000000
  implements MigrationInterface
{
  name = 'AddBookChaptersAndProgress1782700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "books" ADD COLUMN "total_chapters" integer NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      CREATE TABLE "book_chapters" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "book_id" uuid NOT NULL,
        "order_index" integer NOT NULL,
        "title" character varying(255) NOT NULL,
        "content" text NOT NULL,
        "content_format" character varying(20) NOT NULL DEFAULT 'html',
        "word_count" integer,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_book_chapters_id" PRIMARY KEY ("id"),
        CONSTRAINT "fk_book_chapter_book_id" FOREIGN KEY ("book_id")
          REFERENCES "books"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_book_chapters_book_id" ON "book_chapters" ("book_id")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_book_chapters_book_order"
        ON "book_chapters" ("book_id", "order_index")
    `);

    await queryRunner.query(`
      CREATE TABLE "user_book_progress" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "book_id" uuid NOT NULL,
        "current_chapter_id" uuid,
        "scroll_offset" integer NOT NULL DEFAULT 0,
        "percent_complete" numeric(5,2) NOT NULL DEFAULT 0,
        "last_read_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_book_progress_id" PRIMARY KEY ("id"),
        CONSTRAINT "fk_user_book_progress_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_user_book_progress_book_id" FOREIGN KEY ("book_id")
          REFERENCES "books"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_user_book_progress_chapter_id" FOREIGN KEY ("current_chapter_id")
          REFERENCES "book_chapters"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_user_book_progress_user_book"
        ON "user_book_progress" ("user_id", "book_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_user_book_progress_user_book"`);
    await queryRunner.query(`DROP TABLE "user_book_progress"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_book_chapters_book_order"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_book_chapters_book_id"`);
    await queryRunner.query(`DROP TABLE "book_chapters"`);
    await queryRunner.query(`ALTER TABLE "books" DROP COLUMN "total_chapters"`);
  }
}
