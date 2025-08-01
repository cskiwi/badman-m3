import { SortableField, SortableObject, WhereField } from '@app/utils';
import { Field, ObjectType } from '@nestjs/graphql';
import { BaseEntity, Column, Entity, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { Player } from './player.model';
import { Team } from './team.model';
import { TeamMembershipType } from '@app/models-enum';

@ObjectType('TeamPlayerMembership', { description: 'A TeamPlayerMembership' })
@Entity('TeamPlayerMemberships')
export class TeamPlayerMembership extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @SortableField()
  @WhereField()
  @Column({ type: 'uuid' })
  declare playerId?: string;

  @SortableField()
  @WhereField()
  @Column({ type: 'uuid' })
  declare teamId?: string;

  @SortableField(() => String)
  @WhereField(() => String)
  @Column({
    type: 'simple-enum',
    enum: TeamMembershipType,
    default: TeamMembershipType.REGULAR,
  })
  declare membershipType: TeamMembershipType;

  @SortableField()
  @WhereField()
  @Column({ nullable: true })
  declare end?: Date;

  @SortableField()
  @WhereField()
  @Column()
  declare start: Date;

  @SortableObject('Player')
  @ManyToOne(() => Player, (player) => player.teamPlayerMemberships)
  declare player: Relation<Player>;

  @SortableObject('Team')
  @ManyToOne(() => Team, (team) => team.teamPlayerMemberships)
  declare team: Relation<Team>;
}
