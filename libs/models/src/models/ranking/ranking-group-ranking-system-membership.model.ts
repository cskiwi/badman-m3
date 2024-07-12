import { ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RankingGroup } from './ranking-group.model';
import { RankingSystem } from './ranking-system.model';

@ObjectType('RankingSystemRankingGroupMembership')
@Entity('RankingSystemRankingGroupMemberships', { schema: 'ranking' })
export class RankingSystemRankingGroupMembership extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  declare rankingSystemRankingGroupMembershipId: number;

  @Column({ type: 'uuid' })
  declare systemId?: string;

  @Column({ type: 'uuid' })
  declare groupId?: string;

  @ManyToOne(
    () => RankingSystem,
    (membership) => membership.rankingSystemRankingGroupMemberships,
  )
  declare rankingSystem: RankingSystem;

  @ManyToOne(
    () => RankingGroup,
    (membership) => membership.rankingSystemRankingGroupMemberships,
  )
  declare rankingGroup: RankingGroup;
}
