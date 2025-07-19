import { Field, ID, InputType, ObjectType, OmitType, PartialType } from '@nestjs/graphql';
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
import { Claim, ClaimUpdateInput } from './claim.model';
import { SecurityType } from '@app/model/enums';
import { CompetitionEvent, TournamentEvent } from '../event';

@ObjectType('Role', { description: 'A Role' })
@Entity({ name: 'Roles', schema: 'security' })
export class Role extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Field(() => Date, { nullable: true })
  @UpdateDateColumn({ nullable: true })
  updatedAt?: Date;

  @Field(() => Date, { nullable: true })
  @CreateDateColumn({ nullable: true })
  createdAt?: Date;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', nullable: true })
  @Index()
  name?: string;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', nullable: true })
  @Index()
  description?: string;

  @Field(() => Boolean)
  @Column({ type: 'boolean', default: false })
  locked?: boolean;

  @Field(() => [Claim], { nullable: true })
  @ManyToMany(() => Claim, (claim) => claim.roles, { nullable: true })
  @JoinTable({
    name: 'RoleClaimMembership',
    joinColumn: { name: 'roleId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'claimId', referencedColumnName: 'id' },
  })
  claims?: Relation<Claim[]>;

  @Field(() => [Player], { nullable: true })
  @ManyToMany(() => Player, (player) => player.roles, { nullable: true })
  @JoinTable({
    name: 'PlayerRoleMembership',
    joinColumn: { name: 'roleId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'playerId', referencedColumnName: 'id' },
  })
  players?: Relation<Player[]>;

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

  @Field(() => ID, { nullable: true })
  @Column({ type: 'uuid', nullable: true })
  linkId?: string;

  @Field(() => String, { nullable: true })
  @Column({ type: 'enum', enum: SecurityType, nullable: true })
  linkType?: string;
}

@InputType()
export class RoleUpdateInput extends PartialType(OmitType(Role, ['createdAt', 'updatedAt', 'claims'] as const), InputType) {
  @Field(() => [ClaimUpdateInput], { nullable: true })
  claims?: Relation<Claim[]>;
}

@InputType()
export class RoleNewInput extends PartialType(OmitType(RoleUpdateInput, ['id'] as const), InputType) {}
