import { Field, ID, ObjectType } from '@nestjs/graphql';
import { BaseEntity, Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, Relation } from 'typeorm';
import { Claim } from './claim.model';
import { Role } from './role.model';
import { SortableField, WhereField } from '@app/utils';

@ObjectType('RoleClaimMembership', { description: 'A RoleClaimMembership' })
@Entity({ name: 'RoleClaimMemberships', schema: 'security' })
export class RoleClaimMembership extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @SortableField(() => Date)
  @WhereField(() => Date)
  @UpdateDateColumn({ type: 'timestamptz' })
  declare updatedAt: Date;

  @SortableField(() => Date)
  @WhereField(() => Date)
  @CreateDateColumn({ type: 'timestamptz' })
  declare createdAt: Date;

  @SortableField(() => ID)
  @WhereField(() => ID)
  @Column({ type: 'uuid' })
  @Index()
  declare roleId: string;

  @SortableField(() => ID)
  @WhereField(() => ID)
  @Column({ type: 'uuid' })
  @Index()
  declare claimId: string;

  @ManyToOne(() => Role)
  declare role: Relation<Role>;

  @ManyToOne(() => Claim)
  declare claim: Relation<Claim>;
}
