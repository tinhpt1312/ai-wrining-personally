import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './users.entity';
import { Book } from './books.entity';
import { BookChapter } from './book-chapter.entity';

@Entity({ name: 'user_book_progress', schema: 'public' })
export class UserBookProgress {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: false })
  userId!: string;

  @Column({ name: 'book_id', type: 'uuid', nullable: false })
  bookId!: string;

  @Column({ name: 'current_chapter_id', type: 'uuid', nullable: true })
  currentChapterId?: string | null;

  @Column({ name: 'scroll_offset', type: 'integer', nullable: false, default: 0 })
  scrollOffset!: number;

  @Column({
    name: 'percent_complete',
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: false,
    default: 0,
  })
  percentComplete!: number;

  @Column({
    name: 'last_read_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  lastReadAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_user_book_progress_user_id',
  })
  user!: User;

  @ManyToOne(() => Book, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'book_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_user_book_progress_book_id',
  })
  book!: Book;

  @ManyToOne(() => BookChapter, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({
    name: 'current_chapter_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_user_book_progress_chapter_id',
  })
  currentChapter?: BookChapter | null;
}
