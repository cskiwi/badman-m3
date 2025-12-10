import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class TournamentEventCreateInput {
  @Field(() => String)
  declare name: string;

  @Field(() => ID)
  declare clubId: string;

  @Field(() => Date, { nullable: true })
  declare firstDay?: Date;

  @Field(() => Date, { nullable: true })
  declare openDate?: Date;

  @Field(() => Date, { nullable: true })
  declare closeDate?: Date;

  @Field(() => Boolean, { nullable: true, defaultValue: false })
  declare official?: boolean;
}

@InputType()
export class TournamentEventUpdateInput {
  @Field(() => String, { nullable: true })
  declare name?: string;

  @Field(() => ID, { nullable: true })
  declare clubId?: string;

  @Field(() => Date, { nullable: true })
  declare firstDay?: Date;

  @Field(() => Date, { nullable: true })
  declare openDate?: Date;

  @Field(() => Date, { nullable: true })
  declare closeDate?: Date;

  @Field(() => Boolean, { nullable: true })
  declare official?: boolean;

  @Field(() => Date, { nullable: true })
  declare enrollmentOpenDate?: Date;

  @Field(() => Date, { nullable: true })
  declare enrollmentCloseDate?: Date;

  @Field(() => Boolean, { nullable: true })
  declare allowGuestEnrollments?: boolean;

  @Field(() => Boolean, { nullable: true })
  declare schedulePublished?: boolean;
}
