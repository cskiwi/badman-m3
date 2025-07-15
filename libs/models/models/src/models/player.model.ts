import { SortableField } from '@app/utils';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';
import { ClubPlayerMembership } from './club-player-membership';
import { GamePlayerMembership } from './event/game-player-membership';
import { RankingLastPlace } from './ranking';
import { TeamPlayerMembership } from './team-player-membership';
import { Role } from './security/role.model';
import { Claim } from './security/claim.model';

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

  @Field(() => [Role], { nullable: true })
  @ManyToMany(() => Role, (role) => role.players, { nullable: true })
  declare roles?: Relation<Role[]>;

  @Field(() => [Claim], { nullable: true })
  @ManyToMany(() => Claim, (claim) => claim.players, { nullable: true })
  @JoinTable({
    name: 'PlayerClaimMemberships',
    schema: 'security',
    joinColumn: { name: 'playerId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'claimId', referencedColumnName: 'id' },
  })
  declare claims?: Relation<Claim[]>;

  /**
   * Permissions for the player, exposed via GraphQL.
   */
  @Field(() => [String], { nullable: true })
  get permissions(): string[] {
    // This should be resolved via a resolver, not directly here.
    return [];
  }

  //  only run these on the server side
  hasAnyPermission(requiredPermissions: string[]) {
    const claims = this.permissions;

    if (claims === null) {
      return false;
    }

    return requiredPermissions.some((perm) => claims.some((claim) => claim === perm));
  }

  hasAllPermission(requiredPermissions: string[]) {
    const claims = this.permissions;
    if (claims === null) {
      return false;
    }

    return requiredPermissions.every((perm) => claims.some((claim) => claim === perm));
  }
}
