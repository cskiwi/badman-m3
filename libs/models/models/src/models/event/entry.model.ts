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

@ObjectType('Entry', { description: 'Player or team entry in an event' })
@Entity('Entries')
export class Entry extends BaseEntity {
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
  declare eventId: string;

  @SortableField()
  @WhereField()
  @Column()
  @Index()
  declare subEventId: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  @Index()
  declare playerId?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  @Index()
  declare teamId?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  @Index()
  declare doublePartner?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  @Index()
  declare mixedPartner?: string;

  @SortableField()
  @WhereField()
  @Column({ default: 'pending' })
  declare status: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'int', nullable: true })
  declare ranking?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'text', nullable: true })
  declare comment?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare entryDate?: Date;
}