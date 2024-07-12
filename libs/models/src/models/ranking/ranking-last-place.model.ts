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
  @Column({
    type: 'simple-enum',
    enum: ['M', 'F'],
  })
  declare gender: 'M' | 'F';

  @Field({ nullable: true })
  @Column()
  declare singlePoints?: number;

  @Field({ nullable: true })
  @Column()
  declare mixPoints?: number;

  @Field({ nullable: true })
  @Column()
  declare doublePoints?: number;

  @Field({ nullable: true })
  @Column()
  declare singlePointsDowngrade?: number;

  @Field({ nullable: true })
  @Column()
  declare mixPointsDowngrade?: number;

  @Field({ nullable: true })
  @Column()
  declare doublePointsDowngrade?: number;

  @Field({ nullable: true })
  @Column()
  declare singleRank?: number;

  @Field({ nullable: true })
  @Column()
  declare mixRank?: number;

  @Field({ nullable: true })
  @Column()
  declare doubleRank?: number;

  @Field({ nullable: true })
  @Column()
  declare totalSingleRanking?: number;

  @Field({ nullable: true })
  @Column()
  declare totalMixRanking?: number;

  @Field({ nullable: true })
  @Column()
  declare totalDoubleRanking?: number;

  @Field({ nullable: true })
  @Column()
  declare totalWithinSingleLevel?: number;

  @Field({ nullable: true })
  @Column()
  declare totalWithinMixLevel?: number;

  @Field({ nullable: true })
  @Column()
  declare totalWithinDoubleLevel?: number;

  @Field({ nullable: true })
  @Column()
  declare single?: number;

  @Field({ nullable: true })
  @Column()
  declare mix?: number;

  @Field({ nullable: true })
  @Column()
  declare double?: number;

  @Field()
  @Column({ default: false })
  declare singleInactive: boolean;

  @Field()
  @Column({ default: false })
  declare mixInactive: boolean;

  @Field()
  @Column({ default: false })
  declare doubleInactive: boolean;

  @Field(() => ID)
  @Column()
  declare playerId: string;

  @Field(() => ID)
  @Column()
  declare systemId: string;

  // @Field()
  @OneToOne(() => Player, (player) => player.rankingLastPlaces)
  @JoinColumn({ name: 'playerId' })
  declare player: Relation<Player>;

  // @Field()
  @ManyToOne(() => RankingSystem)
  @JoinColumn()
  declare system: Relation<RankingSystem>;
}
