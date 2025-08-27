import { SortableField, SortableObject, WhereField, WhereObject } from '@app/utils';
import { Field, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { Player } from '../player.model';
import { Game } from './game.model';

@ObjectType('GamePlayerMembership')
@Entity('GamePlayerMemberships', { schema: 'event' })
export class GamePlayerMembership extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @WhereField()
  @Column({ type: 'uuid' })
  declare playerId: string;

  @WhereField()
  @Column({ type: 'uuid' })
  declare gameId: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare team?: number;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare player?: number;
  
  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare single?: number;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare double?: number;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare mix?: number;

  @WhereField({ nullable: true })
  @Column({ type: 'uuid', nullable: true })
  declare systemId?: string;

  @SortableObject('Player')
  @ManyToOne(() => Player, (player) => player.gamePlayerMemberships)
  @JoinColumn({ name: 'playerId' })
  declare gamePlayer: Relation<Player>;

  @SortableObject('Game')
  @WhereObject('Game')
  @ManyToOne(() => Game, (game) => game.gamePlayerMemberships)
  declare game: Relation<Game>;
}
