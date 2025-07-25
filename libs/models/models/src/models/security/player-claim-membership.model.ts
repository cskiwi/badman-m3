import { Field, ID, ObjectType } from '@nestjs/graphql';
import { BaseEntity, Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { Player } from '../player.model';
import { Claim } from './claim.model';
import { SortableField, WhereField } from '@app/utils';

@ObjectType('PlayerClaimMembership', { description: 'A PlayerClaimMembership' })
@Entity('PlayerClaimMemberships', { schema: 'security' })
export class PlayerClaimMembership extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @SortableField(() => ID, { nullable: true })
  @WhereField(() => ID, { nullable: true })
  @Column({ type: 'uuid', nullable: true })
  @Index()
  playerId?: string;

  @SortableField(() => ID, { nullable: true })
  @WhereField(() => ID, { nullable: true })
  @Column({ type: 'uuid', nullable: true })
  @Index()
  claimId?: string;

  @ManyToOne(() => Player, { nullable: true })
  player?: Relation<Player>;

  @ManyToOne(() => Claim, { nullable: true })
  claim?: Relation<Claim>;
}
