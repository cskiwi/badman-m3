import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Relation,
  OneToOne,
} from 'typeorm';
import { SortableField, WhereField } from '@app/utils';
import { Standing } from './standing.model';
import { EntryMeta } from './entry-meta.type';
import { Player } from '../player.model';

@ObjectType('Entry', { description: 'Player or team entry in an event' })
@Entity('Entries', { schema: 'event' })
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


  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  @Index()
  declare subEventId?: string;

  @SortableField(() => ID, { nullable: true })
  @WhereField(() => ID, { nullable: true })
  @Column({ nullable: true })
  @Index()
  declare drawId?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  @Index()
  declare player1Id?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  @Index()
  declare player2Id?: string;


  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  @Index()
  declare teamId?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  declare entryType?: string;

  @SortableField(() => EntryMeta, { nullable: true })
  @WhereField(() => EntryMeta, { nullable: true })
  @Field(() => EntryMeta, { nullable: true })
  @Column({ type: 'json', nullable: true })
  declare meta?: EntryMeta;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'timestamp with time zone', nullable: true })
  declare date?: Date;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'timestamp with time zone', nullable: true })
  declare sendOn?: Date;

  @Field(() => Standing, { nullable: true })
  @OneToOne(() => Standing, standing => standing.entry)
  declare standing?: Relation<Standing>;

  @Field(() => Player, { nullable: true })
  @ManyToOne(() => Player, { nullable: true })
  @JoinColumn({ name: 'player1Id' })
  declare player1?: Relation<Player>;

  @Field(() => Player, { nullable: true })
  @ManyToOne(() => Player, { nullable: true })
  @JoinColumn({ name: 'player2Id' })
  declare player2?: Relation<Player>;

}