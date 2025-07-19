import { TeamMembershipType } from '@app/model/enums';
import { SortableField, SortableObject } from '@app/utils';
import { Field, ObjectType } from '@nestjs/graphql';
import { BaseEntity, Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Player } from './player.model';
import { Team } from './team.model';

@ObjectType('TeamPlayerMembership', { description: 'A TeamPlayerMembership' })
@Entity('TeamPlayerMemberships')
export class TeamPlayerMembership extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @Field()
  @Column({ type: 'uuid' })
  declare playerId?: string;

  @Field()
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

  @SortableObject('Player')
  @ManyToOne(() => Player, (player) => player.teamPlayerMemberships)
  declare player: Player;

  @SortableObject('Team')
  @ManyToOne(() => Team, (team) => team.teamPlayerMemberships)
  declare team: Team;
}
