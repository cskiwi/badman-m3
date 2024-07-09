import { Field, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Club } from './club.model';
import { Player } from './player.model';
import { ClubMembershipType } from '../enums';

@ObjectType('ClubPlayerMembership')
@Entity('ClubPlayerMemberships')
export class ClubPlayerMembership extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  declare id: number;

  @Column({ type: 'uuid' })
  declare playerId?: string;

  @Column({ type: 'uuid' })
  declare clubId?: string;

  @Field()
  @Column()
  declare end: Date;

  @Field()
  @Column()
  declare confirmed: boolean;

  @Field(() => String)
  @Column({
    type: 'simple-enum',
    enum: ClubMembershipType,
  })
  declare membershipType?: ClubMembershipType;

  @Field()
  @Column()
  declare start: Date;

  @ManyToOne(() => Player, (player) => player.clubPlayerMemberships)
  declare player: Player;

  @ManyToOne(() => Club, (club) => club.clubPlayerMembership)
  declare club: Club;

  // @Field()
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
