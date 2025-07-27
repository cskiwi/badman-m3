import { Field, ObjectType, InputType } from '@nestjs/graphql';

@ObjectType('EntryTournament')
export class EntryTournament {
  @Field({ nullable: true })
  declare place?: number;
}

@ObjectType('EntryCompetitionPlayer')
export class EntryCompetitionPlayer {
  @Field({ nullable: true })
  declare id?: string;

  @Field({ nullable: true })
  declare single?: number;

  @Field({ nullable: true })
  declare double?: number;

  @Field({ nullable: true })
  declare mix?: number;

  @Field({ nullable: true })
  declare gender?: string;

  @Field({ nullable: true })
  declare player?: string;

  @Field({ nullable: true })
  declare levelExceptionRequested?: boolean;

  @Field({ nullable: true })
  declare levelExceptionGiven?: boolean;

  @Field({ nullable: true })
  declare levelExceptionReason?: string;
}

@ObjectType('EntryCompetition')
export class EntryCompetition {
  @Field({ nullable: true })
  declare teamIndex?: number;

  @Field(() => [EntryCompetitionPlayer], { nullable: true })
  declare players?: EntryCompetitionPlayer[];
}

@ObjectType('EntryMeta')
export class EntryMeta {
  @Field(() => EntryTournament, { nullable: true })
  declare tournament?: EntryTournament;

  @Field(() => EntryCompetition, { nullable: true })
  declare competition?: EntryCompetition;
}

@InputType('EntryCompetitionPlayerInput')
export class EntryCompetitionPlayerInput {
  @Field({ nullable: true })
  declare id?: string;

  @Field({ nullable: true })
  declare single?: number;

  @Field({ nullable: true })
  declare double?: number;

  @Field({ nullable: true })
  declare mix?: number;

  @Field({ nullable: true })
  declare gender?: string;

  @Field({ nullable: true })
  declare levelExceptionRequested?: boolean;

  @Field({ nullable: true })
  declare levelExceptionGiven?: boolean;

  @Field({ nullable: true })
  declare levelExceptionReason?: string;
}

@InputType('EntryCompetitionInput')
export class EntryCompetitionInput {
  @Field({ nullable: true })
  declare teamIndex?: number;

  @Field(() => [EntryCompetitionPlayerInput], { nullable: true })
  declare players?: EntryCompetitionPlayerInput[];
}

@InputType('EntryTournamentInput')
export class EntryTournamentInput {
  @Field({ nullable: true })
  declare place?: number;
}

@InputType('EntryMetaInput')
export class EntryMetaInput {
  @Field(() => EntryTournamentInput, { nullable: true })
  declare tournament?: EntryTournamentInput;

  @Field(() => EntryCompetitionInput, { nullable: true })
  declare competition?: EntryCompetitionInput;
}