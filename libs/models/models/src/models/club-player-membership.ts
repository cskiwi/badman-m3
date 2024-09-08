import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClubMembershipType } from '@app/models/enums';
import { Club } from './club.model';
import { Player } from './player.model';
import { SortableField } from '@app/utils';

@ObjectType('ClubPlayerMembership')
@Entity('ClubPlayerMemberships')
export class ClubPlayerMembership extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @SortableField()
  @Column({ type: 'uuid' })
  declare playerId?: string;

  @SortableField()
  @Column({ type: 'uuid' })
  declare clubId?: string;

  @SortableField({ nullable: true })
  @Column()
  declare end: Date;

  @SortableField()
  @Column()
  declare start: Date;

  @SortableField()
  @Column()
  declare confirmed: boolean;

  @SortableField(() => String)
  @Column({
    type: 'simple-enum',
    enum: ClubMembershipType,
  })
  declare membershipType?: ClubMembershipType;

  @SortableField({ nullable: true })
  @ManyToOne(() => Player, (player) => player.clubPlayerMemberships)
  declare player: Player;

  @SortableField({ nullable: true })
  @ManyToOne(() => Club, (club) => club.clubPlayerMemberships)
  declare club: Club;

  @SortableField(() => Boolean)
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
