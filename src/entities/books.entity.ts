import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BookChapter } from './book-chapter.entity';

@Entity({ name: 'books', schema: 'public' })
export class Book {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'title',
    type: 'character varying',
    length: 255,
    nullable: false,
  })
  title!: string;

  @Column({
    name: 'author',
    type: 'character varying',
    length: 255,
    nullable: false,
  })
  author!: string;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
  })
  description?: string | null;

  @Column({
    name: 'cover_url',
    type: 'character varying',
    length: 500,
    nullable: true,
  })
  coverUrl?: string | null;

  @Column({
    name: 'category',
    type: 'character varying',
    length: 100,
    nullable: false,
  })
  category!: string;

  @Column({
    name: 'tags',
    type: 'jsonb',
    nullable: false,
    default: () => "'[]'",
  })
  tags!: string[];

  @Column({
    name: 'source_type',
    type: 'character varying',
    length: 50,
    nullable: false,
    default: 'external_link',
  })
  sourceType!: string;

  @Column({
    name: 'external_url',
    type: 'character varying',
    length: 500,
    nullable: true,
  })
  externalUrl?: string | null;

  @Column({
    name: 'writing_types',
    type: 'jsonb',
    nullable: false,
    default: () => "'[]'",
  })
  writingTypes!: string[];

  @Column({
    name: 'reading_time_minutes',
    type: 'integer',
    nullable: true,
  })
  readingTimeMinutes?: number | null;

  @Column({
    name: 'is_public',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  isPublic!: boolean;

  @Column({
    name: 'total_chapters',
    type: 'integer',
    nullable: false,
    default: 0,
  })
  totalChapters!: number;

  @Column({
    name: 'approval_status',
    type: 'character varying',
    length: 20,
    nullable: false,
    default: 'approved',
  })
  approvalStatus!: string;

  @Column({
    name: 'uploaded_by_user_id',
    type: 'uuid',
    nullable: true,
  })
  uploadedByUserId?: string | null;

  @Column({
    name: 'file_format',
    type: 'character varying',
    length: 10,
    nullable: true,
  })
  fileFormat?: string | null;

  @Column({
    name: 'rejection_reason',
    type: 'text',
    nullable: true,
  })
  rejectionReason?: string | null;

  @OneToMany(() => BookChapter, (chapter) => chapter.book)
  chapters!: BookChapter[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
