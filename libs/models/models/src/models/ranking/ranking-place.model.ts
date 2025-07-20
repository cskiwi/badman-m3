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
import { SortableField } from '@app/utils';

@ObjectType('RankingPlace', { description: 'A RankingPlace' })
@Entity('RankingPlaces', { schema: 'ranking' })
export class RankingPlace extends BaseEntity {
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
  declare rankingDate: Date;

  @SortableField()
  @Column({
    type: 'simple-enum',
    enum: ['M', 'F'],
  })
  declare gender: 'M' | 'F';

  @SortableField()
  @Column({ nullable: true })
  declare singlePoints?: number;

  @SortableField()
  @Column({ nullable: true })
  declare mixPoints?: number;

  @SortableField()
  @Column({ nullable: true })
  declare doublePoints?: number;

  @SortableField()
  @Column({ nullable: true })
  declare singlePointsDowngrade?: number;

  @SortableField()
  @Column({ nullable: true })
  declare mixPointsDowngrade?: number;

  @SortableField()
  @Column({ nullable: true })
  declare doublePointsDowngrade?: number;

  @SortableField()
  @Column({ nullable: true })
  declare singleRank?: number;

  @SortableField()
  @Column({ nullable: true })
  declare mixRank?: number;

  @SortableField()
  @Column({ nullable: true })
  declare doubleRank?: number;

  @SortableField()
  @Column({ nullable: true })
  declare totalSingleRanking?: number;

  @SortableField()
  @Column({ nullable: true })
  declare totalMixRanking?: number;

  @SortableField()
  @Column({ nullable: true })
  declare totalDoubleRanking?: number;

  @SortableField()
  @Column({ nullable: true })
  declare totalWithinSingleLevel?: number;

  @SortableField()
  @Column({ nullable: true })
  declare totalWithinMixLevel?: number;

  @SortableField()
  @Column({ nullable: true })
  declare totalWithinDoubleLevel?: number;

  @SortableField()
  @Column({ nullable: true })
  declare single?: number;

  @SortableField()
  @Column({ nullable: true })
  declare mix?: number;

  @SortableField()
  @Column({ nullable: true })
  declare double?: number;

  @SortableField()
  @Column({ default: false })
  declare singleInactive: boolean;

  @SortableField()
  @Column({ default: false })
  declare mixInactive: boolean;

  @SortableField()
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
