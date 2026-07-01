import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Book } from './books.entity';

@Entity({ name: 'book_chapters', schema: 'public' })
export class BookChapter {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'book_id', type: 'uuid', nullable: false })
  bookId!: string;

  @Column({ name: 'order_index', type: 'integer', nullable: false })
  orderIndex!: number;

  @Column({
    name: 'title',
    type: 'character varying',
    length: 255,
    nullable: false,
  })
  title!: string;

  @Column({ name: 'content', type: 'text', nullable: false })
  content!: string;

  @Column({
    name: 'content_format',
    type: 'character varying',
    length: 20,
    nullable: false,
    default: 'html',
  })
  contentFormat!: string;

  @Column({ name: 'word_count', type: 'integer', nullable: true })
  wordCount?: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @ManyToOne(() => Book, (book) => book.chapters, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'book_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_book_chapter_book_id',
  })
  book!: Book;
}
