import { Field, ID, ObjectType } from '@nestjs/graphql';
import { BaseEntity, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { SortableField, WhereField } from '@app/utils';

@ObjectType('Notification', { description: 'User notification' })
@Entity('Notifications', { schema: 'personal' })
export class Notification extends BaseEntity {
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
  @Column({ type: 'uuid' })
  declare sendToId: string;

  @SortableField()
  @WhereField()
  @Column({ type: 'character varying', length: 255 })
  declare type: string;

  @SortableField()
  @WhereField()
  @Column({ type: 'character varying', length: 255 })
  declare linkType: string;

  @SortableField()
  @WhereField()
  @Column({ type: 'uuid' })
  declare linkId: string;

  @SortableField()
  @WhereField()
  @Column({ type: 'boolean' })
  declare read: boolean;

  @SortableField(() => String, { nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({ type: 'json', nullable: true })
  declare meta?: any;
}
