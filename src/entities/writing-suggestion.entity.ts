import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Writing } from './writings.entity';

@Entity({ name: 'writing_suggestions', schema: 'public' })
export class WritingSuggestion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'writing_id',
    type: 'uuid',
    nullable: false,
  })
  writingId!: string;

  @Column({
    name: 'type',
    type: 'character varying',
    length: 100,
    nullable: false,
  })
  type!: string; // GRAMMAR, STYLE, CLARITY, VOCABULARY, PUNCTUATION, TONE

  @Column({
    name: 'original_text',
    type: 'text',
    nullable: false,
  })
  originalText!: string;

  @Column({
    name: 'suggested_text',
    type: 'text',
    nullable: false,
  })
  suggestedText!: string;

  @Column({
    name: 'explanation',
    type: 'text',
    nullable: false,
  })
  explanation!: string; // why the suggestion is better

  @Column({
    name: 'confidence_score',
    type: 'float',
    default: 0.5,
  })
  confidenceScore!: number; // 0-1, how confident is the AI in this suggestion

  @Column({
    name: 'is_applied',
    type: 'boolean',
    default: false,
  })
  isApplied!: boolean; // whether user has applied this suggestion

  @Column({
    name: 'severity',
    type: 'character varying',
    length: 50,
    default: 'info',
  })
  severity!: string; // error, warning, suggestion, info

  @Column({
    name: 'position',
    type: 'jsonb',
    nullable: true,
  })
  position?: {
    start: number;
    end: number;
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

  @ManyToOne(() => Writing)
  @JoinColumn({ name: 'writing_id' })
  writing?: Writing;
}
