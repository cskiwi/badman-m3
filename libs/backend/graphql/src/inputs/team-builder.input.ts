import { Field, ID, InputType } from '@nestjs/graphql';

@InputType('TeamBuilderPlayerInput')
export class TeamBuilderPlayerInput {
  @Field(() => ID)
  declare playerId: string;

  @Field()
  declare membershipType: string;
}

@InputType('CreatePlayerForTeamBuilderInput')
export class CreatePlayerForTeamBuilderInput {
  @Field()
  declare firstName: string;

  @Field()
  declare lastName: string;

  @Field({ nullable: true })
  declare gender?: string;
}

@InputType('TeamBuilderTeamInput')
export class TeamBuilderTeamInput {
  @Field(() => ID, { nullable: true })
  declare teamId?: string;

  @Field()
  declare name: string;

  @Field()
  declare type: string;

  @Field({ nullable: true })
  declare teamNumber?: number;

  @Field({ nullable: true })
  declare preferredDay?: string;

  @Field({ nullable: true })
  declare captainId?: string;

  @Field(() => [TeamBuilderPlayerInput])
  declare players: TeamBuilderPlayerInput[];
}
