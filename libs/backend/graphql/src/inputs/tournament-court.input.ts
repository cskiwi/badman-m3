import { Field, ID, InputType, Int } from '@nestjs/graphql';

@InputType('StartGameInput')
export class StartGameInput {
  @Field(() => ID, { description: 'Game ID to start' })
  gameId!: string;

  @Field(() => ID, { nullable: true, description: 'Court ID (if not already assigned)' })
  courtId?: string;
}

@InputType('UpdateGameScoreInput')
export class UpdateGameScoreInput {
  @Field(() => ID, { description: 'Game ID' })
  gameId!: string;

  @Field(() => Int, { nullable: true })
  set1Team1?: number;

  @Field(() => Int, { nullable: true })
  set1Team2?: number;

  @Field(() => Int, { nullable: true })
  set2Team1?: number;

  @Field(() => Int, { nullable: true })
  set2Team2?: number;

  @Field(() => Int, { nullable: true })
  set3Team1?: number;

  @Field(() => Int, { nullable: true })
  set3Team2?: number;
}

@InputType('CompleteGameInput')
export class CompleteGameInput {
  @Field(() => ID, { description: 'Game ID' })
  gameId!: string;

  @Field(() => Int, { nullable: true })
  set1Team1?: number;

  @Field(() => Int, { nullable: true })
  set1Team2?: number;

  @Field(() => Int, { nullable: true })
  set2Team1?: number;

  @Field(() => Int, { nullable: true })
  set2Team2?: number;

  @Field(() => Int, { nullable: true })
  set3Team1?: number;

  @Field(() => Int, { nullable: true })
  set3Team2?: number;

  @Field(() => Int, { description: 'Winner (1 or 2)' })
  winner!: number;
}

@InputType('AssignNextGameInput')
export class AssignNextGameInput {
  @Field(() => ID, { description: 'Court ID to assign next game to' })
  courtId!: string;

  @Field(() => ID, { description: 'Tournament event ID' })
  tournamentEventId!: string;
}
