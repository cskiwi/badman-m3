import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';
import { SortableField } from '@app/utils';

@ObjectType('Availability', { description: 'Player availability for events' })
@Entity('Availabilities')
export class Availability extends BaseEntity {
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
  declare playerId: string;

  @SortableField()
  @Column()
  @Index()
  declare eventId: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  @Index()
  declare subEventId?: string;

  @SortableField()
  @Column()
  declare date: Date;

  @SortableField()
  @Column({ default: true })
  declare available: boolean;

  @SortableField({ nullable: true })
  @Column({ type: 'text', nullable: true })
  declare comment?: string;
}