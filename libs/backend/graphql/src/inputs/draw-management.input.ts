import { Field, ID, InputType, Int, registerEnumType } from '@nestjs/graphql';

export enum SeedingMethod {
  BY_RANKING = 'BY_RANKING',
  RANDOM = 'RANDOM',
  MANUAL = 'MANUAL',
}

registerEnumType(SeedingMethod, {
  name: 'SeedingMethod',
  description: 'Method for seeding entries in a draw',
});

@InputType('GenerateEntriesFromEnrollmentsInput')
export class GenerateEntriesFromEnrollmentsInput {
  @Field(() => ID, { description: 'Sub-event ID to generate entries for' })
  subEventId!: string;

  @Field(() => Boolean, {
    nullable: true,
    defaultValue: false,
    description: 'If true, regenerate entries even if they already exist',
  })
  force?: boolean;
}

@InputType('AssignEntryToDrawInput')
export class AssignEntryToDrawInput {
  @Field(() => ID, { description: 'Entry ID to assign' })
  entryId!: string;

  @Field(() => ID, { description: 'Draw ID to assign entry to' })
  drawId!: string;
}

@InputType('AssignEntriesToDrawInput')
export class AssignEntriesToDrawInput {
  @Field(() => [ID], { description: 'Entry IDs to assign' })
  entryIds!: string[];

  @Field(() => ID, { description: 'Draw ID to assign entries to' })
  drawId!: string;
}

@InputType('SetEntrySeedInput')
export class SetEntrySeedInput {
  @Field(() => ID, { description: 'Entry ID to set seed for' })
  entryId!: string;

  @Field(() => Int, { description: 'Seed position (1 = top seed)' })
  seed!: number;
}

@InputType('AutoSeedDrawInput')
export class AutoSeedDrawInput {
  @Field(() => ID, { description: 'Draw ID to auto-seed' })
  drawId!: string;

  @Field(() => SeedingMethod, {
    defaultValue: SeedingMethod.BY_RANKING,
    description: 'Method to use for seeding',
  })
  method!: SeedingMethod;
}

@InputType('CreateTournamentDrawInput')
export class CreateTournamentDrawInput {
  @Field(() => ID, { description: 'Sub-event ID this draw belongs to' })
  subEventId!: string;

  @Field(() => String, { description: 'Name of the draw' })
  name!: string;

  @Field(() => String, {
    nullable: true,
    description: 'Type of draw (KO, POULE, QUALIFICATION)',
  })
  type?: 'KO' | 'POULE' | 'QUALIFICATION';

  @Field(() => Int, { nullable: true, description: 'Draw size (number of entries)' })
  size?: number;
}

@InputType('UpdateTournamentDrawInput')
export class UpdateTournamentDrawInput {
  @Field(() => String, { nullable: true, description: 'Name of the draw' })
  name?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Type of draw (KO, POULE, QUALIFICATION)',
  })
  type?: 'KO' | 'POULE' | 'QUALIFICATION';

  @Field(() => Int, { nullable: true, description: 'Draw size (number of entries)' })
  size?: number;
}

@InputType('RemoveEntryFromDrawInput')
export class RemoveEntryFromDrawInput {
  @Field(() => ID, { description: 'Entry ID to remove from draw' })
  entryId!: string;
}
