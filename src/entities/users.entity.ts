import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Writing } from './writings.entity';
import { Analytics } from './analysis.entity';
import { UserTokenUsage } from './user-token-usage.entity';

@Entity({ name: 'users', schema: 'public' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'username',
    type: 'character varying',
    length: 255,
    nullable: false,
    unique: true,
  })
  username!: string;

  @Column({
    name: 'email',
    type: 'character varying',
    length: 255,
    nullable: true,
    unique: true,
  })
  email?: string;

  @Column({
    name: 'password',
    type: 'character varying',
    length: 255,
    nullable: true,
  })
  password?: string;

  @Column({
    name: 'full_name',
    type: 'character varying',
    length: 255,
    nullable: true,
  })
  fullName?: string;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  isActive!: boolean;

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
  @OneToMany(() => Writing, (writing) => writing.user)
  writings!: Writing[];

  @OneToMany(() => Analytics, (analysis) => analysis.user)
  analyses!: Analytics[];

  @OneToMany(() => UserTokenUsage, (tokenUsage) => tokenUsage.user)
  tokenUsages!: UserTokenUsage[];
}
