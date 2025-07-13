import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RankingSystemRankingGroupMembership } from './ranking-group-ranking-system-membership.model';
import { SortableField } from '@app/utils';

@ObjectType('RankingGroup')
@Entity('RankingGroups', { schema: 'ranking' })
export class RankingGroup extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @SortableField()
  @CreateDateColumn()
  declare createdAt: Date;

  @SortableField({ nullable: true })
  @UpdateDateColumn({ nullable: true })
  declare updatedAt: Date;

  @SortableField()
  @Column()
  declare name: string;

  @OneToMany(
    () => RankingSystemRankingGroupMembership,
    (membership) => membership.rankingGroup,
  )
  declare rankingSystemRankingGroupMemberships: RankingSystemRankingGroupMembership;
}
