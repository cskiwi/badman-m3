import { SortableField } from '@app/utils';
import { ObjectType } from '@nestjs/graphql';
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

  @SortableField()
  @Column()
  declare team: number;

  @SortableField()
  @Column()
  declare player: number;

  @SortableField({nullable: true})
  @Column()
  declare single?: number;

  @SortableField({nullable: true})
  @Column()
  declare double?: number;

  @SortableField({nullable: true})
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
