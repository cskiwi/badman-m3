import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  Index,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';
import { Player } from '../player.model';
import { RankingSystem } from './ranking-system.model';
import { RankingGroup } from './ranking-group.model';
import { SortableField, WhereField } from '@app/utils';

@Index(["playerId", "systemId", "rankingDate"])
@ObjectType('RankingPlace', { description: 'A RankingPlace' })
@Entity('RankingPlaces', { schema: 'ranking' })
export class RankingPlace extends BaseEntity {
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

  @SortableField()
  @WhereField()
  @Column({ default: false })
  declare updatePossible: boolean;

  @SortableField()
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare singlePoints?: number;

  @SortableField()
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare mixPoints?: number;

  @SortableField()
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare doublePoints?: number;

  @SortableField()
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare singlePointsDowngrade?: number;

  @SortableField()
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare mixPointsDowngrade?: number;

  @SortableField()
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare doublePointsDowngrade?: number;

  @SortableField()
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare singleRank?: number;

  @SortableField()
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare mixRank?: number;

  @SortableField()
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare doubleRank?: number;

  @SortableField()
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare totalSingleRanking?: number;

  @SortableField()
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare totalMixRanking?: number;

  @SortableField()
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare totalDoubleRanking?: number;

  @SortableField()
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare totalWithinSingleLevel?: number;

  @SortableField()
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare totalWithinMixLevel?: number;

  @SortableField()
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare totalWithinDoubleLevel?: number;

  @SortableField()
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare single?: number;

  @SortableField()
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare mix?: number;

  @SortableField()
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

  @Field(() => ID)
  @Column()
  declare playerId: string;

  @Field(() => ID)
  @Column()
  declare systemId: string;

  @Field(() => ID, { nullable: true })
  @Column({ nullable: true, type: 'uuid' })
  declare groupId?: string;

  @Field(() => Player, { nullable: true })
  @ManyToOne(() => Player, (player) => player.rankingPlaces)
  @JoinColumn({ name: 'playerId' })
  declare player: Relation<Player>;

  @Field(() => RankingSystem, { nullable: true })
  @ManyToOne(() => RankingSystem, (system) => system.rankingPlaces)
  @JoinColumn({ name: 'systemId' })
  declare system: Relation<RankingSystem>;

  @Field(() => RankingGroup, { nullable: true })
  @ManyToOne(() => RankingGroup)
  @JoinColumn({ name: 'groupId' })
  declare group?: Relation<RankingGroup>;
}
