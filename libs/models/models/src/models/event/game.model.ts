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
import { SortableField } from '@app/utils';

@ObjectType('Game')
@Entity('Games', { schema: 'event' })
export class Game extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @SortableField()
  @CreateDateColumn()
  declare createdAt: Date;

  @SortableField({ nullable: true })
  @UpdateDateColumn({ nullable: true })
  declare updatedAt: Date;

  @SortableField()
  @Column()
  declare playedAt?: Date;

  @SortableField(() => String)
  @Column({ type: 'simple-enum', enum: GameType })
  declare gameType?: GameType;

  @SortableField(() => String)
  @Column({ type: 'simple-enum', enum: GameType })
  declare status?: GameStatus;

  @SortableField()
  @Column({ nullable: true })
  declare set1Team1?: number;

  @SortableField()
  @Column({ nullable: true })
  declare set1Team2?: number;

  @SortableField()
  @Column({ nullable: true })
  declare set2Team1?: number;

  @SortableField()
  @Column({ nullable: true })
  declare set2Team2?: number;

  @SortableField()
  @Column({ nullable: true })
  declare set3Team1?: number;

  @SortableField()
  @Column({ nullable: true })
  declare set3Team2?: number;

  @SortableField()
  @Column({ nullable: true })
  declare winner?: number;

  @SortableField()
  @Column({ nullable: true })
  declare order?: number;

  @SortableField()
  @Column({ nullable: true })
  declare round?: string;

  @SortableField()
  @Column()
  declare linkId: string;

  @SortableField()
  @Column()
  declare linkType: string;

  @SortableField()
  @Column({ nullable: true })
  declare courtId?: string;

  @SortableField()
  @Column({ nullable: true })
  declare visualCode?: string;

  // @SortableField()
  @OneToMany(
    () => GamePlayerMembership,
    (gamePlayerMembership) => gamePlayerMembership.gamePlayer,
  )
  declare gamePlayerMembership: GamePlayerMembership[];
}
