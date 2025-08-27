import { Field, ID, ObjectType } from '@nestjs/graphql';
import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { RankingGroup } from './ranking-group.model';
import { RankingSystem } from './ranking-system.model';

@ObjectType('RankingSystemRankingGroupMembership', { description: 'A RankingSystemRankingGroupMembership' })
@Entity('RankingSystemRankingGroupMemberships', { schema: 'ranking' })
export class RankingSystemRankingGroupMembership extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @Field(() => ID)
  @Column({ type: 'uuid', nullable: false })
  declare systemId: string;

  @Field(() => ID)
  @Column({ type: 'uuid', nullable: false })
  declare groupId: string;

  @Field(() => RankingSystem, { nullable: true })
  @ManyToOne(() => RankingSystem, (system) => system.rankingSystemRankingGroupMemberships)
  @JoinColumn({ name: 'systemId' })
  declare rankingSystem: Relation<RankingSystem>;

  @Field(() => RankingGroup, { nullable: true })
  @ManyToOne(() => RankingGroup, (group) => group.rankingSystemRankingGroupMemberships)
  @JoinColumn({ name: 'groupId' })
  declare rankingGroup: Relation<RankingGroup>;
}
