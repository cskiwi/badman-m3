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
import { SortableField } from '@app/utils';

@ObjectType('RankingLastPlace', { description: 'A RankingLastPlace' })
@Entity('RankingLastPlaces', { schema: 'ranking' })
export class RankingLastPlace extends BaseEntity {
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

  @SortableField({ nullable: true })
  @Column()
  declare singlePoints?: number;

  @SortableField({ nullable: true })
  @Column()
  declare mixPoints?: number;

  @SortableField({ nullable: true })
  @Column()
  declare doublePoints?: number;

  @SortableField({ nullable: true })
  @Column()
  declare singlePointsDowngrade?: number;

  @SortableField({ nullable: true })
  @Column()
  declare mixPointsDowngrade?: number;

  @SortableField({ nullable: true })
  @Column()
  declare doublePointsDowngrade?: number;

  @SortableField({ nullable: true })
  @Column()
  declare singleRank?: number;

  @SortableField({ nullable: true })
  @Column()
  declare mixRank?: number;

  @SortableField({ nullable: true })
  @Column()
  declare doubleRank?: number;

  @SortableField({ nullable: true })
  @Column()
  declare totalSingleRanking?: number;

  @SortableField({ nullable: true })
  @Column()
  declare totalMixRanking?: number;

  @SortableField({ nullable: true })
  @Column()
  declare totalDoubleRanking?: number;

  @SortableField({ nullable: true })
  @Column()
  declare totalWithinSingleLevel?: number;

  @SortableField({ nullable: true })
  @Column()
  declare totalWithinMixLevel?: number;

  @SortableField({ nullable: true })
  @Column()
  declare totalWithinDoubleLevel?: number;

  @SortableField({ nullable: true })
  @Column()
  declare single?: number;

  @SortableField({ nullable: true })
  @Column()
  declare mix?: number;

  @SortableField({ nullable: true })
  @Column()
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

  // @SortableField()
  @OneToOne(() => Player, (player) => player.rankingLastPlaces)
  @JoinColumn({ name: 'playerId' })
  declare player: Relation<Player>;

  // @SortableField()
  @ManyToOne(() => RankingSystem)
  @JoinColumn()
  declare system: Relation<RankingSystem>;
}
