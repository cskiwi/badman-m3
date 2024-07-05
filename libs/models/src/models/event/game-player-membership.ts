import { Field, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Game } from './game.model';
import { Player } from '../player.model';

@ObjectType('GamePlayerMembership')
@Entity('GamePlayerMemberships', { schema: 'event' })
export class GamePlayerMembership extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  declare id: number;

  @Column({ type: 'uuid' })
  declare playerId?: string;

  @Column({ type: 'uuid' })
  declare gameId?: string;

  @Column()
  declare team: number;

  @ManyToOne(() => Player, (player) => player.gamePlayerMemberships)
  declare player: Player;

  @ManyToOne(() => Game, (game) => game.gamePlayerMembership)
  declare game: Game;
}
