import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';
import { SortableField } from '@app/utils';

@ObjectType('Court', { description: 'A court at a location' })
@Entity('Courts')
export class Court extends BaseEntity {
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
  declare description?: string;

  @SortableField()
  @Column()
  @Index()
  declare locationId: string;

  @SortableField({ nullable: true })
  @Column({ type: 'int', nullable: true })
  declare courtNumber?: number;

  @SortableField({ nullable: true })
  @Column({ default: true })
  declare isActive?: boolean;

  @SortableField({ nullable: true })
  @Column({ type: 'int', default: 0 })
  declare sortOrder?: number;
}