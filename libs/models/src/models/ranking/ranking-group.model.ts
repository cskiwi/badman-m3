import { Field, Int, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { RankingSystemRankingGroupMembership } from './ranking-group-ranking-system-membership.model';

@ObjectType('RankingGroup')
@Entity('RankingGroups', { schema: 'ranking' })
export class RankingGroup extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @Field()
  @Column()
  declare name: string;

  @ManyToOne(
    () => RankingSystemRankingGroupMembership,
    (rankingGroup) => rankingGroup.rankingGroup,
  )
  declare rankingSystemRankingGroupMembership: RankingSystemRankingGroupMembership;
}
