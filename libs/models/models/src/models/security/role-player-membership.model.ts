import { Field, ID, ObjectType } from '@nestjs/graphql';
import { BaseEntity, Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, Relation } from 'typeorm';
import { Player } from '../player.model';
import { Role } from './role.model';

@ObjectType('PlayerRoleMembership', { description: 'A PlayerRoleMembership' })
@Entity({ name: 'PlayerRoleMemberships', schema: 'security' })
export class PlayerRoleMembership extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @Field(() => Date)
  @UpdateDateColumn({ type: 'timestamptz' })
  declare updatedAt: Date;

  @Field(() => Date)
  @CreateDateColumn({ type: 'timestamptz' })
  declare createdAt: Date;

  @Field(() => ID)
  @Column({ type: 'uuid' })
  @Index()
  declare playerId: string;

  @Field(() => ID)
  @Column({ type: 'uuid' })
  @Index()
  declare roleId: string;

  @ManyToOne(() => Player, { createForeignKeyConstraints: false })
  declare player: Relation<Player>;

  @ManyToOne(() => Role, { createForeignKeyConstraints: false })
  declare role: Relation<Role>;
}
