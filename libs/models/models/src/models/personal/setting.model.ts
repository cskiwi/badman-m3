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

@ObjectType('Setting', { description: 'User or system setting' })
@Entity('Settings')
export class Setting extends BaseEntity {
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
  @Index()
  declare key: string;

  @SortableField()
  @WhereField()
  @Column('text')
  declare value: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  @Index()
  declare playerId?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  @Index()
  declare clubId?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  @Index()
  declare eventId?: string;

  @SortableField()
  @WhereField()
  @Column({ default: 'user' })
  declare scope: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare description?: string;

  @SortableField()
  @WhereField()
  @Column({ default: 'string' })
  declare valueType: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ default: true })
  declare isActive?: boolean;
}