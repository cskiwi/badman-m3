import { Field, ID, ObjectType } from '@nestjs/graphql';
import { BaseEntity, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { SortableField, WhereField } from '@app/utils';

@ObjectType('ImportFile', { description: 'File used for data import' })
@Entity('ImportFiles')
export class ImportFile extends BaseEntity {
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
  @Index({ fulltext: true })
  declare filename: string;

  @SortableField()
  @WhereField()
  @Column({ type: 'character varying', length: 255 })
  declare originalName: string;

  @SortableField()
  @WhereField()
  @Column({ type: 'character varying', length: 255 })
  declare mimeType: string;

  @SortableField()
  @WhereField()
  @Column({ type: 'bigint' })
  declare size: number;

  @SortableField()
  @WhereField()
  @Column({ type: 'character varying', length: 255 })
  declare path: string;

  @SortableField()
  @WhereField()
  @Column({ type: 'character varying', length: 255 })
  declare importType: string;

  @SortableField()
  @WhereField()
  @Column({ default: 'pending', type: 'character varying', length: 255 })
  declare status: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'timestamptz' })
  declare processedAt?: Date;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'int', nullable: true })
  declare totalRecords?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'int', nullable: true })
  declare processedRecords?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'int', nullable: true })
  declare successfulRecords?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'int', nullable: true })
  declare failedRecords?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'text', nullable: true })
  declare errorLog?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'uuid' })
  declare uploadedBy?: string;
}
