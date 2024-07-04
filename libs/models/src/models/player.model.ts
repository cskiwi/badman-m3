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
  declare id: string;

  @Column({ unique: true })
  declare sub: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  declare firstName: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  declare lastName: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  declare slug: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  declare memberId: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  declare email: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  declare phone: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  declare gender: 'M' | 'F';

  @Field({ nullable: true })
  @Column({ nullable: true })
  declare birthDate: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  declare competitionPlayer: boolean;

  @Field()
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
