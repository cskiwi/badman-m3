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
import { UseForTeamName } from '@app/model/enums';
import { ClubPlayerMembership } from './club-player-membership';
import { Team } from './team.model';
import { SortableField, WhereField } from '@app/utils';

@ObjectType('Club', { description: 'A Club' })
@Entity('Clubs')
@Unique(['clubId'])
export class Club extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @SortableField()
  @WhereField()
  @CreateDateColumn()
  declare createdAt: Date;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @UpdateDateColumn({ nullable: true })
  declare updatedAt: Date;

  @SortableField()
  @WhereField()
  @Column()
  @Index({ fulltext: true })
  declare name: string;

  @SortableField()
  @WhereField()
  @Column()
  declare teamName: string;

  @SortableField()
  @WhereField({ nullable: true })
  @Column({nullable: true})
  declare fullName?: string;

  @SortableField()
  @WhereField()
  @Column()
  declare contactCompetition: string;

  @SortableField(() => String)
  @WhereField(() => String)
  @Column({
    type: 'simple-enum',
    enum: UseForTeamName,
    default: UseForTeamName.TEAM_NAME,
  })
  declare useForTeamName: UseForTeamName;

  @SortableField()
  @WhereField()
  @Column()
  declare abbreviation: string;

  @SortableField()
  @WhereField()
  @Column()
  declare clubId: number;

  @SortableField()
  @WhereField()
  @Column()
  declare slug: string;

  @SortableField()
  @WhereField({ nullable: true })
  @Column()
  declare state?: string;

  @SortableField()
  @WhereField({ nullable: true })
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
