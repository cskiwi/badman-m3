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

@ObjectType('RankingLastPlace')
@Entity('RankingLastPlaces', { schema: 'ranking' })
export class RankingLastPlace extends BaseEntity {
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
  declare rankingDate: Date;

  @Field()
  @Column()
  declare gender: string;

  @Field()
  @Column()
  declare singlePoints: number;

  @Field()
  @Column()
  declare mixPoints: number;

  @Field()
  @Column()
  declare doublePoints: number;

  @Field()
  @Column()
  declare singlePointsDowngrade: number;

  @Field()
  @Column()
  declare mixPointsDowngrade: number;

  @Field()
  @Column()
  declare doublePointsDowngrade: number;

  @Field()
  @Column()
  declare singleRank: number;

  @Field()
  @Column()
  declare mixRank: number;

  @Field()
  @Column()
  declare doubleRank: number;

  @Field()
  @Column()
  declare totalSingleRanking: number;

  @Field()
  @Column()
  declare totalMixRanking: number;

  @Field()
  @Column()
  declare totalDoubleRanking: number;

  @Field()
  @Column()
  declare totalWithinSingleLevel: number;

  @Field()
  @Column()
  declare totalWithinMixLevel: number;

  @Field()
  @Column()
  declare totalWithinDoubleLevel: number;

  @Field()
  @Column()
  declare single: number;

  @Field()
  @Column()
  declare mix: number;

  @Field()
  @Column()
  declare double: number;

  @Field()
  @Column()
  declare singleInactive: boolean;

  @Field()
  @Column()
  declare mixInactive: boolean;

  @Field()
  @Column()
  declare doubleInactive: boolean;

  @Field(() => ID)
  @Column()
  declare playerId: string;

  @Field(() => ID)
  @Column()
  declare systemId: string;

  // @Field()
  @OneToOne(() => Player, (player) => player.rankingLastPlace)
  @JoinColumn({ name: 'playerId' })
  declare player: Relation<Player>;

  // @Field()
  @ManyToOne(() => RankingSystem)
  @JoinColumn()
  declare system: Relation<RankingSystem>;
}
