import { Field, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClubMembershipType } from '../enums';
import { Club } from './club.model';
import { Player } from './player.model';

@ObjectType('ClubPlayerMembership')
@Entity('ClubPlayerMemberships')
export class ClubPlayerMembership extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  declare id: number;

  @Column({ type: 'uuid' })
  declare playerId?: string;

  @Column({ type: 'uuid' })
  declare clubId?: string;

  @Field({ nullable: true })
  @Column()
  declare end: Date;

  @Field()
  @Column()
  declare start: Date;

  @Field()
  @Column()
  declare confirmed: boolean;

  @Field(() => String)
  @Column({
    type: 'simple-enum',
    enum: ClubMembershipType,
  })
  declare membershipType?: ClubMembershipType;

  @Field({ nullable: true })
  @ManyToOne(() => Player, (player) => player.clubPlayerMemberships)
  declare player: Player;

  @Field({ nullable: true })
  @ManyToOne(() => Club, (club) => club.clubPlayerMemberships)
  declare club: Club;

  @Field(() => Boolean)
  get active() {
    return this.isActiveFrom(new Date());
  }

  isActiveFrom(date: Date, shouldBeConfirmed = true) {
    if (shouldBeConfirmed && !this.confirmed) {
      return false;
    }
    return this.start <= date && (!this.end || this.end > date);
  }
}
