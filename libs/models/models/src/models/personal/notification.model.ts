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

@ObjectType('Notification', { description: 'User notification' })
@Entity('Notifications')
export class Notification extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @SortableField()
  @WhereField()
  @CreateDateColumn()
  declare createdAt: Date;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @UpdateDateColumn({ nullable: true })
  declare updatedAt: Date;

  @SortableField()
  @WhereField()
  @Column()
  @Index()
  declare playerId: string;

  @SortableField()
  @WhereField()
  @Column()
  declare title: string;

  @SortableField()
  @WhereField()
  @Column('text')
  declare message: string;

  @SortableField()
  @WhereField()
  @Column()
  declare type: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare linkId?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare linkType?: string;

  @SortableField()
  @WhereField()
  @Column({ default: false })
  @Index()
  declare isRead: boolean;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare readAt?: Date;

  @SortableField()
  @WhereField()
  @Column({ default: 'normal' })
  declare priority: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare expiresAt?: Date;
}