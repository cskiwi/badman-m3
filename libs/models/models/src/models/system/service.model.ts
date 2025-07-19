import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SortableField } from '@app/utils';

@ObjectType('Service', { description: 'External service configuration' })
@Entity('Services')
export class Service extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @SortableField()
  @CreateDateColumn()
  declare createdAt: Date;

  @SortableField({ nullable: true })
  @UpdateDateColumn({ nullable: true })
  declare updatedAt: Date;

  @SortableField()
  @Column()
  @Index({ unique: true })
  declare name: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare description?: string;

  @SortableField()
  @Column()
  declare serviceType: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare endpoint?: string;

  @Field({ nullable: true })
  @SortableField({ nullable: true })
  @Column({ type: 'json', nullable: true })
  declare configuration?: string;

  @Field({ nullable: true })
  @SortableField({ nullable: true })
  @Column({ type: 'json', nullable: true })
  declare authentication?: string;

  @SortableField()
  @Column({ default: true })
  declare isActive: boolean;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare lastHealthCheck?: Date;

  @SortableField({ nullable: true })
  @Column({ default: 'unknown' })
  declare healthStatus?: string;

  @SortableField({ nullable: true })
  @Column({ type: 'int', nullable: true })
  declare timeoutMs?: number;

  @SortableField({ nullable: true })
  @Column({ type: 'int', default: 3 })
  declare maxRetries?: number;

  @SortableField({ nullable: true })
  @Column({ type: 'text', nullable: true })
  declare lastError?: string;
}