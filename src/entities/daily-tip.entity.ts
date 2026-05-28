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

@Entity({ name: 'daily_tips', schema: 'public' })
export class DailyTip {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'user_id',
    type: 'uuid',
    nullable: false,
  })
  userId!: string;

  @Column({
    name: 'tip_date',
    type: 'date',
    nullable: false,
  })
  tipDate!: Date;

  @Column({
    name: 'category',
    type: 'character varying',
    length: 100,
    nullable: false,
  })
  category!: string; // grammar, vocabulary, structure, punctuation, style

  @Column({
    name: 'title',
    type: 'character varying',
    length: 255,
    nullable: false,
  })
  title!: string;

  @Column({
    name: 'content',
    type: 'text',
    nullable: false,
  })
  content!: string;

  @Column({
    name: 'example_before',
    type: 'text',
    nullable: true,
  })
  exampleBefore?: string;

  @Column({
    name: 'example_after',
    type: 'text',
    nullable: true,
  })
  exampleAfter?: string;

  @Column({
    name: 'based_on_analysis_ids',
    type: 'uuid',
    array: true,
    nullable: true,
  })
  basedOnAnalyticsIds?: string[];

  @Column({
    name: 'is_read',
    type: 'boolean',
    default: false,
  })
  isRead!: boolean;

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

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
