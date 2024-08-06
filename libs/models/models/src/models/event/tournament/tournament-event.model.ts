import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  Entity,
  BaseEntity,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Column,
} from 'typeorm';

@Entity('EventTournaments', { schema: 'event' })
@ObjectType({ description: 'A EventTournament' })
export class EventTournament extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @Field()
  @CreateDateColumn()
  declare createdAt: Date;

  @Field({ nullable: true })
  @UpdateDateColumn({ nullable: true })
  declare updatedAt: Date;

  @Field(() => String, { nullable: true })
  @Column()
  declare tournamentNumber: string;

  @Field(() => String, { nullable: true })
  @Column()
  declare name: string;

  @Field(() => Date, { nullable: true })
  @Column()
  declare firstDay: Date;

  @Field(() => Date, { nullable: true })
  @Column()
  declare lastSync: Date;

  @Field(() => Date, { nullable: true })
  @Column()
  declare openDate: Date;

  @Field(() => Date, { nullable: true })
  @Column()
  declare closeDate: Date;

  @Field(() => String, { nullable: true })
  @Column()
  declare dates: string;

  @Field(() => String, { nullable: true })
  @Column()
  declare visualCode: string;

  @Field(() => String, { nullable: true })
  @Column()
  declare slug: string;

  @Field(() => Boolean, { nullable: true })
  @Column()
  declare official: boolean;

  @Field(() => String, { nullable: true })
  @Column()
  declare state: string;

  @Field(() => String, { nullable: true })
  @Column()
  declare country: string;
}
