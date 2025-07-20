import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Relation,
} from 'typeorm';
import { Claim } from './claim.model';
import { Role } from './role.model';
import { SortableField, WhereField } from '@app/utils';

@ObjectType('RoleClaimMembership', { description: 'A RoleClaimMembership' })
@Entity({ name: 'RoleClaimMemberships', schema: 'security' })
export class RoleClaimMembership extends BaseEntity {
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

  @SortableField(() => ID, { nullable: true })
  @WhereField(() => ID, { nullable: true })
  @Column({ type: 'uuid', nullable: true })
  @Index()
  roleId?: string;

  @SortableField(() => ID, { nullable: true })
  @WhereField(() => ID, { nullable: true })
  @Column({ type: 'uuid', nullable: true })
  @Index()
  claimId?: string;

  @ManyToOne(() => Role, { nullable: true })
  role?: Relation<Role>;

  @ManyToOne(() => Claim, { nullable: true })
  claim?: Relation<Claim>;
}
