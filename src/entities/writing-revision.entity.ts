import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Writing } from './writings.entity';

export type WritingRevisionSource =
  | 'manual'
  | 'suggestions'
  | 'sample'
  | 'revision_workspace'
  | 'grading_baseline';

@Entity({ name: 'writing_revisions', schema: 'public' })
export class WritingRevision {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'writing_id', type: 'uuid', nullable: false })
  writingId!: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: false })
  userId!: string;

  @Column({ name: 'content', type: 'text', nullable: false })
  content!: string;

  @Column({
    name: 'source',
    type: 'character varying',
    length: 50,
    default: 'manual',
  })
  source!: WritingRevisionSource;

  @Column({ name: 'analysis_id', type: 'uuid', nullable: true })
  analysisId?: string | null;

  @Column({ name: 'parent_revision_id', type: 'uuid', nullable: true })
  parentRevisionId?: string | null;

  @Column({ name: 'revision_number', type: 'integer', nullable: false })
  revisionNumber!: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
  })
  createdAt!: Date;

  @ManyToOne(() => Writing, (writing) => writing.revisions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'writing_id' })
  writing?: Writing;
}
