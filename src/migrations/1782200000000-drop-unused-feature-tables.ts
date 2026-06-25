import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Drops tables for removed features: daily tips, achievements,
 * gamification (user stats / streaks) and feedback categories.
 * The app now focuses only on writing and AI grading/correction.
 */
export class DropUnusedFeatureTables1782200000000 implements MigrationInterface {
  name = 'DropUnusedFeatureTables1782200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP CONSTRAINT IF EXISTS "FK_36b4a912357ad1342b735d4d4c8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP CONSTRAINT IF EXISTS "FK_c755e3741cd46fc5ae3ef06592c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_tips" DROP CONSTRAINT IF EXISTS "FK_429cf6e6ac9adc1774c7c56ce88"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_stats" DROP CONSTRAINT IF EXISTS "FK_0e0da843088caf61925ded4434e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_streaks" DROP CONSTRAINT IF EXISTS "FK_91fc9bfd912d8ce3ae4be2ea193"`,
    );

    await queryRunner.query(`DROP TABLE IF EXISTS "daily_tips"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_achievements"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "achievements"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_stats"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_streaks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "feedback_categories"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_achievements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "achievement_id" uuid NOT NULL, "progress" integer NOT NULL DEFAULT '0', "is_unlocked" boolean NOT NULL DEFAULT false, "unlocked_at" TIMESTAMP WITH TIME ZONE DEFAULT now(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_3d94aba7e9ed55365f68b5e77fa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "achievements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "key" character varying(100) NOT NULL, "name" character varying(255) NOT NULL, "description" text NOT NULL, "icon_emoji" character varying(10), "badge_color" character varying(20), "points_reward" integer NOT NULL DEFAULT '0', "requirement_type" character varying(100) NOT NULL, "requirement_value" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_4fe946ae1fdbc64abf0c48ecb8a" UNIQUE ("key"), CONSTRAINT "PK_1bc19c37c6249f70186f318d71d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "daily_tips" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "tip_date" date NOT NULL, "category" character varying(100) NOT NULL, "title" character varying(255) NOT NULL, "content" text NOT NULL, "example_before" text, "example_after" text, "based_on_analysis_ids" uuid array, "is_read" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_3a4eac879f09c74d44f57801b49" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "feedback_categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "key" character varying(100) NOT NULL, "name" character varying(255) NOT NULL, "description" text NOT NULL, "icon_emoji" character varying(10), "learning_resources" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_37fd4a85fe671a58ce0256799f7" UNIQUE ("key"), CONSTRAINT "PK_ec074024aa30204b64e43e04254" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_stats" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "total_points" integer NOT NULL DEFAULT '0', "total_submissions" integer NOT NULL DEFAULT '0', "total_word_count" integer NOT NULL DEFAULT '0', "average_score" double precision NOT NULL DEFAULT '0', "current_streak" integer NOT NULL DEFAULT '0', "longest_streak" integer NOT NULL DEFAULT '0', "last_submission_date" TIMESTAMP WITH TIME ZONE, "level" integer NOT NULL DEFAULT '1', "badges_count" integer NOT NULL DEFAULT '0', "improvement_percentage" double precision NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_0e0da843088caf61925ded4434e" UNIQUE ("user_id"), CONSTRAINT "PK_f55fb5b508e96b05303efae93e5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_streaks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "current_streak_count" integer NOT NULL DEFAULT '0', "longest_streak_count" integer NOT NULL DEFAULT '0', "streak_start_date" date, "last_activity_date" date, "total_days_active" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a6d61a62372a94e55ca04ab8373" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `ALTER TABLE "user_achievements" ADD CONSTRAINT "FK_c755e3741cd46fc5ae3ef06592c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" ADD CONSTRAINT "FK_36b4a912357ad1342b735d4d4c8" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_tips" ADD CONSTRAINT "FK_429cf6e6ac9adc1774c7c56ce88" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_stats" ADD CONSTRAINT "FK_0e0da843088caf61925ded4434e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_streaks" ADD CONSTRAINT "FK_91fc9bfd912d8ce3ae4be2ea193" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
