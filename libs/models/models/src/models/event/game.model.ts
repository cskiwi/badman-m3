import { Field, ID, ObjectType } from '@nestjs/graphql';
import { BaseEntity, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Relation, UpdateDateColumn } from 'typeorm';
import { GamePlayerMembership } from './game-player-membership';
import { GameStatus, GameType } from '@app/model/enums';
import { SortableField } from '@app/utils';
import { TournamentDraw } from './tournament/tournament-draw.model';
import { CompetitionEncounter } from './competition/competition-encounter.model';
import { RankingPoint } from '../ranking/ranking-point.model';

@ObjectType('Game', { description: 'A Game' })
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

  @SortableField({ nullable: true })
  @Column()
  declare set1Team1?: number;

  @SortableField({ nullable: true })
  @Column()
  declare set1Team2?: number;

  @SortableField({ nullable: true })
  @Column()
  declare set2Team1?: number;

  @SortableField({ nullable: true })
  @Column()
  declare set2Team2?: number;

  @SortableField({ nullable: true })
  @Column()
  declare set3Team1?: number;

  @SortableField({ nullable: true })
  @Column()
  declare set3Team2?: number;

  @SortableField({ nullable: true })
  @Column()
  declare winner?: number;

  @SortableField({ nullable: true })
  @Column()
  declare order?: number;

  @SortableField({ nullable: true })
  @Column()
  declare round?: string;

  @SortableField()
  @Column()
  declare linkId: string;

  @SortableField()
  @Column()
  declare linkType: string;

  @SortableField({ nullable: true })
  @Column()
  declare courtId?: string;

  @Field({ nullable: true })
  @Column()
  declare visualCode?: string;

  @Field(() => [GamePlayerMembership], { nullable: true })
  @OneToMany(() => GamePlayerMembership, (gamePlayerMembership) => gamePlayerMembership.game)
  declare gamePlayerMemberships: GamePlayerMembership[];

  @Field(() => [RankingPoint], { nullable: true })
  @OneToMany(() => RankingPoint, (rankingPoint) => rankingPoint.game)
  declare rankingPoints: Relation<RankingPoint[]>;

  @Field(() => TournamentDraw, { nullable: true })
  @ManyToOne(() => TournamentDraw, (tournamentDraw) => tournamentDraw.games, { nullable: true, onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'linkId' })
  declare tournamentDraw?: TournamentDraw;

  @Field(() => CompetitionEncounter, { nullable: true })
  @ManyToOne(() => CompetitionEncounter, (competitionEncounter) => competitionEncounter.games, { nullable: true, onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'linkId' })
  declare competitionEncounter?: CompetitionEncounter;
}
