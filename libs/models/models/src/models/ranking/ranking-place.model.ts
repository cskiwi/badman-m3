import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';
import { Player } from '../player.model';
import { RankingSystem } from './ranking-system.model';
import { SortableField, WhereField } from '@app/utils';

@ObjectType('RankingPlace', { description: 'A RankingPlace' })
@Entity('RankingPlaces', { schema: 'ranking' })
export class RankingPlace extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @SortableField()
  @WhereField()
  @CreateDateColumn()
  declare createdAt: Date;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @UpdateDateColumn({ nullable: true })
  declare updatedAt: Date;

  @SortableField()
  @WhereField()
  @Column()
  declare rankingDate: Date;

  @SortableField()
  @WhereField()
  @Column({
    type: 'simple-enum',
    enum: ['M', 'F'],
  })
  declare gender: 'M' | 'F';

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

  @Field(() => Player, { nullable: true })
  @ManyToOne(() => Player, (player) => player.rankingPlaces)
  @JoinColumn({ name: 'playerId' })
  declare player: Relation<Player>;

  @Field(() => RankingSystem, { nullable: true })
  @ManyToOne(() => RankingSystem, (system) => system.rankingPlaces)
  @JoinColumn({ name: 'systemId' })
  declare system: Relation<RankingSystem>;
}
