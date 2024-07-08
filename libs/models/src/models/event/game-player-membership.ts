import { Field, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Game } from './game.model';
import { Player } from '../player.model';

@ObjectType('GamePlayerMembership')
@Entity('GamePlayerMemberships', { schema: 'event' })
export class GamePlayerMembership extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  declare id: number;

  @Field()
  @CreateDateColumn()
  declare createdAt: Date;

  @Field({ nullable: true })
  @UpdateDateColumn({ nullable: true })
  declare updatedAt: Date;

  @Column({ type: 'uuid' })
  declare playerId?: string;

  @Column({ type: 'uuid' })
  declare gameId?: string;

  @Column()
  declare team: number;

  @Column()
  declare player: number;

  @Column()
  declare single?: number;

  @Column()
  declare double?: number;

  @Column()
  declare mix?: number;

  @Column({ type: 'uuid' })
  declare systemId: string;

  @ManyToOne(() => Player, (player) => player.gamePlayerMemberships)
  declare gamePlayer: Player;

  @ManyToOne(() => Game, (game) => game.gamePlayerMembership)
  declare game: Game;
}
