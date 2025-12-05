import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';
import { Club } from '../club.model';
import { Player } from '../player.model';
import { Team } from '../team.model';
import { Claim } from './claim.model';
import { CompetitionEvent, TournamentEvent } from '../event';
import { SortableField, WhereField } from '@app/utils';
import { LinkType } from '@app/models-enum';

@ObjectType('Role', { description: 'A Role' })
@Entity({ name: 'Roles', schema: 'security' })
export class Role extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @SortableField(() => Date, { nullable: true })
  @WhereField(() => Date, { nullable: true })
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt?: Date;

  @SortableField(() => Date, { nullable: true })
  @WhereField(() => Date, { nullable: true })
  @CreateDateColumn({ type: 'timestamptz', nullable: true })
  createdAt?: Date;

  @SortableField(() => String, { nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({ type: 'character varying', length: 255, nullable: true })
  @Index()
  name?: string;

  @SortableField(() => String, { nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({ type: 'character varying', length: 255, nullable: true })
  @Index()
  description?: string;

  @SortableField(() => Boolean)
  @WhereField(() => Boolean)
  @Column({ type: 'boolean', default: false })
  locked?: boolean;

  @Field(() => [Claim], { nullable: true })
  @ManyToMany(() => Claim, (claim) => claim.roles, { nullable: true })
  @JoinTable({
    name: 'RoleClaimMemberships',
    joinColumn: { name: 'roleId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'claimId', referencedColumnName: 'id' },
  })
  claims?: Relation<Claim[]>;

  @Field(() => [Player], { nullable: true })
  @ManyToMany(() => Player, (player) => player.roles, { nullable: true })
  @JoinTable({
    name: 'PlayerRoleMemberships',
    joinColumn: { name: 'roleId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'playerId', referencedColumnName: 'id' },
  })
  players?: Relation<Player[]>;

  @SortableField(() => ID, { nullable: true })
  @WhereField(() => ID, { nullable: true })
  @Column({ type: 'uuid', nullable: true })
  clubId?: string;

  @SortableField(() => ID, { nullable: true })
  @WhereField(() => ID, { nullable: true })
  @Column({ type: 'uuid', nullable: true })
  teamId?: string;

  @SortableField(() => ID, { nullable: true })
  @WhereField(() => ID, { nullable: true })
  @Column({ type: 'uuid', nullable: true })
  competitionId?: string;

  @SortableField(() => ID, { nullable: true })
  @WhereField(() => ID, { nullable: true })
  @Column({ type: 'uuid', nullable: true })
  tournamentId?: string;

  @Field(() => Club, { nullable: true })
  @ManyToOne(() => Club, { nullable: true })
  club?: Relation<Club>;

  @Field(() => Team, { nullable: true })
  @ManyToOne(() => Team, { nullable: true })
  team?: Relation<Team>;

  @Field(() => CompetitionEvent, { nullable: true })
  @ManyToOne(() => CompetitionEvent, { nullable: true })
  competition?: Relation<CompetitionEvent>;

  @Field(() => TournamentEvent, { nullable: true })
  @ManyToOne(() => TournamentEvent, { nullable: true })
  tournament?: Relation<TournamentEvent>;

  @SortableField(() => ID, { nullable: true })
  @WhereField(() => ID, { nullable: true })
  @Column({ type: 'uuid', nullable: true })
  linkId?: string;

  @SortableField(() => String, { nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({ type: 'simple-enum', enum: LinkType })
  linkType?: LinkType;
}
