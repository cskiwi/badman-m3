import { Field, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GamePlayerMembership } from './game-player-membership';
import { GameType } from '../../enums/gameType.enum';
import { GameStatus } from '../../enums/gameStatus.enum';

@ObjectType('Game')
@Entity('Games', { schema: 'event' })
export class Game extends BaseEntity {
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
  declare playedAt: Date;

  @Field(() => String)
  // @Column({ type: 'enum', enum: GameType })
  @Column({ type: 'varchar' })
  declare gameType: GameType;

  @Field(() => String)
  // @Column({ type: 'enum', enum: GameType })
  @Column({ type: 'varchar' })
  declare status: GameStatus;

  @Field()
  @Column()
  declare set1Team1: number;

  @Field()
  @Column()
  declare set1Team2: number;

  @Field()
  @Column()
  declare set2Team1: number;

  @Field()
  @Column()
  declare set2Team2: number;

  @Field()
  @Column()
  declare set3Team1: number;

  @Field()
  @Column()
  declare set3Team2: number;

  @Field()
  @Column()
  declare winner: number;

  @Field()
  @Column()
  declare order: number;

  @Field()
  @Column()
  declare round: string;

  @Field()
  @Column()
  declare linkId: string;

  @Field()
  @Column()
  declare linkType: string;

  @Field()
  @Column()
  declare courtId: string;

  @Field()
  @Column()
  declare visualCode: string;

  // @Field()
  @OneToMany(
    () => GamePlayerMembership,
    (gamePlayerMembership) => gamePlayerMembership.player,
  )
  declare gamePlayerMembership: GamePlayerMembership[];
}
