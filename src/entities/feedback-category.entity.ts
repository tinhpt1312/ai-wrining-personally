import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'feedback_categories', schema: 'public' })
export class FeedbackCategory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'key',
    type: 'character varying',
    length: 100,
    unique: true,
    nullable: false,
  })
  key!: string; // GRAMMAR, VOCABULARY, STRUCTURE, PUNCTUATION, STYLE, TONE, CLARITY

  @Column({
    name: 'name',
    type: 'character varying',
    length: 255,
    nullable: false,
  })
  name!: string;

  @Column({
    name: 'description',
    type: 'text',
    nullable: false,
  })
  description!: string;

  @Column({
    name: 'icon_emoji',
    type: 'character varying',
    length: 10,
    nullable: true,
  })
  iconEmoji?: string;

  @Column({
    name: 'learning_resources',
    type: 'jsonb',
    nullable: true,
  })
  learningResources?: {
    tips?: string[];
    exercises?: { title: string; description: string }[];
  };

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp with time zone',
  })
  updatedAt!: Date;
}
