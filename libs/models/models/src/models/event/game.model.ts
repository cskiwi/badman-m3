import { Field, ID, ObjectType } from '@nestjs/graphql';
import { BaseEntity, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { GamePlayerMembership } from './game-player-membership';
import { GameStatus, GameType } from '@app/models/enums';
import { SortableField } from '@app/utils';
import { DrawTournament } from './tournament';

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

  // @SortableField()
  @OneToMany(() => GamePlayerMembership, (gamePlayerMembership) => gamePlayerMembership.gamePlayer)
  declare gamePlayerMemberships: GamePlayerMembership[];

  @ManyToOne(() => DrawTournament, { nullable: true, onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'linkId' })
  declare tournament?: DrawTournament;

  // @Field(() => EncounterCompetition, { nullable: true })
  // @ManyToOne(() => EncounterCompetition, { nullable: true, onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  // @JoinColumn({ name: 'linkId' })
  // competition?: EncounterCompetition;
}
