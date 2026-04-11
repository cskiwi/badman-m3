import { Field, ID, InputType } from '@nestjs/graphql';

@InputType('AssemblyInput')
export class AssemblyInput {
  @Field(() => ID, { nullable: true })
  declare encounterId?: string;

  @Field(() => ID)
  declare teamId: string;

  @Field(() => ID, { nullable: true })
  declare systemId?: string;

  @Field(() => ID, { nullable: true })
  declare captainId?: string;

  @Field(() => ID, { nullable: true })
  declare single1?: string;

  @Field(() => ID, { nullable: true })
  declare single2?: string;

  @Field(() => ID, { nullable: true })
  declare single3?: string;

  @Field(() => ID, { nullable: true })
  declare single4?: string;

  @Field(() => [ID], { nullable: 'itemsAndList' })
  declare double1?: string[];

  @Field(() => [ID], { nullable: 'itemsAndList' })
  declare double2?: string[];

  @Field(() => [ID], { nullable: 'itemsAndList' })
  declare double3?: string[];

  @Field(() => [ID], { nullable: 'itemsAndList' })
  declare double4?: string[];

  @Field(() => [ID], { nullable: 'itemsAndList' })
  declare subtitudes?: string[];

  @Field(() => String, { nullable: true })
  declare description?: string;

  @Field(() => Boolean, { nullable: true })
  declare isComplete?: boolean;
}
