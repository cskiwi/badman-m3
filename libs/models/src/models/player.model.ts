import { Field, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn
} from 'typeorm';
import { ClubPlayerMembership } from './club-player-membership';
import { GamePlayerMembership } from './event/game-player-membership';
import { RankingLastPlace } from './ranking';
import { TeamPlayerMembership } from './team-player-membership';

@ObjectType('Player')
@Entity('Players')
@Index(['firstName', 'lastName'])
export class Player extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @Field()
  @CreateDateColumn()
  declare createdAt: Date;

  @Field({ nullable: true })
  @UpdateDateColumn({ nullable: true })
  declare updatedAt: Date;

  @Index({ unique: true })
  @Column({ unique: true })
  declare sub: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  declare firstName: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  declare lastName: string;

  @Index({ unique: true })
  @Field()
  @Column()
  declare slug: string;

  @Index({ unique: true })
  @Field({ nullable: true })
  @Column({ nullable: true })
  declare memberId: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  declare email: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  declare phone: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  declare gender: 'M' | 'F';

  @Field({ nullable: true })
  @Column({ nullable: true })
  declare birthDate: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  declare competitionPlayer: boolean;

  @Field()
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  @Field(() => [RankingLastPlace], { nullable: true })
  @OneToMany(
    () => RankingLastPlace,
    (rankingLastPlace) => rankingLastPlace.player,
  )
  declare rankingLastPlaces: Relation<RankingLastPlace[]>;

  @Field(() => [ClubPlayerMembership], { nullable: true })
  @OneToMany(
    () => ClubPlayerMembership,
    (clubPlayerMembership) => clubPlayerMembership.player,
  )
  declare clubPlayerMemberships?: Relation<ClubPlayerMembership[]>;

  @Field(() => [TeamPlayerMembership], { nullable: true })
  @OneToMany(
    () => TeamPlayerMembership,
    (teamPlayerMembership) => teamPlayerMembership.player,
  )
  declare teamPlayerMemberships: Relation<TeamPlayerMembership[]>;

  @Field(() => [GamePlayerMembership], { nullable: true })
  @OneToMany(
    () => GamePlayerMembership,
    (gamePlayerMembership) => gamePlayerMembership.gamePlayer,
  )
  declare gamePlayerMemberships: Relation<GamePlayerMembership[]>;
}
