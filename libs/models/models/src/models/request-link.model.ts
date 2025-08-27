import { Field, ID, ObjectType } from '@nestjs/graphql';
import { BaseEntity, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { SortableField, WhereField } from '@app/utils';

@ObjectType('RequestLink', { description: 'A request link for password reset or email verification' })
@Entity('RequestLinks')
export class RequestLink extends BaseEntity {
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
  @Column({ type: 'character varying', length: 255 })
  @Index({ unique: true })
  declare requestId: string;

  @SortableField()
  @WhereField()
  @Column({ type: 'character varying', length: 255 })
  @Index({ unique: true })
  declare sub: string;

  @SortableField()
  @WhereField()
  @Column({ type: 'uuid' })
  declare playerId: string;

  @SortableField()
  @WhereField()
  @Column({ type: 'character varying', length: 255 })
  declare requestType: string;

  @SortableField()
  @WhereField()
  @Column({ type: 'timestamptz' })
  declare expiresAt: Date;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ default: false })
  declare isUsed?: boolean;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'timestamptz' })
  declare usedAt?: Date;
}
