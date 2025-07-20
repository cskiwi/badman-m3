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
import { SortableField, WhereField } from '@app/utils';

@ObjectType('RankingLastPlace', { description: 'A RankingLastPlace' })
@Entity('RankingLastPlaces', { schema: 'ranking' })
export class RankingLastPlace extends BaseEntity {
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

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare singlePoints?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare mixPoints?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare doublePoints?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare singlePointsDowngrade?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare mixPointsDowngrade?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare doublePointsDowngrade?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare singleRank?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare mixRank?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare doubleRank?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare totalSingleRanking?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare totalMixRanking?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare totalDoubleRanking?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare totalWithinSingleLevel?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare totalWithinMixLevel?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare totalWithinDoubleLevel?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare single?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare mix?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
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
  @WhereField()
  @Column()
  declare playerId: string;

  @Field(() => ID)
  @WhereField()
  @Column()
  declare systemId: string;

  @Field(() => Player, { nullable: true })
  @ManyToOne(() => Player, (player) => player.rankingLastPlaces)
  @JoinColumn({ name: 'playerId' })
  declare player: Relation<Player>;

  @Field(() => RankingSystem, { nullable: true })
  @ManyToOne(() => RankingSystem, (system) => system.rankingLastPlaces)
  @JoinColumn({ name: 'systemId' })
  declare system: Relation<RankingSystem>;
}
