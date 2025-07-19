import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';
import { SortableField } from '@app/utils';
import { Court } from './court.model';

@ObjectType('Location', { description: 'A location where events are held' })
@Entity('Locations')
export class Location extends BaseEntity {
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

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare street?: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare streetNumber?: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare postalCode?: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare city?: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare state?: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare country?: string;

  @SortableField({ nullable: true })
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  declare latitude?: number;

  @SortableField({ nullable: true })
  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  declare longitude?: number;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare phone?: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare email?: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare website?: string;

  @Field(() => [Court], { nullable: true })
  @OneToMany(() => Court, (court) => court.locationId)
  declare courts?: Relation<Court[]>;
}