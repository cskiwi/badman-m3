import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';
import { Player } from '../player.model';
import { RankingSystem } from './ranking-system.model';

@ObjectType('RankingPoint')
@Entity('RankingPoints', { schema: 'ranking' })
export class RankingPoint extends BaseEntity {
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

  @Field()
  @Column({ nullable: true })
  declare singlePoints?: number;

  @Field()
  @Column({ nullable: true })
  declare mixPoints?: number;

  @Field()
  @Column({ nullable: true })
  declare doublePoints?: number;

  @Field()
  @Column({ nullable: true })
  declare singlePointsDowngrade?: number;

  @Field()
  @Column({ nullable: true })
  declare mixPointsDowngrade?: number;

  @Field()
  @Column({ nullable: true })
  declare doublePointsDowngrade?: number;

  @Field()
  @Column({ nullable: true })
  declare singleRank?: number;

  @Field()
  @Column({ nullable: true })
  declare mixRank?: number;

  @Field()
  @Column({ nullable: true })
  declare doubleRank?: number;

  @Field()
  @Column({ nullable: true })
  declare totalSingleRanking?: number;

  @Field()
  @Column({ nullable: true })
  declare totalMixRanking?: number;

  @Field()
  @Column({ nullable: true })
  declare totalDoubleRanking?: number;

  @Field()
  @Column({ nullable: true })
  declare totalWithinSingleLevel?: number;

  @Field()
  @Column({ nullable: true })
  declare totalWithinMixLevel?: number;

  @Field()
  @Column({ nullable: true })
  declare totalWithinDoubleLevel?: number;

  @Field()
  @Column({ nullable: true })
  declare single?: number;

  @Field()
  @Column({ nullable: true })
  declare mix?: number;

  @Field()
  @Column({ nullable: true })
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
  @OneToMany(() => Player, (player) => player.rankingLastPlaces)
  @JoinColumn({ name: 'playerId' })
  declare player: Relation<Player>;

  // @Field()
  @ManyToOne(() => RankingSystem)
  @JoinColumn()
  declare system: Relation<RankingSystem>;
}
