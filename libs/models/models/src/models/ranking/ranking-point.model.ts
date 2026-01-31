import { SortableField, WhereField } from '@app/utils';
import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
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
@Index(['gameId'])
@Index(['playerId'])
export class RankingPoint extends BaseEntity {
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

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare points?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'timestamp with time zone' })
  declare rankingDate?: Date;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'numeric', precision: 2 })
  declare differenceInLevel?: number;

  @WhereField(() => ID)
  @Column()
  declare playerId: string;

  @WhereField(() => ID)
  @Column()
  declare gameId: string;

  @WhereField(() => ID)
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