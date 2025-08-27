import { Field, ID, ObjectType } from '@nestjs/graphql';
import { BaseEntity, Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, Relation, UpdateDateColumn } from 'typeorm';
import { RankingSystemRankingGroupMembership } from './ranking-group-ranking-system-membership.model';
import { SortableField, WhereField } from '@app/utils';

@ObjectType('RankingGroup', { description: 'A RankingGroup' })
@Entity('RankingGroups', { schema: 'ranking' })
export class RankingGroup extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @SortableField()
  @WhereField()
  @CreateDateColumn({ type: 'timestamptz' })
  declare createdAt: Date;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @UpdateDateColumn({ type: 'timestamptz' })
  declare updatedAt: Date;

  @SortableField()
  @WhereField()
  @Column({ type: 'character varying', length: 255 })
  declare name: string;

  @OneToMany(() => RankingSystemRankingGroupMembership, (membership) => membership.rankingGroup)
  declare rankingSystemRankingGroupMemberships: Relation<RankingSystemRankingGroupMembership[]>;
}
