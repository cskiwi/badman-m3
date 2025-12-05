import * as Models from '@app/models';
import { args } from '../utils';
import { appendSortableObjects, SortOrderType } from '../utils/sort-order';
import { appendWhereObjects, WhereInputType } from '../utils/where-input';

// Extract all entity classes from the models package
// An entity class extends BaseEntity and is decorated with @Entity
const entities = Object.entries(Models).filter(([name, value]) => {
  if (typeof value !== 'function' || !value.prototype) return false;

  // Check if it extends BaseEntity (TypeORM entity base class)
  let proto = value.prototype;
  while (proto) {
    if (proto.constructor.name === 'BaseEntity') return true;
    proto = Object.getPrototypeOf(proto);
  }
  return false;
}) as Array<[string, new () => any]>;

// Register all SortOrderTypes and append sortable objects
entities.forEach(([name, EntityClass]) => {
  SortOrderType(EntityClass, name);
  appendSortableObjects(EntityClass, name);

  WhereInputType(EntityClass, name);
  appendWhereObjects(EntityClass, name);
});

// Create typed args map
type EntityArgsMap = {
  [K in keyof typeof Models as `${K & string}Args`]: ReturnType<typeof args<InstanceType<(typeof Models)[K]>>>;
};

// Dynamically create args for all entities with proper typing
const createEntityArgs = (): EntityArgsMap => {
  const map = {} as EntityArgsMap;
  entities.forEach(([name]) => {
    (map as any)[`${name}Args`] = args(name);
  });
  return map;
};

const argsMap = createEntityArgs();

export const {
  ClaimArgs,
  ClubArgs,
  ClubPlayerMembershipArgs,
  CompetitionEventArgs,
  CompetitionSubEventArgs,
  PlayerArgs,
  TournamentEventArgs,
  TournamentSubEventArgs,
  TournamentDrawArgs,
  GameArgs,
  RankingGroupArgs,
  TeamArgs,
  RankingLastPlaceArgs,
  RankingPlaceArgs,
  RankingPointArgs,
  RankingSystemArgs,
  RankingSystemRankingGroupMembershipArgs,
  TeamPlayerMembershipArgs,
  GamePlayerMembershipArgs,
  CommentArgs,
  FaqArgs,
  RequestLinkArgs,
  AvailabilityArgs,
  CourtArgs,
  EntryArgs,
  LocationArgs,
  StandingArgs,
  CompetitionEncounterArgs,
  CompetitionEncounterChangeArgs,
  CompetitionEncounterChangeDateArgs,
  ImportFileArgs,
  NotificationArgs,
  SettingArgs,
  CronJobArgs,
  LogEntryArgs,
  RuleArgs,
  ServiceArgs,
  CompetitionAssemblyArgs,
  CompetitionDrawArgs,
  LocationEventMembershipArgs,
  RoleArgs,
  PlayerClaimMembershipArgs,
  PlayerRoleMembershipArgs,
  RoleClaimMembershipArgs,
  TournamentGroupSubEventMembershipArgs,
} = argsMap;
