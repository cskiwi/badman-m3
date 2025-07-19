import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SortableField } from '@app/utils';

@ObjectType('Standing', { description: 'Standing position in a competition' })
@Entity('Standings')
export class Standing extends BaseEntity {
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
  @Index()
  declare eventId: string;

  @SortableField()
  @Column()
  @Index()
  declare subEventId: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  @Index()
  declare playerId?: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  @Index()
  declare teamId?: string;

  @SortableField()
  @Column({ type: 'int' })
  declare position: number;

  @SortableField({ nullable: true })
  @Column({ type: 'int', nullable: true })
  declare played?: number;

  @SortableField({ nullable: true })
  @Column({ type: 'int', nullable: true })
  declare won?: number;

  @SortableField({ nullable: true })
  @Column({ type: 'int', nullable: true })
  declare lost?: number;

  @SortableField({ nullable: true })
  @Column({ type: 'int', nullable: true })
  declare gamesWon?: number;

  @SortableField({ nullable: true })
  @Column({ type: 'int', nullable: true })
  declare gamesLost?: number;

  @SortableField({ nullable: true })
  @Column({ type: 'int', nullable: true })
  declare setsWon?: number;

  @SortableField({ nullable: true })
  @Column({ type: 'int', nullable: true })
  declare setsLost?: number;

  @SortableField({ nullable: true })
  @Column({ type: 'int', nullable: true })
  declare points?: number;
}