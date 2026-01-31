import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';
import { Player } from '../player.model';
import { RankingSystem } from './ranking-system.model';
import { RankingGroup } from './ranking-group.model';
import { SortableField, WhereField, WhereObject } from '@app/utils';

@ObjectType('RankingLastPlace', { description: 'A RankingLastPlace' })
@Entity('RankingLastPlaces', { schema: 'ranking' })
export class RankingLastPlace extends BaseEntity {
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
  @Column({ type: 'timestamptz' })
  declare rankingDate: Date;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'character varying', length: 255, nullable: true })
  declare gender: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare singlePoints?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare mixPoints?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare doublePoints?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare singlePointsDowngrade?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare mixPointsDowngrade?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare doublePointsDowngrade?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare singleRank?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare mixRank?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare doubleRank?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare totalSingleRanking?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare totalMixRanking?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare totalDoubleRanking?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare totalWithinSingleLevel?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare totalWithinMixLevel?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare totalWithinDoubleLevel?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare single?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare mix?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare double?: number;

  @SortableField()
  @WhereField()
  @Column({ default: false })
  declare singleInactive: boolean;

  @SortableField()
  @WhereField()
  @Column({ default: false })
  declare mixInactive: boolean;

  @SortableField()
  @WhereField()
  @Column({ default: false })
  declare doubleInactive: boolean;

  @WhereField(() => ID)
  @Column({ type: 'uuid' })
  declare playerId: string;

  @WhereField(() => ID)
  @Column({ type: 'uuid' })
  declare systemId: string;

  @WhereField(() => ID, { nullable: true })
  @Column({ nullable: true, type: 'uuid' })
  declare groupId?: string;

  @Field(() => Player, { nullable: true })
  @ManyToOne(() => Player, (player) => player.rankingLastPlaces)
  @JoinColumn({ name: 'playerId' })
  declare player: Relation<Player>;

  @WhereObject(() => RankingSystem)
  @ManyToOne(() => RankingSystem, (system) => system.rankingLastPlaces)
  @JoinColumn({ name: 'systemId' })
  declare system: Relation<RankingSystem>;

  @WhereObject(() => RankingGroup)
  @ManyToOne(() => RankingGroup)
  @JoinColumn({ name: 'groupId' })
  declare group?: Relation<RankingGroup>;
}
