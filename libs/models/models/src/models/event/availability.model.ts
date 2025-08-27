import { Field, ID, ObjectType } from '@nestjs/graphql';
import { BaseEntity, Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Relation, UpdateDateColumn } from 'typeorm';
import { SortableField, WhereField } from '@app/utils';

@ObjectType('Availability', { description: 'Player availability for events' })
@Entity('Availabilities', { schema: 'event' })
export class Availability extends BaseEntity {
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

  @SortableField(() => String, { nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({ type: 'json', nullable: true })
  declare exceptions?: any;

  @SortableField(() => String)
  @WhereField(() => String)
  @Column({ type: 'json' })
  declare days: any;

  @SortableField()
  @WhereField()
  @Column()
  declare season: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'uuid', nullable: true })
  declare locationId?: string;
}
