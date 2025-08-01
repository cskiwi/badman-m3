import { Field, ID, InputType, ObjectType, OmitType, PartialType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToMany,
  JoinTable,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Relation,
} from 'typeorm';
import { Player } from '../player.model';
import { Role } from './role.model';
import { SecurityType } from '@app/models-enum';
import { SortableField, WhereField } from '@app/utils';

@ObjectType('Claim', { description: 'A Claim' })
@Entity({ name: 'Claims', schema: 'security' })
@Index('Claims_name_category', ['name', 'category'], {
  unique: true,
})
export class Claim extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @SortableField(() => Date, { nullable: true })
  @WhereField(() => Date, { nullable: true })
  @UpdateDateColumn({ nullable: true })
  updatedAt?: Date;

  @SortableField(() => Date, { nullable: true })
  @WhereField(() => Date, { nullable: true })
  @CreateDateColumn({ nullable: true })
  createdAt?: Date;

  @SortableField(() => String, { nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({ type: 'varchar', nullable: true })
  @Index()
  name?: string;

  @SortableField(() => String, { nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({ type: 'varchar', nullable: true })
  @Index()
  description?: string;

  @SortableField(() => String, { nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({ type: 'varchar', nullable: true })
  category?: string;

  @SortableField(() => String, { nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({ type: 'enum', enum: SecurityType, nullable: true })
  type?: SecurityType;

  @Field(() => [Player], { nullable: true })
  @ManyToMany(() => Player, (player) => player.claims, { nullable: true })
  @JoinTable({
    name: 'PlayerClaimMemberships',
    schema: 'security',
    joinColumn: { name: 'claimId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'playerId', referencedColumnName: 'id' },
  })
  players?: Relation<Player[]>;

  @Field(() => [Role], { nullable: true })
  @ManyToMany(() => Role, (role) => role.claims, { nullable: true })
  @JoinTable({
    name: 'RoleClaimMembership',
    schema: 'security',
    joinColumn: { name: 'claimId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'roleId', referencedColumnName: 'id' },
  })
  roles?: Relation<Role[]>;
}

@InputType()
export class ClaimUpdateInput extends PartialType(OmitType(Claim, ['createdAt', 'updatedAt'] as const), InputType) {}

@InputType()
export class ClaimNewInput extends PartialType(OmitType(ClaimUpdateInput, ['id'] as const), InputType) {}
