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
import { Player } from '../player.model';
import { Role } from './role.model';

@ObjectType('PlayerRoleMembership', { description: 'A PlayerRoleMembership' })
@Entity({ name: 'PlayerRoleMemberships', schema: 'security' })
export class PlayerRoleMembership extends BaseEntity {
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
  playerId?: string;

  @Field(() => ID, { nullable: true })
  @Column({ type: 'uuid', nullable: true })
  @Index()
  roleId?: string;

  @ManyToOne(() => Player, { nullable: true })
  player?: Relation<Player>;

  @ManyToOne(() => Role, { nullable: true })
  role?: Relation<Role>;
}
