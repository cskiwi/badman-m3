import { Field, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@ObjectType('Player')
@Entity('Players')
@Unique(['sub'])
export class Player extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  sub!: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  firstName?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  lastName?: string;

  
  @Field({ nullable: true })
  @Column({ nullable: true })
  slug?: string;

  
  @Field({ nullable: true })
  @Column({ nullable: true })
  memberId?: string;


  @Field()
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
