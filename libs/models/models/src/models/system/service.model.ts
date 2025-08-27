import { Field, ID, ObjectType } from '@nestjs/graphql';
import { BaseEntity, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { SortableField, WhereField } from '@app/utils';

@ObjectType('Service', { description: 'External service configuration' })
@Entity('Services')
export class Service extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @SortableField()
  @WhereField()
  @CreateDateColumn({ type: 'timestamptz' })
  declare createdAt: Date;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @UpdateDateColumn({ type: 'timestamptz' })
  declare updatedAt: Date;

  @SortableField()
  @WhereField()
  @Column({ type: 'character varying', length: 255 })
  @Index({ unique: true })
  declare name: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'character varying', length: 255 })
  declare description?: string;

  @SortableField()
  @WhereField()
  @Column({ type: 'character varying', length: 255 })
  declare serviceType: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'character varying', length: 255 })
  declare endpoint?: string;

  @Field({ nullable: true })
  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'json', nullable: true })
  declare configuration?: string;

  @Field({ nullable: true })
  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'json', nullable: true })
  declare authentication?: string;

  @SortableField()
  @WhereField()
  @Column({ default: true })
  declare isActive: boolean;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'timestamptz' })
  declare lastHealthCheck?: Date;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ default: 'unknown', type: 'character varying', length: 255 })
  declare healthStatus?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'int', nullable: true })
  declare timeoutMs?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'int', default: 3 })
  declare maxRetries?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'text', nullable: true })
  declare lastError?: string;
}
