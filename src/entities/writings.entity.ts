import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './users.entity';
import { Analytics } from './analysis.entity';

@Entity({ name: 'writings', schema: 'public' })
export class Writing {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'user_id',
    type: 'uuid',
    nullable: false,
  })
  userId!: string;

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
    name: 'type',
    type: 'character varying',
    length: 100,
    nullable: false,
  })
  type!: string;

  @Column({
    name: 'status',
    type: 'character varying',
    length: 50,
    default: 'draft',
  })
  status!: string;

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

  @ManyToOne(() => User, (user) => user.writings)
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_writing_user_id',
  })
  user!: User;

  @OneToMany(() => Analytics, (analysis) => analysis.writing, {
    cascade: ['remove'],
    onDelete: 'CASCADE',
  })
  analyses!: Analytics[];
}
