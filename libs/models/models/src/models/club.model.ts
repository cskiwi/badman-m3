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
import { UseForTeamName } from '@app/models/enums';
import { ClubPlayerMembership } from './club-player-membership';
import { Team } from './team.model';

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

  @Field(() => String)
  @Column({
    type: 'simple-enum',
    enum: UseForTeamName,
    default: UseForTeamName.TEAM_NAME,
  })
  declare useForTeamName: UseForTeamName;

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
  declare state?: string;

  @Field()
  @Column()
  declare country?: string;

  @Field(() => ClubPlayerMembership)
  @OneToMany(
    () => ClubPlayerMembership,
    (clubPlayerMembership) => clubPlayerMembership.player,
  )
  declare clubPlayerMemberships: ClubPlayerMembership[];

  @Field(() => [Team])
  @OneToMany(() => Team, (team) => team.club)
  declare teams?: Team[];
}
