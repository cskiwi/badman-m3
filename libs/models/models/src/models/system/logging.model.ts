import { Field, ID, ObjectType } from '@nestjs/graphql';
import { BaseEntity, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { SortableField, WhereField } from '@app/utils';

@ObjectType('LogEntry', { description: 'System log entry' })
@Entity('LogEntries')
export class LogEntry extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @SortableField()
  @WhereField()
  @CreateDateColumn({ type: 'timestamptz' })
  @Index()
  declare createdAt: Date;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @UpdateDateColumn({ type: 'timestamptz' })
  declare updatedAt: Date;

  @SortableField()
  @WhereField()
  @Column({ type: 'character varying', length: 255 })
  @Index()
  declare level: string;

  @SortableField()
  @WhereField()
  @Column('text')
  @Index({ fulltext: true })
  declare message: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'character varying', length: 255 })
  @Index()
  declare category?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'uuid'})
  @Index()
  declare playerId?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'uuid'})
  @Index()
  declare requestId?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'character varying', length: 255 })
  declare userAgent?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'character varying', length: 255 })
  declare ipAddress?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'character varying', length: 255 })
  declare method?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'character varying', length: 255 })
  declare url?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'int', nullable: true })
  declare statusCode?: number;

  @Field({ nullable: true })
  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'json', nullable: true })
  declare metadata?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'text', nullable: true })
  declare stackTrace?: string;
}
