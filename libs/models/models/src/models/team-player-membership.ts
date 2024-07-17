import { Field, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TeamMembershipType } from '@app/models/enums';
import { Player } from './player.model';
import { Team } from './team.model';

@ObjectType('TeamPlayerMembership')
@Entity('TeamPlayerMemberships')
export class TeamPlayerMembership extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  declare id: number;

  @Column({ type: 'uuid' })
  declare playerId?: string;

  @Column({ type: 'uuid' })
  declare teamId?: string;

  @Field(() => String)
  @Column({
    type: 'simple-enum',
    enum: TeamMembershipType,
  })
  declare membershipType?: TeamMembershipType;

  @Field()
  @Column()
  declare end: Date;

  @Field()
  @Column()
  declare start: Date;

  @ManyToOne(() => Player, (player) => player.teamPlayerMemberships)
  declare player: Player;

  @ManyToOne(() => Team, (team) => team.teamPlayerMemberships)
  declare team: Team;
}
