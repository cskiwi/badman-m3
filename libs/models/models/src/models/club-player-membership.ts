import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClubMembershipType } from '@app/model/enums';
import { Club } from './club.model';
import { Player } from './player.model';
import { SortableField, WhereField } from '@app/utils';

@ObjectType('ClubPlayerMembership')
@Entity('ClubPlayerMemberships')
export class ClubPlayerMembership extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @SortableField()
  @WhereField()
  @Column({ type: 'uuid' })
  declare playerId?: string;

  @SortableField()
  @WhereField()
  @Column({ type: 'uuid' })
  declare clubId?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare end: Date;

  @SortableField()
  @WhereField()
  @Column()
  declare start: Date;

  @SortableField()
  @WhereField()
  @Column()
  declare confirmed: boolean;

  @SortableField(() => String)
  @WhereField(() => String)
  @Column({
    type: 'simple-enum',
    enum: ClubMembershipType,
  })
  declare membershipType?: ClubMembershipType;

  @Field(() => Player, { nullable: true })
  @ManyToOne(() => Player, (player) => player.clubPlayerMemberships)
  declare player: Player;

  @Field(() => Club, { nullable: true })
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
