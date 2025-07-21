import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
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
import { SubEventTypeEnum } from '@app/model/enums';
import { SortableField, WhereField } from '@app/utils';

@ObjectType('Team', { description: 'A Team' })
@Entity('Teams')
export class Team extends BaseEntity {
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
  name?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  season?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  teamNumber?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'time', nullable: true })
  preferredTime?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  preferredDay?: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  abbreviation?: string;

  // @SortableField({ nullable: true })
  // @Column({ nullable: true })
  // entry?: Relation<EventEntry>;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  clubId?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  slug?: string;

  @SortableField(() => String)
  @WhereField(() => String, { nullable: true })
  @Column({
    type: 'simple-enum',
    enum: SubEventTypeEnum,
  })
  type?: SubEventTypeEnum;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  captainId?: string;

  // @SortableField({ nullable: true })
  // @Column({ nullable: true })
  // prefferedLocation?: Relation<Location>;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  prefferedLocationId?: string;

  // @SortableField({ nullable: true })
  // @Column({ nullable: true })
  // prefferedLocation2?: Relation<Location>;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  prefferedLocation2Id?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  email?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  phone?: string;

  @SortableField(() => Player, { nullable: true })
  @OneToOne(() => Player)
  @JoinColumn({ name: 'captainId' })
  declare captain: Relation<Player>;

  @SortableField(() => [TeamPlayerMembership], { nullable: true })
  @OneToMany(() => TeamPlayerMembership, (teamPlayerMembership) => teamPlayerMembership.team)
  declare teamPlayerMemberships: Relation<TeamPlayerMembership[]>;

  // belongs to club
  @SortableField(() => Club, { nullable: true })
  @ManyToOne(() => Club, (club) => club.teams)
  declare club?: Relation<Club>;

  // @SortableField({ nullable: true })
  // @Column({ nullable: true })
  // homeEncounters?: Relation<EncounterCompetition>;

  // @SortableField({ nullable: true })
  // @Column({ nullable: true })
  // awayEncounters?: Relation<EncounterCompetition>;
}
