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

@ObjectType('Notification', { description: 'User notification' })
@Entity('Notifications')
export class Notification extends BaseEntity {
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
  declare playerId: string;

  @SortableField()
  @Column()
  declare title: string;

  @SortableField()
  @Column('text')
  declare message: string;

  @SortableField()
  @Column()
  declare type: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare linkId?: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare linkType?: string;

  @SortableField()
  @Column({ default: false })
  @Index()
  declare isRead: boolean;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare readAt?: Date;

  @SortableField()
  @Column({ default: 'normal' })
  declare priority: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare expiresAt?: Date;
}