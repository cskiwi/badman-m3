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

@ObjectType('RoleClaimMembership')
@Entity({ name: 'RoleClaimMemberships', schema: 'security' })
export class RoleClaimMembership extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Field(() => Date, { nullable: true })
  @UpdateDateColumn({ nullable: true })
  updatedAt?: Date;

  @Field(() => Date, { nullable: true })
  @CreateDateColumn({ nullable: true })
  createdAt?: Date;

  @Field(() => ID, { nullable: true })
  @Column({ type: 'uuid', nullable: true })
  @Index()
  roleId?: string;

  @Field(() => ID, { nullable: true })
  @Column({ type: 'uuid', nullable: true })
  @Index()
  claimId?: string;

  @ManyToOne(() => Role, { nullable: true })
  role?: Relation<Role>;

  @ManyToOne(() => Claim, { nullable: true })
  claim?: Relation<Claim>;
}
