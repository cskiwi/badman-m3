import { Field, ID, ObjectType } from '@nestjs/graphql';
import { RankingSystem } from './ranking-system.model';
import { RankingGroup } from './ranking-group.model';
import {
  Entity,
  BaseEntity,
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

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
    (rankingSystem) => rankingSystem.rankingSystemRankingGroupMembership,
  )
  declare rankingSystem: RankingSystem;

  @ManyToOne(
    () => RankingGroup,
    (rankingGroup) => rankingGroup.rankingSystemRankingGroupMembership,
  )
  declare rankingGroup: RankingGroup;
}
