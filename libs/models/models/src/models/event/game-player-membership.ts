import { SortableField, SortableObject } from '@app/utils';
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
  @Field()
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

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

  @SortableObject('Player')
  @ManyToOne(() => Player, (player) => player.gamePlayerMemberships)
  @JoinColumn({ name: 'playerId' })
  declare gamePlayer: Player;

  @SortableObject('Game')
  @ManyToOne(() => Game, (game) => game.gamePlayerMemberships)
  declare game: Game;
}
