import { Field, ID, ObjectType } from '@nestjs/graphql';
import { BaseEntity, Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, Relation, Unique, UpdateDateColumn } from 'typeorm';
import { ClubPlayerMembership } from './club-player-membership';
import { Team } from './team.model';
import { SortableField, WhereField } from '@app/utils';
import { UseForTeamName } from '@app/models-enum';

@ObjectType('Club', { description: 'A Club' })
@Entity('Clubs')
@Unique(['clubId'])
export class Club extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @SortableField()
  @WhereField()
  @CreateDateColumn({ type: 'timestamptz' })
  declare createdAt: Date;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @UpdateDateColumn({ type: 'timestamptz' })
  declare updatedAt: Date;

  @SortableField()
  @WhereField()
  @Column({ type: 'character varying', length: 255 })
  @Index({ fulltext: true })
  declare name: string;

  @SortableField()
  @WhereField()
  @Column({ type: 'character varying', length: 255 })
  declare teamName: string;

  @SortableField()
  @WhereField({ nullable: true })
  @Column({ type: 'character varying', length: 255, nullable: true })
  declare fullName?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'character varying', length: 255, nullable: true })
  declare contactCompetition: string;

  @SortableField(() => String)
  @WhereField(() => String)
  @Column({ type: 'simple-enum', enum: UseForTeamName })
  declare useForTeamName: UseForTeamName;

  @SortableField()
  @WhereField()
  @Column({ type: 'character varying', length: 255 })
  declare abbreviation: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare clubId?: number;

  @SortableField()
  @WhereField()
  @Column({ type: 'character varying', length: 255 })
  declare slug: string;

  @SortableField()
  @WhereField({ nullable: true })
  @Column({ type: 'character varying', length: 255, nullable: true })
  declare state?: string;

  @SortableField()
  @WhereField({ nullable: true })
  @Column({ type: 'character varying', length: 255, nullable: true })
  declare country?: string;

  @SortableField(() => ClubPlayerMembership)
  @OneToMany(() => ClubPlayerMembership, (clubPlayerMembership) => clubPlayerMembership.player)
  declare clubPlayerMemberships: Relation<ClubPlayerMembership[]>;

  @SortableField(() => [Team])
  @OneToMany(() => Team, (team) => team.club)
  declare teams?: Relation<Team[]>;

  @Field(() => [Number], { nullable: true })
  declare distinctSeasons?: number[];
}
