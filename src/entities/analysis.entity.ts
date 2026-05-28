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
import { Writing } from './writings.entity';

@Entity({ name: 'analysis', schema: 'public' })
export class Analytics {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'writing_id',
    type: 'uuid',
    nullable: false,
  })
  writingId!: string;

  @Column({
    name: 'user_id',
    type: 'uuid',
    nullable: false,
  })
  userId!: string;

  @Column({
    name: 'feedback_json',
    type: 'jsonb',
    nullable: true,
  })
  feedbackJson?: object;

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

  // Relations
  @ManyToOne(() => Writing, (writing) => writing.analyses)
  @JoinColumn({
    name: 'writing_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_analysis_writing_id',
  })
  writing!: Writing;

  @ManyToOne(() => User, (user) => user.analyses)
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_analysis_user_id',
  })
  user!: User;
}
