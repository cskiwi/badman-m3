import { Field, Float, ID, ObjectType } from '@nestjs/graphql';
import { BaseEntity, Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, Relation, UpdateDateColumn } from 'typeorm';
import { SortableField, WhereField } from '@app/utils';
import { Court } from './court.model';

@ObjectType('Location', { description: 'A location where events are held' })
@Entity('Locations', { schema: 'event' })
export class Location extends BaseEntity {
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

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'character varying', length: 255, nullable: true })
  @Index({ fulltext: true })
  declare name?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'character varying', length: 255 })
  declare street?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'character varying', length: 255 })
  declare streetNumber?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'character varying', length: 255 })
  declare postalcode?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'character varying', length: 255 })
  declare city?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'character varying', length: 255 })
  declare address?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'character varying', length: 255 })
  declare state?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'character varying', length: 255 })
  declare fax?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'character varying', length: 255 })
  declare phone?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'uuid' })
  declare clubId?: string;

  @SortableField(() => [Float], { nullable: true })
  @WhereField(() => [Float], { nullable: true })
  @Column({ type: 'geometry', nullable: true })
  declare coordinates?: number[];

  @Field(() => [Court], { nullable: true })
  @OneToMany(() => Court, (court) => court.locationId)
  declare courts?: Relation<Court[]>;
}
