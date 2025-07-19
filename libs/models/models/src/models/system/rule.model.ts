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

@ObjectType('Rule', { description: 'Business rule configuration' })
@Entity('Rules')
export class Rule extends BaseEntity {
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
  declare ruleType: string;

  @SortableField()
  @Column()
  declare scope: string;

  @Field({ nullable: true })
  @SortableField({ nullable: true })
  @Column({ type: 'json', nullable: true })
  declare conditions?: string;

  @Field({ nullable: true })
  @SortableField({ nullable: true })
  @Column({ type: 'json', nullable: true })
  declare actions?: string;

  @SortableField()
  @Column({ default: true })
  declare isActive: boolean;

  @SortableField({ nullable: true })
  @Column({ type: 'int', default: 0 })
  declare priority?: number;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare validFrom?: Date;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare validTo?: Date;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare createdBy?: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare lastModifiedBy?: string;
}