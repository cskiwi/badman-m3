import { Field, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@ObjectType('AppUser')
@Entity('AppUser')
@Unique(['sub'])
export class AppUser extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  sub!: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  name?: string;
}
