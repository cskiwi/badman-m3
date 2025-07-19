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

@ObjectType('Comment', { description: 'A Comment' })
@Entity('Comments')
export class Comment extends BaseEntity {
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
  @Column('text')
  @Index({ fulltext: true })
  declare message: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare playerId?: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare linkId?: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare linkType?: string;
}