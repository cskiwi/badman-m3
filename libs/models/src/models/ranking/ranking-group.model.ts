import { Field, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RankingSystemRankingGroupMembership } from './ranking-group-ranking-system-membership.model';

@ObjectType('RankingGroup')
@Entity('RankingGroups', { schema: 'ranking' })
export class RankingGroup extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn('uuid')
  declare id: string;
    
  @Field()
  @CreateDateColumn()
  declare createdAt: Date;

  @Field({ nullable: true })
  @UpdateDateColumn({ nullable: true })
  declare updatedAt: Date;

  @Field()
  @Column()
  declare name: string;

  @OneToMany(
    () => RankingSystemRankingGroupMembership,
    (membership) => membership.rankingGroup,
  )
  declare rankingSystemRankingGroupMemberships: RankingSystemRankingGroupMembership;
}
