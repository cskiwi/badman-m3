import { ID, ObjectType } from '@nestjs/graphql';
import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { RankingGroup } from './ranking-group.model';
import { RankingSystem } from './ranking-system.model';
import { SortableField, WhereField } from '@app/utils';

@ObjectType('RankingSystemRankingGroupMembership', { description: 'A RankingSystemRankingGroupMembership' })
@Entity('RankingSystemRankingGroupMemberships', { schema: 'ranking' })
export class RankingSystemRankingGroupMembership extends BaseEntity {
  @SortableField(() => ID)
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @WhereField(() => ID)
  @Column({ type: 'uuid', nullable: false })
  declare systemId: string;

  @WhereField(() => ID)
  @Column({ type: 'uuid', nullable: false })
  declare groupId: string;

  @ManyToOne(() => RankingSystem, (system) => system.rankingSystemRankingGroupMemberships)
  @JoinColumn({ name: 'systemId' })
  declare rankingSystem: Relation<RankingSystem>;

  @ManyToOne(() => RankingGroup, (group) => group.rankingSystemRankingGroupMemberships)
  @JoinColumn({ name: 'groupId' })
  declare rankingGroup: Relation<RankingGroup>;
}
