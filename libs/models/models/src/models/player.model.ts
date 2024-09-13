import { SortableField } from '@app/utils';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';
import { ClubPlayerMembership } from './club-player-membership';
import { GamePlayerMembership } from './event/game-player-membership';
import { RankingLastPlace } from './ranking';
import { TeamPlayerMembership } from './team-player-membership';

@ObjectType('Player')
@Entity('Players')
@Index(['firstName', 'lastName'])
export class Player extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @SortableField()
  @CreateDateColumn()
  declare createdAt: Date;

  @SortableField({ nullable: true })
  @UpdateDateColumn({ nullable: true })
  declare updatedAt: Date;

  @Index({ unique: true })
  @Column({ unique: true })
  declare sub: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  @Index({ fulltext: true })
  declare firstName: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  @Index({ fulltext: true })
  declare lastName: string;

  @Index({ unique: true })
  @SortableField()
  @Column()
  declare slug: string;

  @Index({ unique: true })
  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare memberId: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare email: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare phone: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare gender: 'M' | 'F';

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare birthDate: Date;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare competitionPlayer: boolean;

  @SortableField()
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  @Field(() => [RankingLastPlace], { nullable: true })
  @OneToMany(() => RankingLastPlace, (membership) => membership.player)
  declare rankingLastPlaces: Relation<RankingLastPlace[]>;

  @Field(() => [ClubPlayerMembership], { nullable: true })
  @OneToMany(() => ClubPlayerMembership, (membership) => membership.player)
  declare clubPlayerMemberships?: Relation<ClubPlayerMembership[]>;

  @Field(() => [TeamPlayerMembership], { nullable: true })
  @OneToMany(() => TeamPlayerMembership, (membership) => membership.player)
  declare teamPlayerMemberships: Relation<TeamPlayerMembership[]>;

  @Field(() => [GamePlayerMembership], { nullable: true })
  @OneToMany(() => GamePlayerMembership, (membership) => membership.gamePlayer)
  declare gamePlayerMemberships: Relation<GamePlayerMembership[]>;
  async getPermissions(): Promise<string[]> {
    // let claims = (await this.getClaims()).map((r) => r.name);
    // const roles = await this.getRoles({
    //   include: [Claim],
    // });
    // claims = [
    //   ...claims,
    //   ...roles.map((r) => r?.claims?.map((c) => `${r.linkId}_${c.name}`)).flat(),
    // ].filter((x) => x !== null && x !== undefined);

    return [] as string[];
  }

  async hasAnyPermission(requiredPermissions: string[]) {
    const claims = await this.getPermissions();
    if (claims === null) {
      return false;
    }

    return requiredPermissions.some((perm) =>
      claims.some((claim) => claim === perm),
    );
  }

  async hasAllPermission(requiredPermissions: string[]) {
    const claims = await this.getPermissions();
    if (claims === null) {
      return false;
    }

    return requiredPermissions.every((perm) =>
      claims.some((claim) => claim === perm),
    );
  }
}
