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
import { SortableField } from '@app/utils';

@ObjectType('TeamPlayerMembership')
@Entity('TeamPlayerMemberships')
export class TeamPlayerMembership extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  declare id: number;

  @Column({ type: 'uuid' })
  declare playerId?: string;

  @Column({ type: 'uuid' })
  declare teamId?: string;

  @SortableField(() => String)
  @Column({
    type: 'simple-enum',
    enum: TeamMembershipType,
  })
  declare membershipType?: TeamMembershipType;

  @SortableField()
  @Column()
  declare end: Date;

  @SortableField()
  @Column()
  declare start: Date;

  @ManyToOne(() => Player, (player) => player.teamPlayerMemberships)
  declare player: Player;

  @ManyToOne(() => Team, (team) => team.teamPlayerMemberships)
  declare team: Team;
}
