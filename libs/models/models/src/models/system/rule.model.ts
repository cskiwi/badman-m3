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
import { SortableField, WhereField } from '@app/utils';

@ObjectType('Rule', { description: 'Business rule configuration' })
@Entity('Rules')
export class Rule extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @SortableField()
  @WhereField()
  @CreateDateColumn()
  declare createdAt: Date;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @UpdateDateColumn({ nullable: true })
  declare updatedAt: Date;

  @SortableField()
  @WhereField()
  @Column()
  @Index({ unique: true })
  declare name: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare description?: string;

  @SortableField()
  @WhereField()
  @Column()
  declare ruleType: string;

  @SortableField()
  @WhereField()
  @Column()
  declare scope: string;

  @Field({ nullable: true })
  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'json', nullable: true })
  declare conditions?: string;

  @Field({ nullable: true })
  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'json', nullable: true })
  declare actions?: string;

  @SortableField()
  @WhereField()
  @Column({ default: true })
  declare isActive: boolean;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'int', default: 0 })
  declare priority?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare validFrom?: Date;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare validTo?: Date;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare createdBy?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare lastModifiedBy?: string;
}