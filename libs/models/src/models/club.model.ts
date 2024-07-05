import { Field, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { ClubPlayerMembership } from './club-player-membership';

@ObjectType('Club')
@Entity('Clubs')
@Unique(['clubId'])
export class Club extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @Field()
  @CreateDateColumn()
  declare createdAt: Date;

  @Field({ nullable: true })
  @UpdateDateColumn({ nullable: true })
  declare updatedAt: Date;

  @Field()
  @Column()
  declare name: string;

  @Field()
  @Column()
  declare teamName: string;

  @Field()
  @Column()
  declare fullName: string;

  @Field()
  @Column()
  declare contactCompetition: string;

  // @Field(() => String, { defaultValue: UseForTeamName.TEAM_NAME })
  // @Column({type: 'varchar'})
  // declare useForTeamName: UseForTeamName;

  @Field()
  @Column()
  declare abbreviation: string;

  @Field()
  @Column()
  declare clubId: number;

  @Field()
  @Column()
  declare slug: string;

  @Field()
  @Column()
  declare state: string;

  @Field()
  @Column()
  declare country: string;

  // @Field()
  @OneToMany(
    () => ClubPlayerMembership,
    (clubPlayerMembership) => clubPlayerMembership.player,
  )
  declare clubPlayerMembership: ClubPlayerMembership[];
}
