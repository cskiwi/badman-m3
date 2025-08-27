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

  @SortableField(() => ID)
  @WhereField(() => ID)
  @Column({ type: 'uuid' })
  @Index()
  declare playerId: string;

  @SortableField(() => ID)
  @WhereField(() => ID)
  @Column({ type: 'uuid' })
  @Index()
  declare claimId: string;

  @ManyToOne(() => Player)
  declare player: Relation<Player>;

  @ManyToOne(() => Claim)
  declare claim: Relation<Claim>;
}
