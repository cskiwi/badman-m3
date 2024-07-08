import { Field, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  Relation,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { ClubPlayerMembership } from './club-player-membership';
import { RankingLastPlace } from './ranking';
import { GamePlayerMembership } from './event/game-player-membership';

@ObjectType('Player')
@Entity('Players')
@Index(["firstName", "lastName"])
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

  // @Field()
  @OneToOne(
    () => RankingLastPlace,
    (rankingLastPlace) => rankingLastPlace.player,
  )
  declare rankingLastPlace: Relation<RankingLastPlace>;

  // @Field()
  @OneToMany(
    () => ClubPlayerMembership,
    (clubPlayerMembership) => clubPlayerMembership.player,
  )
  declare clubPlayerMemberships: ClubPlayerMembership[];
  // @Field()
  @OneToMany(
    () => GamePlayerMembership,
    (gamePlayerMembership) => gamePlayerMembership.gamePlayer,
  )
  declare gamePlayerMemberships: GamePlayerMembership[];
}
