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
import { SortableField, WhereField } from '@app/utils';

@ObjectType('Comment', { description: 'A Comment' })
@Entity('Comments')
export class Comment extends BaseEntity {
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
  @Column('text')
  @Index({ fulltext: true })
  declare message: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'uuid', nullable: true })
  declare playerId?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'uuid', nullable: true })
  declare clubId?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'uuid', nullable: true })
  declare linkId?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'character varying', length: 255, nullable: true })
  declare linkType?: string;
}