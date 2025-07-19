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

@ObjectType('Entry', { description: 'Player or team entry in an event' })
@Entity('Entries')
export class Entry extends BaseEntity {
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
  @Index()
  declare eventId: string;

  @SortableField()
  @Column()
  @Index()
  declare subEventId: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  @Index()
  declare playerId?: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  @Index()
  declare teamId?: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  @Index()
  declare doublePartner?: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  @Index()
  declare mixedPartner?: string;

  @SortableField()
  @Column({ default: 'pending' })
  declare status: string;

  @SortableField({ nullable: true })
  @Column({ type: 'int', nullable: true })
  declare ranking?: number;

  @SortableField({ nullable: true })
  @Column({ type: 'text', nullable: true })
  declare comment?: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare entryDate?: Date;
}