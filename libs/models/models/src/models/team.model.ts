import { Field, ObjectType } from '@nestjs/graphql';
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

@ObjectType('Team')
@Entity('Teams')
export class Team extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @Field()
  @CreateDateColumn()
  declare createdAt: Date;

  @Field({ nullable: true })
  @UpdateDateColumn({ nullable: true })
  declare updatedAt: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  season?: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  preferredTime?: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  preferredDay?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  abbreviation?: string;

  // @Field({ nullable: true })
  // @Column({ nullable: true })
  // entry?: Relation<EventEntry>;

  @Field({ nullable: true })
  @Column({ nullable: true })
  clubId?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  slug?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  captainId?: string;

  // @Field({ nullable: true })
  // @Column({ nullable: true })
  // prefferedLocation?: Relation<Location>;

  @Field({ nullable: true })
  @Column({ nullable: true })
  prefferedLocationId?: string;

  // @Field({ nullable: true })
  // @Column({ nullable: true })
  // prefferedLocation2?: Relation<Location>;

  @Field({ nullable: true })
  @Column({ nullable: true })
  prefferedLocation2Id?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  phone?: string;

  @Field(() => Player, { nullable: true })
  @OneToOne(() => Player)
  @JoinColumn({ name: 'captainId' })
  declare captain: Relation<Player>;

  @Field(() => [Player], { nullable: true })
  @OneToMany(
    () => TeamPlayerMembership,
    (teamPlayerMembership) => teamPlayerMembership.player,
  )
  declare teamPlayerMemberships: TeamPlayerMembership[];

  // belongs to club
  @Field(() => Club, { nullable: true })
  @ManyToOne(() => Club, (club) => club.teams)
  declare club?: Club;

  // @Field({ nullable: true })
  // @Column({ nullable: true })
  // homeEncounters?: Relation<EncounterCompetition>;

  // @Field({ nullable: true })
  // @Column({ nullable: true })
  // awayEncounters?: Relation<EncounterCompetition>;
}
