import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';
import { GamePlayerMembership } from './game-player-membership';
import { SortableField, WhereField } from '@app/utils';
import { TournamentDraw } from './tournament/tournament-draw.model';
import { CompetitionEncounter } from './competition/competition-encounter.model';
import { RankingPoint } from '../ranking/ranking-point.model';
import { GameStatus, GameType } from '@app/models-enum';

@ObjectType('Game', { description: 'A Game' })
@Entity('Games', { schema: 'event' })
@Index(['linkId', 'linkType'])
@Index(['playedAt'])
export class Game extends BaseEntity {
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
  @WhereField(() => Date, { nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  declare playedAt?: Date;

  @SortableField(() => String, { nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({ type: 'simple-enum', enum: GameType })
  declare gameType?: GameType;

  @SortableField(() => String, { nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({ type: 'simple-enum', enum: GameStatus, nullable: true })
  declare status?: GameStatus;

  @SortableField({ nullable: true })
  @WhereField(() => Number, { nullable: true })
  @Column({ nullable: true })
  declare set1Team1?: number;

  @SortableField({ nullable: true })
  @WhereField(() => Number, { nullable: true })
  @Column({ nullable: true })
  declare set1Team2?: number;

  @SortableField({ nullable: true })
  @WhereField(() => Number, { nullable: true })
  @Column({ nullable: true })
  declare set2Team1?: number;

  @SortableField({ nullable: true })
  @WhereField(() => Number, { nullable: true })
  @Column({ nullable: true })
  declare set2Team2?: number;

  @SortableField({ nullable: true })
  @WhereField(() => Number, { nullable: true })
  @Column({ nullable: true })
  declare set3Team1?: number;

  @SortableField({ nullable: true })
  @WhereField(() => Number, { nullable: true })
  @Column({ nullable: true })
  declare set3Team2?: number;

  @SortableField({ nullable: true })
  @WhereField(() => Number, { nullable: true })
  @Column({ nullable: true })
  declare winner?: number;

  @SortableField({ nullable: true })
  @WhereField(() => Number, { nullable: true })
  @Column({ nullable: true })
  declare order?: number;

  @SortableField({ nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({ type: 'character varying', length: 255, nullable: true })
  declare round?: string;

  @SortableField()
  @WhereField(() => String)
  @Column({ type: 'uuid' })
  declare linkId: string;

  @SortableField()
  @WhereField(() => String)
  @Column({ type: 'character varying', length: 255 })
  declare linkType: string;

  @SortableField({ nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({ type: 'uuid', nullable: true })
  declare courtId?: string;

  @Field({ nullable: true })
  @SortableField({ nullable: true })
  @Column({ type: 'character varying', length: 255, nullable: true })
  declare visualCode?: string;

  @Field(() => [GamePlayerMembership], { nullable: true })
  @OneToMany(() => GamePlayerMembership, (gamePlayerMembership) => gamePlayerMembership.game)
  declare gamePlayerMemberships: Relation<GamePlayerMembership[]>;

  @Field(() => [RankingPoint], { nullable: true })
  @OneToMany(() => RankingPoint, (rankingPoint) => rankingPoint.game)
  declare rankingPoints: Relation<RankingPoint[]>;

  @Field(() => TournamentDraw, { nullable: true })
  @ManyToOne(() => TournamentDraw, (tournamentDraw) => tournamentDraw.games, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'linkId' })
  declare tournamentDraw?: Relation<TournamentDraw>;

  @Field(() => CompetitionEncounter, { nullable: true })
  @ManyToOne(() => CompetitionEncounter, (competitionEncounter) => competitionEncounter.games, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'linkId' })
  declare competitionEncounter?: Relation<CompetitionEncounter>;
}
