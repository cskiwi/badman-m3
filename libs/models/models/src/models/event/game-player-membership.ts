import { Field, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Player } from '../player.model';
import { Game } from './game.model';

@ObjectType('GamePlayerMembership')
@Entity('GamePlayerMemberships', { schema: 'event' })
export class GamePlayerMembership extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  declare id: number;

  @Column({ type: 'uuid' })
  declare playerId?: string;

  @Column({ type: 'uuid' })
  declare gameId?: string;

  @Field()
  @Column()
  declare team: number;

  @Field()
  @Column()
  declare player: number;

  @Field()
  @Column()
  declare single?: number;

  @Field()
  @Column()
  declare double?: number;

  @Field()
  @Column()
  declare mix?: number;

  @Column({ type: 'uuid' })
  declare systemId: string;

  @ManyToOne(() => Player, (player) => player.gamePlayerMemberships)
  @JoinColumn({ name: 'playerId' })
  declare gamePlayer: Player;

  @ManyToOne(() => Game, (game) => game.gamePlayerMembership)
  declare game: Game;
}
