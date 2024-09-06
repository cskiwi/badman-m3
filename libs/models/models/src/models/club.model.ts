import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { UseForTeamName } from '@app/models/enums';
import { ClubPlayerMembership } from './club-player-membership';
import { Team } from './team.model';
import { SortableField } from '@app/utils';

@ObjectType('Club')
@Entity('Clubs')
@Unique(['clubId'])
export class Club extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @SortableField()
  @CreateDateColumn()
  declare createdAt: Date;

  @SortableField({ nullable: true })
  @UpdateDateColumn({ nullable: true })
  declare updatedAt: Date;

  @SortableField()
  @Column()
  @Index({ fulltext: true })
  declare name: string;

  @SortableField()
  @Column()
  declare teamName: string;

  @SortableField()
  @Column({nullable: true})
  declare fullName?: string;

  @SortableField()
  @Column()
  declare contactCompetition: string;

  @SortableField(() => String)
  @Column({
    type: 'simple-enum',
    enum: UseForTeamName,
    default: UseForTeamName.TEAM_NAME,
  })
  declare useForTeamName: UseForTeamName;

  @SortableField()
  @Column()
  declare abbreviation: string;

  @SortableField()
  @Column()
  declare clubId: number;

  @SortableField()
  @Column()
  declare slug: string;

  @SortableField()
  @Column()
  declare state?: string;

  @SortableField()
  @Column()
  declare country?: string;

  @SortableField(() => ClubPlayerMembership)
  @OneToMany(
    () => ClubPlayerMembership,
    (clubPlayerMembership) => clubPlayerMembership.player,
  )
  declare clubPlayerMemberships: ClubPlayerMembership[];

  @SortableField(() => [Team])
  @OneToMany(() => Team, (team) => team.club)
  declare teams?: Team[];
}
