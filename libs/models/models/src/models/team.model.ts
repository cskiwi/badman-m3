import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';
import { Player } from './player.model';
import { TeamPlayerMembership } from './team-player-membership';
import { Club } from './club.model';
import { SortableField, WhereField } from '@app/utils';
import { Days } from '@app/models-enum';
import { Entry } from './event';

@ObjectType('Team', { description: 'A Team' })
@Entity('Teams')
export class Team extends BaseEntity {
  @Field(() => ID)
  @WhereField(() => ID)
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

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'character varying', length: 255, nullable: true })
  declare name?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare teamNumber?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'time', nullable: true })
  declare preferredTime?: string;

  @SortableField(() => String, { nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({ type: 'simple-enum', enum: Days, nullable: true })
  declare preferredDay?: Days;

  @SortableField({ nullable: true })
  @Column({ type: 'character varying', length: 255, nullable: true })
  declare abbreviation?: string;

  // @SortableField({ nullable: true })
  // @Column({ nullable: true })
  // entry?: Relation<EventEntry>;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'uuid' })
  declare clubId?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'character varying', length: 255, nullable: true })
  declare slug?: string;

  @SortableField(() => String)
  @WhereField(() => String, { nullable: true })
  @Column({ type: 'character varying', length: 255 })
  declare type?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'uuid' })
  declare captainId?: string;

  // @SortableField({ nullable: true })
  // @Column({ nullable: true })
  // prefferedLocation?: Relation<Location>;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'uuid' })
  declare prefferedLocationId?: string;

  // @SortableField({ nullable: true })
  // @Column({ nullable: true })
  // prefferedLocation2?: Relation<Location>;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'uuid' })
  declare prefferedLocation2Id?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'character varying', length: 255 })
  declare email?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'character varying', length: 255 })
  declare phone?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'time', nullable: true })
  declare preferredTime2?: string;

  @SortableField(() => String, { nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({ type: 'simple-enum', enum: Days, nullable: true })
  declare preferredDay2?: Days;

  @SortableField()
  @WhereField()
  @Column({ type: 'integer', default: 2022 })
  declare season: number;

  @SortableField()
  @WhereField()
  @Column({ type: 'uuid' })
  declare link: string;

  @SortableField(() => Player, { nullable: true })
  @ManyToOne(() => Player)
  @JoinColumn({ name: 'captainId' })
  declare captain: Relation<Player>;

  @SortableField(() => [TeamPlayerMembership], { nullable: true })
  @OneToMany(() => TeamPlayerMembership, (teamPlayerMembership) => teamPlayerMembership.team)
  declare teamPlayerMemberships: Relation<TeamPlayerMembership[]>;

  // belongs to club
  @SortableField(() => Club, { nullable: true })
  @ManyToOne(() => Club, (club) => club.teams)
  declare club?: Relation<Club>;

  // belongs to club
  @SortableField(() => Entry, { nullable: true })
  @OneToMany(() => Entry, (entry) => entry.team)
  declare entries?: Relation<Entry[]>;
}
