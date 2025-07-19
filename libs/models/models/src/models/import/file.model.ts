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

@ObjectType('ImportFile', { description: 'File used for data import' })
@Entity('ImportFiles')
export class ImportFile extends BaseEntity {
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
  @Index({ fulltext: true })
  declare filename: string;

  @SortableField()
  @Column()
  declare originalName: string;

  @SortableField()
  @Column()
  declare mimeType: string;

  @SortableField()
  @Column({ type: 'bigint' })
  declare size: number;

  @SortableField()
  @Column()
  declare path: string;

  @SortableField()
  @Column()
  declare importType: string;

  @SortableField()
  @Column({ default: 'pending' })
  declare status: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare processedAt?: Date;

  @SortableField({ nullable: true })
  @Column({ type: 'int', nullable: true })
  declare totalRecords?: number;

  @SortableField({ nullable: true })
  @Column({ type: 'int', nullable: true })
  declare processedRecords?: number;

  @SortableField({ nullable: true })
  @Column({ type: 'int', nullable: true })
  declare successfulRecords?: number;

  @SortableField({ nullable: true })
  @Column({ type: 'int', nullable: true })
  declare failedRecords?: number;

  @SortableField({ nullable: true })
  @Column({ type: 'text', nullable: true })
  declare errorLog?: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare uploadedBy?: string;
}