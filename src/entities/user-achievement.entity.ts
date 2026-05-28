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
import { Achievement } from './achievement.entity';

@Entity({ name: 'user_achievements', schema: 'public' })
export class UserAchievement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'user_id',
    type: 'uuid',
    nullable: false,
  })
  userId!: string;

  @Column({
    name: 'achievement_id',
    type: 'uuid',
    nullable: false,
  })
  achievementId!: string;

  @Column({
    name: 'progress',
    type: 'integer',
    default: 0,
  })
  progress!: number; // current progress toward achievement

  @Column({
    name: 'is_unlocked',
    type: 'boolean',
    default: false,
  })
  isUnlocked!: boolean;

  @CreateDateColumn({
    name: 'unlocked_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  unlockedAt?: Date;

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

  @ManyToOne(() => Achievement, (achievement) => achievement.userAchievements)
  @JoinColumn({ name: 'achievement_id' })
  achievement?: Achievement;
}
