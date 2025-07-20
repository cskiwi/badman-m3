import { SortableField } from '@app/utils';
import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';
import { Player } from '../player.model';
import { Game } from '../event/game.model';
import { RankingSystem } from './ranking-system.model';

@ObjectType('RankingPoint', { description: 'A RankingPoint' })
@Entity('RankingPoints', { schema: 'ranking' })
export class RankingPoint extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @SortableField()
  @CreateDateColumn()
  declare createdAt: Date;

  @SortableField({ nullable: true })
  @UpdateDateColumn({ nullable: true })
  declare updatedAt: Date;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare points?: number;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare rankingDate?: Date;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare differenceInLevel?: number;

  @Field(() => ID)
  @Column()
  declare playerId: string;

  @Field(() => ID)
  @Column()
  declare gameId: string;

  @Field(() => ID)
  @Column()
  declare systemId: string;

  @Field(() => Player, { nullable: true })
  @ManyToOne(() => Player, (player) => player.rankingPoints)
  @JoinColumn({ name: 'playerId' })
  declare player: Relation<Player>;

  @Field(() => Game, { nullable: true })
  @ManyToOne(() => Game, (game) => game.rankingPoints)
  @JoinColumn({ name: 'gameId' })
  declare game: Relation<Game>;

  @Field(() => RankingSystem, { nullable: true })
  @ManyToOne(() => RankingSystem, (system) => system.rankingPoints)
  @JoinColumn({ name: 'systemId' })
  declare system: Relation<RankingSystem>;
}