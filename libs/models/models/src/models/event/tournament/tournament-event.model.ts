import { SortableField } from '@app/utils';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Entity, BaseEntity, CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn, Column, OneToMany } from 'typeorm';
import { TournamentSubEvent } from './tournament-sub-event.model';

@Entity('EventTournaments', { schema: 'event' })
@ObjectType('TournamentEvent', { description: 'A TournamentEvent' })
export class TournamentEvent extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @SortableField()
  @CreateDateColumn()
  declare createdAt: Date;

  @SortableField({ nullable: true })
  @UpdateDateColumn({ nullable: true })
  declare updatedAt: Date;

  @SortableField(() => String, { nullable: true })
  @Column()
  declare tournamentNumber: string;

  @SortableField(() => String, { nullable: true })
  @Column()
  declare name: string;

  @SortableField(() => Date, { nullable: true })
  @Column()
  declare firstDay: Date;

  @SortableField(() => Date, { nullable: true })
  @Column()
  declare lastSync: Date;

  @SortableField(() => Date, { nullable: true })
  @Column()
  declare openDate: Date;

  @SortableField(() => Date, { nullable: true })
  @Column()
  declare closeDate: Date;

  @SortableField(() => String, { nullable: true })
  @Column()
  declare dates: string;

  @SortableField(() => String, { nullable: true })
  @Column()
  declare visualCode: string;

  @SortableField(() => String, { nullable: true })
  @Column()
  declare slug: string;

  @SortableField(() => Boolean, { nullable: true })
  @Column()
  declare official: boolean;

  @SortableField(() => String, { nullable: true })
  @Column()
  declare state: string;

  @SortableField(() => String, { nullable: true })
  @Column()
  declare country: string;

  @OneToMany(() => TournamentSubEvent, (tournamentSubEvent) => tournamentSubEvent.tournamentEvent, { cascade: true, onDelete: 'CASCADE' })
  declare tournamentSubEvents?: TournamentSubEvent[];
}
