import { Field, ID, ObjectType } from '@nestjs/graphql';
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
import { GameStatus, GameType } from '@app/models/enums';

@ObjectType('Game')
@Entity('Games', { schema: 'event' })
export class Game extends BaseEntity {
  @Field(() => ID)
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
  declare playedAt?: Date;

  @Field(() => String)
  @Column({ type: 'simple-enum', enum: GameType })
  declare gameType?: GameType;

  @Field(() => String)
  @Column({ type: 'simple-enum', enum: GameType })
  declare status?: GameStatus;

  @Field()
  @Column({ nullable: true })
  declare set1Team1?: number;

  @Field()
  @Column({ nullable: true })
  declare set1Team2?: number;

  @Field()
  @Column({ nullable: true })
  declare set2Team1?: number;

  @Field()
  @Column({ nullable: true })
  declare set2Team2?: number;

  @Field()
  @Column({ nullable: true })
  declare set3Team1?: number;

  @Field()
  @Column({ nullable: true })
  declare set3Team2?: number;

  @Field()
  @Column({ nullable: true })
  declare winner?: number;

  @Field()
  @Column({ nullable: true })
  declare order?: number;

  @Field()
  @Column({ nullable: true })
  declare round?: string;

  @Field()
  @Column()
  declare linkId: string;

  @Field()
  @Column()
  declare linkType: string;

  @Field()
  @Column({ nullable: true })
  declare courtId?: string;

  @Field()
  @Column({ nullable: true })
  declare visualCode?: string;

  // @Field()
  @OneToMany(
    () => GamePlayerMembership,
    (gamePlayerMembership) => gamePlayerMembership.gamePlayer,
  )
  declare gamePlayerMembership: GamePlayerMembership[];
}
