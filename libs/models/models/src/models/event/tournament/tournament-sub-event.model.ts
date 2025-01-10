import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { DrawTournament } from './tournament-draw.model';
import { EventTournament } from './tournament-event.model';

ObjectType('SubEventTournament', {
  description: 'A SubEventTournament',
});
@Entity('SubEventTournaments', { schema: 'event' })
export class SubEventTournament extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  updatedAt?: Date;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  createdAt?: Date;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  @Column({ type: 'enum', enum: ['M', 'F', 'MX', 'MINIBAD'], nullable: true })
  eventType?: string;

  @Field(() => String, { nullable: true })
  @Column({ type: 'enum', enum: ['S', 'D', 'MX'], nullable: true })
  gameType?: string;

  @Field(() => Int, { nullable: true })
  @Column({ type: 'int', nullable: true })
  level?: number;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', nullable: true })
  visualCode?: string;

  @OneToMany(() => DrawTournament, (drawTournament) => drawTournament.subEventTournament, { cascade: true, onDelete: 'CASCADE' })
  drawTournaments?: DrawTournament[];

  @ManyToOne(() => EventTournament, (eventTournament) => eventTournament.subEventTournaments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  eventTournament?: EventTournament;

  @Field(() => ID, { nullable: true })
  @Column({ type: 'uuid', nullable: true })
  eventId?: string;

  // @Field(() => [EventEntry], { nullable: true })
  // @OneToMany(() => EventEntry, (eventEntry) => eventEntry.subEventTournament, { cascade: true, onDelete: 'CASCADE' })
  // eventEntries?: EventEntry[];
}
