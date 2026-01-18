import { MigrationInterface, QueryRunner } from "typeorm";

export class SyncWithModels1756283172764 implements MigrationInterface {
    name = 'SyncWithModels1756283172764'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments" DROP CONSTRAINT "SubEventTournaments_eventId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Standings" DROP CONSTRAINT "Standings_entryId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Entries" DROP CONSTRAINT "Entries_player1Id_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Entries" DROP CONSTRAINT "Entries_player2Id_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Entries" DROP CONSTRAINT "Entries_teamId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."DrawTournaments" DROP CONSTRAINT "DrawTournaments_subeventId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions" DROP CONSTRAINT "EventCompetitions_contactId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventCompetitions" DROP CONSTRAINT "SubEventCompetitions_eventId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."DrawCompetitions" DROP CONSTRAINT "DrawCompetitions_subeventId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "personal"."Assemblies" DROP CONSTRAINT "Assemblies_captainId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "personal"."Assemblies" DROP CONSTRAINT "Assemblies_encounterId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "personal"."Assemblies" DROP CONSTRAINT "Assemblies_playerId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "personal"."Assemblies" DROP CONSTRAINT "Assemblies_teamId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions" DROP CONSTRAINT "EncounterCompetitions_acceptedById_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions" DROP CONSTRAINT "EncounterCompetitions_awayTeamId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions" DROP CONSTRAINT "EncounterCompetitions_drawId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions" DROP CONSTRAINT "EncounterCompetitions_enteredById_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions" DROP CONSTRAINT "EncounterCompetitions_gameLeaderId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions" DROP CONSTRAINT "EncounterCompetitions_homeTeamId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions" DROP CONSTRAINT "EncounterCompetitions_locationId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions" DROP CONSTRAINT "EncounterCompetitions_originalLocationId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions" DROP CONSTRAINT "EncounterCompetitions_tempAwayCaptainId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions" DROP CONSTRAINT "EncounterCompetitions_tempHomeCaptainId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystemRankingGroupMemberships" DROP CONSTRAINT "GroupSystems_groupId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystemRankingGroupMemberships" DROP CONSTRAINT "GroupSystems_systemId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPlaces" DROP CONSTRAINT "Places_PlayerId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPlaces" DROP CONSTRAINT "Places_SystemId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingLastPlaces" DROP CONSTRAINT "LastPlaces_playerId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingLastPlaces" DROP CONSTRAINT "LastPlaces_systemId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPoints" DROP CONSTRAINT "Points_GameId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPoints" DROP CONSTRAINT "Points_PlayerId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPoints" DROP CONSTRAINT "Points_SystemId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Games" DROP CONSTRAINT "Games_courtId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."GamePlayerMemberships" DROP CONSTRAINT "GamePlayerMemberships_systemId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."GamePlayerMemberships" DROP CONSTRAINT "GamePlayers_gameId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."GamePlayerMemberships" DROP CONSTRAINT "GamePlayers_playerId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "TeamPlayerMemberships" DROP CONSTRAINT "TeamPlayerMemberships_playerId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "TeamPlayerMemberships" DROP CONSTRAINT "TeamPlayerMemberships_teamId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Availabilities" DROP CONSTRAINT "Availabilities_locationId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterChanges" DROP CONSTRAINT "EncounterChanges_encounterId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterChangeDates" DROP CONSTRAINT "EncounterChangeDates_encounterChangeId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterChangeDates" DROP CONSTRAINT "EncounterChangeDates_locationId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Courts" DROP CONSTRAINT "Courts_locationId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Locations" DROP CONSTRAINT "Locations_clubId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "Teams" DROP CONSTRAINT "Teams_captainId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "Teams" DROP CONSTRAINT "Teams_clubId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "Teams" DROP CONSTRAINT "Teams_prefferedLocation2Id_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "Teams" DROP CONSTRAINT "Teams_prefferedLocationId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "ClubPlayerMemberships" DROP CONSTRAINT "ClubMemberships_clubId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "ClubPlayerMemberships" DROP CONSTRAINT "ClubMemberships_playerId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "Comments" DROP CONSTRAINT "Comments_clubId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "Comments" DROP CONSTRAINT "Comments_playerId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "personal"."Notifications" DROP CONSTRAINT "Notifications_sendToId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "personal"."Settings" DROP CONSTRAINT "Settings_playerId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "RequestLinks" DROP CONSTRAINT "RequestLinks_PlayerId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships" DROP CONSTRAINT "PlayerClaimMemberships_claimId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships" DROP CONSTRAINT "PlayerClaimMemberships_userId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships" DROP CONSTRAINT "RoleClaimMemberships_claimId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships" DROP CONSTRAINT "RoleClaimMemberships_roleId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships" DROP CONSTRAINT "PlayerRoleMemberships_roleId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships" DROP CONSTRAINT "PlayerRoleMemberships_userId_fkey"
        `);
        await queryRunner.query(`
            DROP INDEX "ranking"."places_date_index"
        `);
        await queryRunner.query(`
            DROP INDEX "ranking"."places_system_index"
        `);
        await queryRunner.query(`
            DROP INDEX "ranking"."ranking_index"
        `);
        await queryRunner.query(`
            DROP INDEX "ranking"."lastPlaces_ranking_index"
        `);
        await queryRunner.query(`
            DROP INDEX "ranking"."point_game_system_index"
        `);
        await queryRunner.query(`
            DROP INDEX "ranking"."point_player_system_index"
        `);
        await queryRunner.query(`
            DROP INDEX "ranking"."point_system_index"
        `);
        await queryRunner.query(`
            DROP INDEX "ranking"."points_date_index"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."game_parent_index"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."game_players_game_id"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."game_players_player_id"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."player_team_index"
        `);
        await queryRunner.query(`
            DROP INDEX "security"."claims_description"
        `);
        await queryRunner.query(`
            DROP INDEX "security"."claims_name"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."locations_club_id"
        `);
        await queryRunner.query(`
            DROP INDEX "security"."roles_description"
        `);
        await queryRunner.query(`
            DROP INDEX "security"."roles_name"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."players_first_name"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."players_id"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."players_last_name"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."players_member_id"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."players_slug"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."teams_club_index"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."clubs_name"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."player_club_index"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."comment_index"
        `);
        await queryRunner.query(`
            DROP INDEX "personal"."settings_player_id"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."request_links__player_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventTournaments" DROP CONSTRAINT "EventTournaments_unique_constraint"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments" DROP CONSTRAINT "SubEventTournaments_unique_constraint"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."DrawTournaments" DROP CONSTRAINT "DrawTournaments_unique_constraint"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions" DROP CONSTRAINT "EventCompetitions_unique_constraint"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventCompetitions" DROP CONSTRAINT "SubEventCompetitions_unique_constraint"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."DrawCompetitions" DROP CONSTRAINT "DrawCompetitions_unique_constraint"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPlaces" DROP CONSTRAINT "Places_rankingDate_PlayerId_SystemId_key"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingLastPlaces" DROP CONSTRAINT "lastPlaces_unique_constraint"
        `);
        await queryRunner.query(`
            ALTER TABLE "TeamPlayerMemberships" DROP CONSTRAINT "TeamPlayerMemberships_playerId_teamId_start_key"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."Claims" DROP CONSTRAINT "Claims_name_category_type_key"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Availabilities" DROP CONSTRAINT "availability_unique_constraint"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Courts" DROP CONSTRAINT "Courts_name_locationId_key"
        `);
        await queryRunner.query(`
            ALTER TABLE "Players" DROP CONSTRAINT "Players_firstName_lastName_memberId_key"
        `);
        await queryRunner.query(`
            ALTER TABLE "Clubs" DROP CONSTRAINT "club_number_unique"
        `);
        await queryRunner.query(`
            ALTER TABLE "ClubPlayerMemberships" DROP CONSTRAINT "ClubMemberships_playerId_clubId_start_key"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions" DROP COLUMN "changeUntill_1"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions" DROP COLUMN "changeUntill_2"
        `);
        await queryRunner.query(`
            ALTER TABLE "ClubPlayerMemberships" DROP COLUMN "createdAt"
        `);
        await queryRunner.query(`
            ALTER TABLE "ClubPlayerMemberships" DROP COLUMN "updatedAt"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships" DROP COLUMN "createdAt"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships" DROP COLUMN "updatedAt"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments"
            ADD "lastSync" TIMESTAMP WITH TIME ZONE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."DrawTournaments"
            ADD "lastSync" TIMESTAMP
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventCompetitions"
            ADD "lastSync" TIMESTAMP WITH TIME ZONE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."DrawCompetitions"
            ADD "lastSync" TIMESTAMP
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystemRankingGroupMemberships"
            ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystemRankingGroupMemberships" DROP CONSTRAINT "GroupSystems_pkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystemRankingGroupMemberships"
            ADD CONSTRAINT "GroupSystems_pkey" PRIMARY KEY ("groupId", "systemId", "id")
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."GamePlayerMemberships"
            ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."GamePlayerMemberships" DROP CONSTRAINT "GamePlayers_pkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."GamePlayerMemberships"
            ADD CONSTRAINT "GamePlayers_pkey" PRIMARY KEY ("playerId", "gameId", "id")
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."Roles"
            ADD "clubId" uuid
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."Roles"
            ADD "teamId" uuid
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."Roles"
            ADD "competitionId" uuid
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."Roles"
            ADD "tournamentId" uuid
        `);
        await queryRunner.query(`
            ALTER TABLE "RequestLinks"
            ADD "requestId" character varying(255) NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "RequestLinks"
            ADD "requestType" character varying(255) NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "RequestLinks"
            ADD "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "RequestLinks"
            ADD "isUsed" boolean NOT NULL DEFAULT false
        `);
        await queryRunner.query(`
            ALTER TABLE "RequestLinks"
            ADD "usedAt" TIMESTAMP WITH TIME ZONE
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships"
            ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships" DROP CONSTRAINT "PlayerClaimMemberships_pkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships"
            ADD CONSTRAINT "PlayerClaimMemberships_pkey" PRIMARY KEY ("playerId", "claimId", "id")
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships"
            ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships" DROP CONSTRAINT "RoleClaimMemberships_pkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships"
            ADD CONSTRAINT "RoleClaimMemberships_pkey" PRIMARY KEY ("roleId", "claimId", "id")
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships"
            ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships" DROP CONSTRAINT "PlayerRoleMemberships_pkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships"
            ADD CONSTRAINT "PlayerRoleMemberships_pkey" PRIMARY KEY ("playerId", "roleId", "id")
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventTournaments" DROP CONSTRAINT "EventTournaments_slug_key"
        `);
        await queryRunner.query(`
            ALTER TYPE "event"."enum_EventTournaments_usedRankingUnit"
            RENAME TO "enum_EventTournaments_usedRankingUnit_old"
        `);
        await queryRunner.query(`
            CREATE TYPE "event"."EventTournaments_usedrankingunit_enum" AS ENUM('months', 'weeks', 'days')
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventTournaments"
            ALTER COLUMN "usedRankingUnit" DROP DEFAULT
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventTournaments"
            ALTER COLUMN "usedRankingUnit" TYPE "event"."EventTournaments_usedrankingunit_enum" USING "usedRankingUnit"::"text"::"event"."EventTournaments_usedrankingunit_enum"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventTournaments"
            ALTER COLUMN "usedRankingUnit"
            SET DEFAULT 'months'
        `);
        await queryRunner.query(`
            DROP TYPE "event"."enum_EventTournaments_usedRankingUnit_old"
        `);
        await queryRunner.query(`
            ALTER TYPE "event"."enum_SubEventTournaments_eventType"
            RENAME TO "enum_SubEventTournaments_eventType_old"
        `);
        await queryRunner.query(`
            CREATE TYPE "event"."SubEventTournaments_eventtype_enum" AS ENUM('M', 'F', 'MX', 'MINIBAD')
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments"
            ALTER COLUMN "eventType" TYPE "event"."SubEventTournaments_eventtype_enum" USING "eventType"::"text"::"event"."SubEventTournaments_eventtype_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "event"."enum_SubEventTournaments_eventType_old"
        `);
        await queryRunner.query(`
            ALTER TYPE "event"."enum_SubEventTournaments_gameType"
            RENAME TO "enum_SubEventTournaments_gameType_old"
        `);
        await queryRunner.query(`
            CREATE TYPE "event"."SubEventTournaments_gametype_enum" AS ENUM('S', 'D', 'MX')
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments"
            ALTER COLUMN "gameType" TYPE "event"."SubEventTournaments_gametype_enum" USING "gameType"::"text"::"event"."SubEventTournaments_gametype_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "event"."enum_SubEventTournaments_gameType_old"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Standings"
            ALTER COLUMN "position"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TYPE "event"."enum_DrawTournaments_type"
            RENAME TO "enum_DrawTournaments_type_old"
        `);
        await queryRunner.query(`
            CREATE TYPE "event"."DrawTournaments_type_enum" AS ENUM('KO', 'POULE', 'QUALIFICATION')
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."DrawTournaments"
            ALTER COLUMN "type" TYPE "event"."DrawTournaments_type_enum" USING "type"::"text"::"event"."DrawTournaments_type_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "event"."enum_DrawTournaments_type_old"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."DrawTournaments"
            ALTER COLUMN "risers"
            SET DEFAULT '0'
        `);
        await queryRunner.query(`
            ALTER TYPE "event"."enum_EventCompetitions_usedRankingUnit"
            RENAME TO "enum_EventCompetitions_usedRankingUnit_old"
        `);
        await queryRunner.query(`
            CREATE TYPE "event"."EventCompetitions_usedrankingunit_enum" AS ENUM('months', 'weeks', 'days')
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions"
            ALTER COLUMN "usedRankingUnit" DROP DEFAULT
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions"
            ALTER COLUMN "usedRankingUnit" TYPE "event"."EventCompetitions_usedrankingunit_enum" USING "usedRankingUnit"::"text"::"event"."EventCompetitions_usedrankingunit_enum"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions"
            ALTER COLUMN "usedRankingUnit"
            SET DEFAULT 'months'
        `);
        await queryRunner.query(`
            DROP TYPE "event"."enum_EventCompetitions_usedRankingUnit_old"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions"
            ALTER COLUMN "usedRankingUnit"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TYPE "event"."enum_EventCompetitions_type"
            RENAME TO "enum_EventCompetitions_type_old"
        `);
        await queryRunner.query(`
            CREATE TYPE "event"."EventCompetitions_type_enum" AS ENUM('PROV', 'LIGA', 'NATIONAL')
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions"
            ALTER COLUMN "type" TYPE "event"."EventCompetitions_type_enum" USING "type"::"text"::"event"."EventCompetitions_type_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "event"."enum_EventCompetitions_type_old"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions"
            ALTER COLUMN "started"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TYPE "event"."enum_SubEventCompetitions_eventType"
            RENAME TO "enum_SubEventCompetitions_eventType_old"
        `);
        await queryRunner.query(`
            CREATE TYPE "event"."SubEventCompetitions_eventtype_enum" AS ENUM('M', 'F', 'MX', 'NATIONAL')
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventCompetitions"
            ALTER COLUMN "eventType" TYPE "event"."SubEventCompetitions_eventtype_enum" USING "eventType"::"text"::"event"."SubEventCompetitions_eventtype_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "event"."enum_SubEventCompetitions_eventType_old"
        `);
        await queryRunner.query(`
            UPDATE "event"."SubEventCompetitions"
            SET "eventType" = 'MX'
            WHERE "id" in ('5f849974-ceff-4491-9028-921bd6187f83', 'adb06577-0ffc-408d-8098-2c4d9ddbb79c', '83d50d0c-3bf4-4f1b-be90-8d10177c572e', '97f679d2-1575-4e84-81dc-b7c03a1baa16')
        `);
        await queryRunner.query(`
            CREATE TYPE "event"."DrawCompetitions_type_enum" AS ENUM('KO', 'POULE', 'QUALIFICATION')
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."DrawCompetitions"
            ALTER COLUMN "type" TYPE "event"."DrawCompetitions_type_enum" USING "type"::"text"::"event"."DrawCompetitions_type_enum"
        `);
        await queryRunner.query(`
            ALTER TABLE "personal"."Assemblies"
            ALTER COLUMN "isComplete" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions"
            ALTER COLUMN "homeCaptainPresent" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions"
            ALTER COLUMN "awayCaptainPresent" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions"
            ALTER COLUMN "gameLeaderPresent" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions"
            ALTER COLUMN "homeCaptainAccepted" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions"
            ALTER COLUMN "awayCaptainAccepted" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions"
            ALTER COLUMN "gameLeaderAccepted" DROP NOT NULL
        `);
        // Create a temporary mapping table to preserve old id -> new uuid relationships for RankingGroups
        await queryRunner.query(`
            CREATE TEMP TABLE ranking_groups_id_mapping (
                old_id varchar(255),
                new_id uuid
            )
        `);

        // Store the mapping of old ids to new uuids for existing groups
        await queryRunner.query(`
            INSERT INTO ranking_groups_id_mapping (old_id, new_id)
            SELECT id, uuid_generate_v4()
            FROM ranking."RankingGroups"
        `);

        // Add temporary columns to reference tables to store new UUIDs
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystemRankingGroupMemberships"
            ADD COLUMN "groupId_new" uuid
        `);

        // Update the new columns with the mapped UUIDs
        await queryRunner.query(`
            UPDATE ranking."RankingSystemRankingGroupMemberships" 
            SET "groupId_new" = mapping.new_id
            FROM ranking_groups_id_mapping mapping
            WHERE ranking."RankingSystemRankingGroupMemberships"."groupId" = mapping.old_id
        `);
        
        // Drop any existing foreign key constraints that reference RankingGroups before dropping the primary key
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystemRankingGroupMemberships" DROP CONSTRAINT IF EXISTS "FK_3b8afe506db2e006445d8fe9a22"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingGroupSubEventTournamentMemberships" DROP CONSTRAINT IF EXISTS "GroupSubEventTournaments_groupId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingGroupSubEventCompetitionMemberships" DROP CONSTRAINT IF EXISTS "GroupSubEventCompetitions_groupId_fkey"
        `);
        
        // Now update the RankingGroups table
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingGroups" DROP CONSTRAINT "Groups_pkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingGroups"
            ADD COLUMN "id_new" uuid
        `);
        await queryRunner.query(`
            UPDATE ranking."RankingGroups" 
            SET "id_new" = mapping.new_id
            FROM ranking_groups_id_mapping mapping
            WHERE ranking."RankingGroups"."id" = mapping.old_id
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingGroups" DROP COLUMN "id"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingGroups"
            RENAME COLUMN "id_new" TO "id"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingGroups"
            ALTER COLUMN "id" SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingGroups"
            ADD CONSTRAINT "PK_444b4810c1a20aa442417cd6b94" PRIMARY KEY ("id")
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingGroups"
            ALTER COLUMN "name"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingGroups" DROP CONSTRAINT "Groups_name_key"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystemRankingGroupMemberships" DROP CONSTRAINT "GroupSystems_pkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystemRankingGroupMemberships"
            ADD CONSTRAINT "GroupSystems_pkey" PRIMARY KEY ("groupId", "id")
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystemRankingGroupMemberships" DROP CONSTRAINT "GroupSystems_pkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystemRankingGroupMemberships"
            ADD CONSTRAINT "PK_d0ae308fb59648b66f1bec6c2ff" PRIMARY KEY ("id")
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystemRankingGroupMemberships" DROP COLUMN "groupId"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystemRankingGroupMemberships"
            RENAME COLUMN "groupId_new" TO "groupId"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystemRankingGroupMemberships"
            ALTER COLUMN "groupId" SET NOT NULL
        `);
        
        await queryRunner.query(`
            DELETE FROM "ranking"."RankingPlaces" where "rankingDate" IS NULL
        `);
        
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPlaces"
            ALTER COLUMN "rankingDate"
            SET NOT NULL
        `);

        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPlaces"
            ALTER COLUMN "updatePossible"
            SET DEFAULT false
        `);

        await queryRunner.query(`
            UPDATE "ranking"."RankingPlaces"
            SET "updatePossible" = false
            WHERE "updatePossible" IS NULL
        `);

        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPlaces"
            ALTER COLUMN "updatePossible"
            SET NOT NULL
        `);
       
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPlaces"
            ALTER COLUMN "singleInactive"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPlaces"
            ALTER COLUMN "mixInactive"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPlaces"
            ALTER COLUMN "doubleInactive"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPlaces"
            ALTER COLUMN "playerId"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPlaces"
            ALTER COLUMN "systemId"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingLastPlaces"
            ALTER COLUMN "createdAt"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingLastPlaces"
            ALTER COLUMN "updatedAt"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingLastPlaces"
            ALTER COLUMN "rankingDate"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingLastPlaces"
            ALTER COLUMN "singleInactive"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingLastPlaces"
            ALTER COLUMN "singleInactive"
            SET DEFAULT false
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingLastPlaces"
            ALTER COLUMN "mixInactive"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingLastPlaces"
            ALTER COLUMN "mixInactive"
            SET DEFAULT false
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingLastPlaces"
            ALTER COLUMN "doubleInactive"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingLastPlaces"
            ALTER COLUMN "doubleInactive"
            SET DEFAULT false
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingLastPlaces"
            ALTER COLUMN "playerId"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingLastPlaces"
            ALTER COLUMN "systemId"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "name"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems" DROP CONSTRAINT "Systems_name_key"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "procentWinning" TYPE numeric(2)
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "procentWinningPlus1" TYPE numeric(2)
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "procentLosing" TYPE numeric(2)
        `);
        await queryRunner.query(`
            ALTER TYPE "ranking"."enum_Systems_inactivityUnit"
            RENAME TO "enum_Systems_inactivityUnit_old"
        `);
        await queryRunner.query(`
            CREATE TYPE "ranking"."RankingSystems_inactivityunit_enum" AS ENUM('months', 'weeks', 'days')
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "inactivityUnit" TYPE "ranking"."RankingSystems_inactivityunit_enum" USING "inactivityUnit"::"text"::"ranking"."RankingSystems_inactivityunit_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "ranking"."enum_Systems_inactivityUnit_old"
        `);
        await queryRunner.query(`
            ALTER TYPE "ranking"."enum_RankingSystems_inactiveBehavior"
            RENAME TO "enum_RankingSystems_inactiveBehavior_old"
        `);
        await queryRunner.query(`
            CREATE TYPE "ranking"."RankingSystems_inactivebehavior_enum" AS ENUM('freeze', 'decrease')
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "inactiveBehavior" TYPE "ranking"."RankingSystems_inactivebehavior_enum" USING "inactiveBehavior"::"text"::"ranking"."RankingSystems_inactivebehavior_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "ranking"."enum_RankingSystems_inactiveBehavior_old"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "calculationLastUpdate" DROP DEFAULT
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "calculationDayOfWeek" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "calculationDayOfWeek" DROP DEFAULT
        `);
        await queryRunner.query(`
            ALTER TYPE "ranking"."enum_Systems_calculationIntervalUnit"
            RENAME TO "enum_Systems_calculationIntervalUnit_old"
        `);
        await queryRunner.query(`
            CREATE TYPE "ranking"."RankingSystems_calculationintervalunit_enum" AS ENUM('months', 'weeks', 'days')
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "calculationIntervalUnit" TYPE "ranking"."RankingSystems_calculationintervalunit_enum" USING "calculationIntervalUnit"::"text"::"ranking"."RankingSystems_calculationintervalunit_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "ranking"."enum_Systems_calculationIntervalUnit_old"
        `);
        await queryRunner.query(`
            ALTER TYPE "ranking"."enum_Systems_periodUnit"
            RENAME TO "enum_Systems_periodUnit_old"
        `);
        await queryRunner.query(`
            CREATE TYPE "ranking"."RankingSystems_periodunit_enum" AS ENUM('months', 'weeks', 'days')
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "periodUnit" TYPE "ranking"."RankingSystems_periodunit_enum" USING "periodUnit"::"text"::"ranking"."RankingSystems_periodunit_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "ranking"."enum_Systems_periodUnit_old"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "updateLastUpdate" DROP DEFAULT
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "updateDayOfWeek" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "updateDayOfWeek" DROP DEFAULT
        `);
        await queryRunner.query(`
            ALTER TYPE "ranking"."enum_Systems_updateIntervalUnit"
            RENAME TO "enum_Systems_updateIntervalUnit_old"
        `);
        await queryRunner.query(`
            CREATE TYPE "ranking"."RankingSystems_updateintervalunit_enum" AS ENUM('months', 'weeks', 'days')
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "updateIntervalUnit" TYPE "ranking"."RankingSystems_updateintervalunit_enum" USING "updateIntervalUnit"::"text"::"ranking"."RankingSystems_updateintervalunit_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "ranking"."enum_Systems_updateIntervalUnit_old"
        `);
        await queryRunner.query(`
            ALTER TYPE "ranking"."enum_Systems_rankingSystem"
            RENAME TO "enum_Systems_rankingSystem_old"
        `);
        await queryRunner.query(`
            CREATE TYPE "ranking"."RankingSystems_rankingsystem_enum" AS ENUM('BVL', 'LFBB', 'ORIGINAL', 'VISUAL')
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "rankingSystem" TYPE "ranking"."RankingSystems_rankingsystem_enum" USING "rankingSystem"::"text"::"ranking"."RankingSystems_rankingsystem_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "ranking"."enum_Systems_rankingSystem_old"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "primary"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "primary"
            SET DEFAULT false
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "runCurrently"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "differenceForUpgradeSingle" TYPE numeric(2)
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "differenceForUpgradeDouble" TYPE numeric(2)
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "differenceForUpgradeMix" TYPE numeric(2)
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "differenceForDowngradeSingle" TYPE numeric(2)
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "differenceForDowngradeDouble" TYPE numeric(2)
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "differenceForDowngradeMix" TYPE numeric(2)
        `);
        await queryRunner.query(`
            ALTER TYPE "ranking"."enum_Systems_startingType"
            RENAME TO "enum_Systems_startingType_old"
        `);
        await queryRunner.query(`
            CREATE TYPE "ranking"."RankingSystems_startingtype_enum" AS ENUM('formula', 'tableLFBB', 'tableBVL')
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "startingType" DROP DEFAULT
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "startingType" TYPE "ranking"."RankingSystems_startingtype_enum" USING "startingType"::"text"::"ranking"."RankingSystems_startingtype_enum"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "startingType"
            SET DEFAULT 'formula'
        `);
        await queryRunner.query(`
            DROP TYPE "ranking"."enum_Systems_startingType_old"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "startingType"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPoints"
            ALTER COLUMN "differenceInLevel" TYPE numeric(2)
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPoints"
            ALTER COLUMN "playerId"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPoints"
            ALTER COLUMN "gameId"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPoints"
            ALTER COLUMN "systemId"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TYPE "event"."enum_Games_gameType"
            RENAME TO "enum_Games_gameType_old"
        `);
        await queryRunner.query(`
            CREATE TYPE "event"."Games_gametype_enum" AS ENUM('S', 'D', 'MX')
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Games"
            ALTER COLUMN "gameType" TYPE "event"."Games_gametype_enum" USING "gameType"::"text"::"event"."Games_gametype_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "event"."enum_Games_gameType_old"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Games"
            ALTER COLUMN "gameType"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TYPE "event"."enum_Games_status"
            RENAME TO "enum_Games_status_old"
        `);
        await queryRunner.query(`
            CREATE TYPE "event"."Games_status_enum" AS ENUM(
                'NORMAL',
                'WALKOVER',
                'RETIREMENT',
                'DISQUALIFIED',
                'NO_MATCH'
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Games"
            ALTER COLUMN "status" TYPE "event"."Games_status_enum" USING "status"::"text"::"event"."Games_status_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "event"."enum_Games_status_old"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Games"
            ALTER COLUMN "linkId"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Games"
            ALTER COLUMN "linkType"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."GamePlayerMemberships" DROP CONSTRAINT "GamePlayers_pkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."GamePlayerMemberships"
            ADD CONSTRAINT "GamePlayers_pkey" PRIMARY KEY ("gameId", "id")
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."GamePlayerMemberships" DROP CONSTRAINT "GamePlayers_pkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."GamePlayerMemberships"
            ADD CONSTRAINT "PK_9944c9e20e2430dd1a82c4c9026" PRIMARY KEY ("id")
        `);
        await queryRunner.query(`
            ALTER TYPE "public"."enum_TeamPlayerMemberships_membershipType"
            RENAME TO "enum_TeamPlayerMemberships_membershipType_old"
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."TeamPlayerMemberships_membershiptype_enum" AS ENUM('REGULAR', 'BACKUP')
        `);
        await queryRunner.query(`
            ALTER TABLE "TeamPlayerMemberships"
            ALTER COLUMN "membershipType" DROP DEFAULT
        `);
        await queryRunner.query(`
            ALTER TABLE "TeamPlayerMemberships"
            ALTER COLUMN "membershipType" TYPE "public"."TeamPlayerMemberships_membershiptype_enum" USING "membershipType"::"text"::"public"."TeamPlayerMemberships_membershiptype_enum"
        `);
        await queryRunner.query(`
            ALTER TABLE "TeamPlayerMemberships"
            ALTER COLUMN "membershipType"
            SET DEFAULT 'REGULAR'
        `);
        await queryRunner.query(`
            DROP TYPE "public"."enum_TeamPlayerMemberships_membershipType_old"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."Claims"
            ALTER COLUMN "createdAt" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TYPE "security"."enum_Claims_type"
            RENAME TO "enum_Claims_type_old"
        `);
        await queryRunner.query(`
            CREATE TYPE "security"."Claims_type_enum" AS ENUM(
                'global',
                'club',
                'team',
                'competition',
                'tournament'
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."Claims"
            ALTER COLUMN "type" TYPE "security"."Claims_type_enum" USING "type"::"text"::"security"."Claims_type_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "security"."enum_Claims_type_old"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."Claims"
            ALTER COLUMN "type" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterChanges"
            ALTER COLUMN "createdAt"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterChanges"
            ALTER COLUMN "updatedAt"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterChangeDates"
            ALTER COLUMN "createdAt"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterChangeDates"
            ALTER COLUMN "updatedAt"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TYPE "event"."enum_EncounterChangeDates_availabilityHome"
            RENAME TO "enum_EncounterChangeDates_availabilityHome_old"
        `);
        await queryRunner.query(`
            CREATE TYPE "event"."EncounterChangeDates_availabilityhome_enum" AS ENUM('POSSIBLE', 'NOT_POSSIBLE')
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterChangeDates"
            ALTER COLUMN "availabilityHome" TYPE "event"."EncounterChangeDates_availabilityhome_enum" USING "availabilityHome"::"text"::"event"."EncounterChangeDates_availabilityhome_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "event"."enum_EncounterChangeDates_availabilityHome_old"
        `);
        
        await queryRunner.query(`
            ALTER TYPE "event"."enum_EncounterChangeDates_availabilityAway"
            RENAME TO "enum_EncounterChangeDates_availabilityAway_old"
        `);
        await queryRunner.query(`
            CREATE TYPE "event"."EncounterChangeDates_availabilityaway_enum" AS ENUM('POSSIBLE', 'NOT_POSSIBLE')
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterChangeDates"
            ALTER COLUMN "availabilityAway" TYPE "event"."EncounterChangeDates_availabilityaway_enum" USING "availabilityAway"::"text"::"event"."EncounterChangeDates_availabilityaway_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "event"."enum_EncounterChangeDates_availabilityAway_old"
        `);
       
        await queryRunner.query(`
            ALTER TABLE "event"."Locations"
            ALTER COLUMN "coordinates" TYPE geometry
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."Roles"
            ALTER COLUMN "createdAt" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TYPE "security"."enum_Roles_linkType"
            RENAME TO "enum_Roles_linkType_old"
        `);
        await queryRunner.query(`
            CREATE TYPE "security"."Roles_linktype_enum" AS ENUM(
                'global',
                'club',
                'team',
                'competition',
                'tournament'
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."Roles"
            ALTER COLUMN "linkType" TYPE "security"."Roles_linktype_enum" USING "linkType"::"text"::"security"."Roles_linktype_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "security"."enum_Roles_linkType_old"
        `);
        await queryRunner.query(`
            UPDATE "Players"
            SET "sub" = NULL
            WHERE "sub" = ''
        `);
         await queryRunner.query(`
            UPDATE "Players"
            SET "memberId" = NULL
            WHERE "memberId" = ''
        `);
        // if any any sub is duplicated pick the first one
        await queryRunner.query(`
            WITH cte AS (
                SELECT "id", "sub", ROW_NUMBER() OVER (PARTITION BY "sub" ORDER BY "id") AS rn
                FROM "Players"
                WHERE "sub" IS NOT NULL
            )
            UPDATE "Players"
            SET "sub" = NULL
            WHERE "id" IN (SELECT "id" FROM cte WHERE rn > 1)
        `);

        await queryRunner.query(`
            ALTER TABLE "Players"
            ADD CONSTRAINT "UQ_ebfaf552b0ab613e69aa1ba4202" UNIQUE ("sub")
        `);
       
        await queryRunner.query(`
            ALTER TABLE "Players" DROP CONSTRAINT "Players_slug_key"
        `);
        // Preserve Players.gender data while changing column length from 255 to 10
        await queryRunner.query(`
            ALTER TABLE "Players"
            ADD COLUMN "gender_new" character varying(10)
        `);
        await queryRunner.query(`
            UPDATE "Players" 
            SET "gender_new" = LEFT("gender", 10)
            WHERE "gender" IS NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "Players" DROP COLUMN "gender"
        `);
        await queryRunner.query(`
            ALTER TABLE "Players"
            RENAME COLUMN "gender_new" TO "gender"
        `);
        await queryRunner.query(`
            ALTER TABLE "Players"
            ALTER COLUMN "competitionPlayer" DROP DEFAULT
        `);
        await queryRunner.query(`
            ALTER TYPE "public"."enum_Teams_preferredDay"
            RENAME TO "enum_Teams_preferredDay_old"
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."Teams_preferredday_enum" AS ENUM(
                'sunday',
                'monday',
                'tuesday',
                'wednesday',
                'thursday',
                'friday',
                'saturday'
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "Teams"
            ALTER COLUMN "preferredDay" TYPE "public"."Teams_preferredday_enum" USING "preferredDay"::"text"::"public"."Teams_preferredday_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."enum_Teams_preferredDay_old"
        `);
        await queryRunner.query(`
            ALTER TABLE "Teams" DROP CONSTRAINT "Teams_slug_key"
        `);
        await queryRunner.query(`
            DELETE FROM "Teams"
            WHERE "type" IS NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "Teams"
            ALTER COLUMN "type"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TYPE "public"."enum_Teams_preferredDay2"
            RENAME TO "enum_Teams_preferredDay2_old"
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."Teams_preferredday2_enum" AS ENUM(
                'sunday',
                'monday',
                'tuesday',
                'wednesday',
                'thursday',
                'friday',
                'saturday'
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "Teams"
            ALTER COLUMN "preferredDay2" TYPE "public"."Teams_preferredday2_enum" USING "preferredDay2"::"text"::"public"."Teams_preferredday2_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."enum_Teams_preferredDay2_old"
        `);
        await queryRunner.query(`
            ALTER TABLE "Clubs"
            ALTER COLUMN "teamName"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TYPE "public"."enum_Clubs_useForTeamName"
            RENAME TO "enum_Clubs_useForTeamName_old"
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."Clubs_useforteamname_enum" AS ENUM('name', 'teamName', 'fullName', 'abbreviation')
        `);
        await queryRunner.query(`
            ALTER TABLE "Clubs"
            ALTER COLUMN "useForTeamName" DROP DEFAULT
        `);
        await queryRunner.query(`
            ALTER TABLE "Clubs"
            ALTER COLUMN "useForTeamName" TYPE "public"."Clubs_useforteamname_enum" USING "useForTeamName"::"text"::"public"."Clubs_useforteamname_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."enum_Clubs_useForTeamName_old"
        `);
        await queryRunner.query(`
            ALTER TABLE "Clubs"
            ALTER COLUMN "useForTeamName"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "Clubs"
            ALTER COLUMN "abbreviation"
            SET NOT NULL
        `);

        await queryRunner.query(`
          DELETE FROM "Clubs" where "clubId" = 15 and "id" = '9c62b2b6-507e-4428-8579-8a280dfaa19e';
        `);

        await queryRunner.query(`
            ALTER TABLE "Clubs"
            ADD CONSTRAINT "UQ_8df52627355046c679aeb6c2401" UNIQUE ("clubId")
        `);
        await queryRunner.query(`
            ALTER TABLE "Clubs"
            ALTER COLUMN "slug"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "Clubs" DROP CONSTRAINT "Clubs_slug_key"
        `);
        await queryRunner.query(`
            ALTER TABLE "Clubs"
            ALTER COLUMN "country" DROP DEFAULT
        `);
        await queryRunner.query(`
            ALTER TABLE "ClubPlayerMemberships"
            ALTER COLUMN "confirmed" DROP DEFAULT
        `);
        await queryRunner.query(`
            ALTER TYPE "public"."enum_ClubPlayerMemberships_membershipType"
            RENAME TO "enum_ClubPlayerMemberships_membershipType_old"
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."ClubPlayerMemberships_membershiptype_enum" AS ENUM('NORMAL', 'LOAN')
        `);
        await queryRunner.query(`
            ALTER TABLE "ClubPlayerMemberships"
            ALTER COLUMN "membershipType" DROP DEFAULT
        `);
        await queryRunner.query(`
            ALTER TABLE "ClubPlayerMemberships"
            ALTER COLUMN "membershipType" TYPE "public"."ClubPlayerMemberships_membershiptype_enum" USING "membershipType"::"text"::"public"."ClubPlayerMemberships_membershiptype_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."enum_ClubPlayerMemberships_membershipType_old"
        `);
        await queryRunner.query(`
            ALTER TABLE "Comments"
            ALTER COLUMN "createdAt"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "Comments"
            ALTER COLUMN "updatedAt"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "Comments"
            ALTER COLUMN "message"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "personal"."Notifications"
            ALTER COLUMN "createdAt"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "personal"."Notifications"
            ALTER COLUMN "updatedAt"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "RequestLinks"
            ALTER COLUMN "sub"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "RequestLinks"
            ALTER COLUMN "playerId"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships" DROP CONSTRAINT "PlayerClaimMemberships_pkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships"
            ADD CONSTRAINT "PlayerClaimMemberships_pkey" PRIMARY KEY ("claimId", "id")
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships" DROP CONSTRAINT "PlayerClaimMemberships_pkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships"
            ADD CONSTRAINT "PK_b5c1ba2c8aa2ea86df91114eb60" PRIMARY KEY ("id")
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships"
            ALTER COLUMN "updatedAt"
            SET DEFAULT now()
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships"
            ALTER COLUMN "createdAt"
            SET DEFAULT now()
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships" DROP CONSTRAINT "RoleClaimMemberships_pkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships"
            ADD CONSTRAINT "RoleClaimMemberships_pkey" PRIMARY KEY ("claimId", "id")
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships" DROP CONSTRAINT "RoleClaimMemberships_pkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships"
            ADD CONSTRAINT "PK_83abbf86c650c05390fd7764ccd" PRIMARY KEY ("id")
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships"
            ALTER COLUMN "updatedAt"
            SET DEFAULT now()
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships"
            ALTER COLUMN "createdAt"
            SET DEFAULT now()
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships" DROP CONSTRAINT "PlayerRoleMemberships_pkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships"
            ADD CONSTRAINT "PlayerRoleMemberships_pkey" PRIMARY KEY ("roleId", "id")
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships" DROP CONSTRAINT "PlayerRoleMemberships_pkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships"
            ADD CONSTRAINT "PK_27325872cd2ec9b98e262afdf30" PRIMARY KEY ("id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_503de81b311ef8e61ef5dd72a9" ON "event"."Entries" ("subEventId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_287481d853ffc2a318fa58d116" ON "event"."Entries" ("drawId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_b9a08449d33c5d0ce86d2c4c61" ON "event"."Entries" ("player1Id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_83e968e47d34a9d2a9882a0838" ON "event"."Entries" ("player2Id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_bc7d7f97d512a125be110efc55" ON "event"."Entries" ("teamId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_358f3873dad4cf6cf52a32c893" ON "security"."Claims" ("name")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_50d658fb8980e83fa9955cbe8b" ON "security"."Claims" ("description")
        `);
        await queryRunner.query(`
            delete from "security"."Claims" where "id" in ('401bfdbd-c11b-4a7a-89ed-3599c5e4da86', '5d532421-0cfc-43d7-b22d-dea7a3f29b7b')
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "Claims_name_category" ON "security"."Claims" ("name", "category")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_81cda17dc463bac61d0fdac0b3" ON "event"."EncounterChangeDates" ("encounterChangeId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_74f11ae9b5cd572113398792ed" ON "event"."Locations" ("name")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_8eadedb8470c92966389ecc216" ON "security"."Roles" ("name")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_f16a13bee45dbdf7396b2e8ad4" ON "security"."Roles" ("description")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_ebfaf552b0ab613e69aa1ba420" ON "Players" ("sub")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_c85506f224975c810e6edce1b1" ON "Players" ("firstName")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_b0d6e80978195262cc4349c5f8" ON "Players" ("lastName")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_068a64efe79abae7599848f485" ON "Players" ("slug")
        `);
        await queryRunner.query(`
            delete from "Players" where "memberId" = '50109200' and "sub" is null
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_d55be4fadce35c977029a620e6" ON "Players" ("memberId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_bfcc42df63c3e980491db96d92" ON "Players" ("firstName", "lastName")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_854e80bf4111a363162efa1c1a" ON "Clubs" ("name")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_dfc7ce7bda0d01ccd9cded1f2d" ON "Comments" ("message")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_1156ad809e7449c1c2c0f5fbb4" ON "personal"."Settings" ("playerId")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_30c7259b31a167c93b3d5d1e86" ON "RequestLinks" ("requestId")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_ba517d629b14b5e19add263a04" ON "RequestLinks" ("sub")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_a03d57401ba2f731457db73a67" ON "security"."PlayerClaimMemberships" ("playerId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_4e01a9879a5374db2acd070d67" ON "security"."PlayerClaimMemberships" ("claimId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_c58a3fa6f0cf3e39415fb8c921" ON "security"."RoleClaimMemberships" ("roleId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_ff730a10bb49aa72b3970ad9f0" ON "security"."RoleClaimMemberships" ("claimId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_961cf6b41caf37702153197d2b" ON "security"."PlayerRoleMemberships" ("playerId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_d3e4951d21386ee72a663eeec5" ON "security"."PlayerRoleMemberships" ("roleId")
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventCompetitions"
            ADD CONSTRAINT "UQ_c36e7497c11d4164582e91d6f89" UNIQUE ("name", "eventType", "eventId")
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments"
            ADD CONSTRAINT "FK_9dbf0e1a0794ec4155523435881" FOREIGN KEY ("eventId") REFERENCES "event"."EventTournaments"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Standings"
            ADD CONSTRAINT "FK_8e23443cc2621bd06c7e3cbb44b" FOREIGN KEY ("entryId") REFERENCES "event"."Entries"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            delete from "event"."Standings" where "entryId" in (select "id" from "event"."Entries" where "player1Id" = '0d1829c8-e74b-4dd6-a70c-f865a899cb6d' or "player2Id" = '0d1829c8-e74b-4dd6-a70c-f865a899cb6d')
        `);
        await queryRunner.query(`
            delete from "event"."Entries" where "player1Id" = '0d1829c8-e74b-4dd6-a70c-f865a899cb6d' or "player2Id" = '0d1829c8-e74b-4dd6-a70c-f865a899cb6d'
        `);        
        await queryRunner.query(`
            ALTER TABLE "event"."Entries"
            ADD CONSTRAINT "FK_b9a08449d33c5d0ce86d2c4c61c" FOREIGN KEY ("player1Id") REFERENCES "Players"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Entries"
            ADD CONSTRAINT "FK_83e968e47d34a9d2a9882a08389" FOREIGN KEY ("player2Id") REFERENCES "Players"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."DrawTournaments"
            ADD CONSTRAINT "FK_3b4f8b61679baa78c14100f8783" FOREIGN KEY ("subeventId") REFERENCES "event"."SubEventTournaments"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventCompetitions"
            ADD CONSTRAINT "FK_5e066c4c892f9b8a4de809b2220" FOREIGN KEY ("eventId") REFERENCES "event"."EventCompetitions"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."DrawCompetitions"
            ADD CONSTRAINT "FK_c89cafab853c0e4afef9055c8cd" FOREIGN KEY ("subeventId") REFERENCES "event"."SubEventCompetitions"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "personal"."Assemblies"
            ADD CONSTRAINT "FK_6abcf798b6433017c58a83b7305" FOREIGN KEY ("encounterId") REFERENCES "event"."EncounterCompetitions"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions"
            ADD CONSTRAINT "FK_863db566eb7926ed7c2fbc327ce" FOREIGN KEY ("drawId") REFERENCES "event"."DrawCompetitions"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions"
            ADD CONSTRAINT "FK_6b751e46339fc32e068d8129c0d" FOREIGN KEY ("homeTeamId") REFERENCES "Teams"("id") ON DELETE
            SET NULL ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions"
            ADD CONSTRAINT "FK_05610259e877e0a587774aed5cb" FOREIGN KEY ("awayTeamId") REFERENCES "Teams"("id") ON DELETE
            SET NULL ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystemRankingGroupMemberships"
            ADD CONSTRAINT "FK_d0320025cfdf44ee7609829022a" FOREIGN KEY ("systemId") REFERENCES "ranking"."RankingSystems"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystemRankingGroupMemberships"
            ADD CONSTRAINT "FK_3b8afe506db2e006445d8fe9a22" FOREIGN KEY ("groupId") REFERENCES "ranking"."RankingGroups"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            delete from "ranking"."RankingPlaces" where "playerId" = '0d1829c8-e74b-4dd6-a70c-f865a899cb6d'
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPlaces"
            ADD CONSTRAINT "FK_81b10f6e5a751108b3c3387114c" FOREIGN KEY ("playerId") REFERENCES "Players"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPlaces"
            ADD CONSTRAINT "FK_506581cb94a36eb978fc5ccc824" FOREIGN KEY ("systemId") REFERENCES "ranking"."RankingSystems"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            delete from "ranking"."RankingLastPlaces" where "playerId" = '0d1829c8-e74b-4dd6-a70c-f865a899cb6d'
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingLastPlaces"
            ADD CONSTRAINT "FK_43b21895b5a5be60041562616c2" FOREIGN KEY ("playerId") REFERENCES "Players"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingLastPlaces"
            ADD CONSTRAINT "FK_72fcbcbca75596f83be474b1e1c" FOREIGN KEY ("systemId") REFERENCES "ranking"."RankingSystems"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            delete from "ranking"."RankingPoints" where "playerId" = '0d1829c8-e74b-4dd6-a70c-f865a899cb6d'
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPoints"
            ADD CONSTRAINT "FK_8c890805fb9d78c5464e7c3ee40" FOREIGN KEY ("playerId") REFERENCES "Players"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPoints"
            ADD CONSTRAINT "FK_d55c56c644dd344ba71e411dc93" FOREIGN KEY ("gameId") REFERENCES "event"."Games"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPoints"
            ADD CONSTRAINT "FK_fc0a37f539e1af22063e23e8c0c" FOREIGN KEY ("systemId") REFERENCES "ranking"."RankingSystems"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            delete from "event"."GamePlayerMemberships" where "playerId" = '0d1829c8-e74b-4dd6-a70c-f865a899cb6d'
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."GamePlayerMemberships"
            ADD CONSTRAINT "FK_838500ca255539b133c7b86f8b7" FOREIGN KEY ("playerId") REFERENCES "Players"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."GamePlayerMemberships"
            ADD CONSTRAINT "FK_afe644cba7b2ed50c0051cf9b97" FOREIGN KEY ("gameId") REFERENCES "event"."Games"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
   
        await queryRunner.query(`
            ALTER TABLE "TeamPlayerMemberships"
            ADD CONSTRAINT "FK_7612ed67aaf658bdffe35ae9d62" FOREIGN KEY ("playerId") REFERENCES "Players"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "TeamPlayerMemberships"
            ADD CONSTRAINT "FK_a7467adaccf8d780abc83350816" FOREIGN KEY ("teamId") REFERENCES "Teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterChangeDates"
            ADD CONSTRAINT "FK_81cda17dc463bac61d0fdac0b36" FOREIGN KEY ("encounterChangeId") REFERENCES "event"."EncounterChanges"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."Roles"
            ADD CONSTRAINT "FK_24174e5ba4e11d2eb9ae737ed15" FOREIGN KEY ("clubId") REFERENCES "Clubs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."Roles"
            ADD CONSTRAINT "FK_94cd79a972e0374a25a49195324" FOREIGN KEY ("teamId") REFERENCES "Teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."Roles"
            ADD CONSTRAINT "FK_c1844837e8bc13f5bab0ab077ca" FOREIGN KEY ("competitionId") REFERENCES "event"."EventCompetitions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."Roles"
            ADD CONSTRAINT "FK_56430b99066b73546d18ef384c4" FOREIGN KEY ("tournamentId") REFERENCES "event"."EventTournaments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "Teams"
            ADD CONSTRAINT "FK_ce43a59a6ab0c141eb0372a932c" FOREIGN KEY ("captainId") REFERENCES "Players"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            delete from "Teams" where "clubId" = '9c62b2b6-507e-4428-8579-8a280dfaa19e'
        `);
        await queryRunner.query(`
            ALTER TABLE "Teams"
            ADD CONSTRAINT "FK_2ec058fec5585684854fa80197d" FOREIGN KEY ("clubId") REFERENCES "Clubs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            delete from "ClubPlayerMemberships" where "playerId" = '0d1829c8-e74b-4dd6-a70c-f865a899cb6d'
        `);
        await queryRunner.query(`
            ALTER TABLE "ClubPlayerMemberships"
            ADD CONSTRAINT "FK_0c39db4aebb22ddacb3354d9949" FOREIGN KEY ("playerId") REFERENCES "Players"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            delete from "ClubPlayerMemberships" where "clubId" = '9c62b2b6-507e-4428-8579-8a280dfaa19e'
        `);
        await queryRunner.query(`
            ALTER TABLE "ClubPlayerMemberships"
            ADD CONSTRAINT "FK_d9a625ad8485da798534c1587d5" FOREIGN KEY ("clubId") REFERENCES "Clubs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships"
            ADD CONSTRAINT "FK_a03d57401ba2f731457db73a67a" FOREIGN KEY ("playerId") REFERENCES "Players"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships"
            ADD CONSTRAINT "FK_4e01a9879a5374db2acd070d672" FOREIGN KEY ("claimId") REFERENCES "security"."Claims"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships"
            ADD CONSTRAINT "FK_c58a3fa6f0cf3e39415fb8c921e" FOREIGN KEY ("roleId") REFERENCES "security"."Roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            delete from "security"."RoleClaimMemberships" where "claimId" in ('5d532421-0cfc-43d7-b22d-dea7a3f29b7b', '401bfdbd-c11b-4a7a-89ed-3599c5e4da86')
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships"
            ADD CONSTRAINT "FK_ff730a10bb49aa72b3970ad9f02" FOREIGN KEY ("claimId") REFERENCES "security"."Claims"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships"
            ADD CONSTRAINT "FK_961cf6b41caf37702153197d2b6" FOREIGN KEY ("playerId") REFERENCES "Players"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships"
            ADD CONSTRAINT "FK_d3e4951d21386ee72a663eeec58" FOREIGN KEY ("roleId") REFERENCES "security"."Roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // WARNING: This down migration will cause data loss in ranking group relationships
        // because it converts UUIDs back to varchar without preserving existing relationships.
        // Additionally, this may cause data loss if any Players.gender values are longer than 255 chars
        // (though this is unlikely). This migration should not be run in production without 
        // a proper data backup and manual data migration strategy.
        
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships" DROP CONSTRAINT "FK_d3e4951d21386ee72a663eeec58"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships" DROP CONSTRAINT "FK_961cf6b41caf37702153197d2b6"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships" DROP CONSTRAINT "FK_ff730a10bb49aa72b3970ad9f02"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships" DROP CONSTRAINT "FK_c58a3fa6f0cf3e39415fb8c921e"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships" DROP CONSTRAINT "FK_4e01a9879a5374db2acd070d672"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships" DROP CONSTRAINT "FK_a03d57401ba2f731457db73a67a"
        `);
        await queryRunner.query(`
            ALTER TABLE "ClubPlayerMemberships" DROP CONSTRAINT "FK_d9a625ad8485da798534c1587d5"
        `);
        await queryRunner.query(`
            ALTER TABLE "ClubPlayerMemberships" DROP CONSTRAINT "FK_0c39db4aebb22ddacb3354d9949"
        `);
        await queryRunner.query(`
            ALTER TABLE "Teams" DROP CONSTRAINT "FK_2ec058fec5585684854fa80197d"
        `);
        await queryRunner.query(`
            ALTER TABLE "Teams" DROP CONSTRAINT "FK_ce43a59a6ab0c141eb0372a932c"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."Roles" DROP CONSTRAINT "FK_56430b99066b73546d18ef384c4"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."Roles" DROP CONSTRAINT "FK_c1844837e8bc13f5bab0ab077ca"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."Roles" DROP CONSTRAINT "FK_94cd79a972e0374a25a49195324"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."Roles" DROP CONSTRAINT "FK_24174e5ba4e11d2eb9ae737ed15"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterChangeDates" DROP CONSTRAINT "FK_81cda17dc463bac61d0fdac0b36"
        `);
        await queryRunner.query(`
            ALTER TABLE "TeamPlayerMemberships" DROP CONSTRAINT "FK_a7467adaccf8d780abc83350816"
        `);
        await queryRunner.query(`
            ALTER TABLE "TeamPlayerMemberships" DROP CONSTRAINT "FK_7612ed67aaf658bdffe35ae9d62"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."GamePlayerMemberships" DROP CONSTRAINT "FK_afe644cba7b2ed50c0051cf9b97"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."GamePlayerMemberships" DROP CONSTRAINT "FK_838500ca255539b133c7b86f8b7"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPoints" DROP CONSTRAINT "FK_fc0a37f539e1af22063e23e8c0c"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPoints" DROP CONSTRAINT "FK_d55c56c644dd344ba71e411dc93"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPoints" DROP CONSTRAINT "FK_8c890805fb9d78c5464e7c3ee40"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingLastPlaces" DROP CONSTRAINT "FK_72fcbcbca75596f83be474b1e1c"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingLastPlaces" DROP CONSTRAINT "FK_43b21895b5a5be60041562616c2"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPlaces" DROP CONSTRAINT "FK_506581cb94a36eb978fc5ccc824"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPlaces" DROP CONSTRAINT "FK_81b10f6e5a751108b3c3387114c"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystemRankingGroupMemberships" DROP CONSTRAINT "FK_3b8afe506db2e006445d8fe9a22"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystemRankingGroupMemberships" DROP CONSTRAINT "FK_d0320025cfdf44ee7609829022a"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions" DROP CONSTRAINT "FK_05610259e877e0a587774aed5cb"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions" DROP CONSTRAINT "FK_6b751e46339fc32e068d8129c0d"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions" DROP CONSTRAINT "FK_863db566eb7926ed7c2fbc327ce"
        `);
        await queryRunner.query(`
            ALTER TABLE "personal"."Assemblies" DROP CONSTRAINT "FK_6abcf798b6433017c58a83b7305"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."DrawCompetitions" DROP CONSTRAINT "FK_c89cafab853c0e4afef9055c8cd"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventCompetitions" DROP CONSTRAINT "FK_5e066c4c892f9b8a4de809b2220"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."DrawTournaments" DROP CONSTRAINT "FK_3b4f8b61679baa78c14100f8783"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Entries" DROP CONSTRAINT "FK_83e968e47d34a9d2a9882a08389"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Entries" DROP CONSTRAINT "FK_b9a08449d33c5d0ce86d2c4c61c"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Standings" DROP CONSTRAINT "FK_8e23443cc2621bd06c7e3cbb44b"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments" DROP CONSTRAINT "FK_9dbf0e1a0794ec4155523435881"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventCompetitions" DROP CONSTRAINT "UQ_c36e7497c11d4164582e91d6f89"
        `);
        await queryRunner.query(`
            DROP INDEX "security"."IDX_d3e4951d21386ee72a663eeec5"
        `);
        await queryRunner.query(`
            DROP INDEX "security"."IDX_961cf6b41caf37702153197d2b"
        `);
        await queryRunner.query(`
            DROP INDEX "security"."IDX_ff730a10bb49aa72b3970ad9f0"
        `);
        await queryRunner.query(`
            DROP INDEX "security"."IDX_c58a3fa6f0cf3e39415fb8c921"
        `);
        await queryRunner.query(`
            DROP INDEX "security"."IDX_4e01a9879a5374db2acd070d67"
        `);
        await queryRunner.query(`
            DROP INDEX "security"."IDX_a03d57401ba2f731457db73a67"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_ba517d629b14b5e19add263a04"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_30c7259b31a167c93b3d5d1e86"
        `);
        await queryRunner.query(`
            DROP INDEX "personal"."IDX_1156ad809e7449c1c2c0f5fbb4"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_dfc7ce7bda0d01ccd9cded1f2d"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_854e80bf4111a363162efa1c1a"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_bfcc42df63c3e980491db96d92"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_d55be4fadce35c977029a620e6"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_068a64efe79abae7599848f485"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_b0d6e80978195262cc4349c5f8"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_c85506f224975c810e6edce1b1"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_ebfaf552b0ab613e69aa1ba420"
        `);
        await queryRunner.query(`
            DROP INDEX "security"."IDX_f16a13bee45dbdf7396b2e8ad4"
        `);
        await queryRunner.query(`
            DROP INDEX "security"."IDX_8eadedb8470c92966389ecc216"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_74f11ae9b5cd572113398792ed"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_81cda17dc463bac61d0fdac0b3"
        `);
        await queryRunner.query(`
            DROP INDEX "security"."Claims_name_category"
        `);
        await queryRunner.query(`
            DROP INDEX "security"."IDX_50d658fb8980e83fa9955cbe8b"
        `);
        await queryRunner.query(`
            DROP INDEX "security"."IDX_358f3873dad4cf6cf52a32c893"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_bc7d7f97d512a125be110efc55"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_83e968e47d34a9d2a9882a0838"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_b9a08449d33c5d0ce86d2c4c61"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_287481d853ffc2a318fa58d116"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_503de81b311ef8e61ef5dd72a9"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships" DROP CONSTRAINT "PK_27325872cd2ec9b98e262afdf30"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships"
            ADD CONSTRAINT "PlayerRoleMemberships_pkey" PRIMARY KEY ("roleId", "id")
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships" DROP CONSTRAINT "PlayerRoleMemberships_pkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships"
            ADD CONSTRAINT "PlayerRoleMemberships_pkey" PRIMARY KEY ("playerId", "roleId", "id")
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships"
            ALTER COLUMN "createdAt" DROP DEFAULT
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships"
            ALTER COLUMN "updatedAt" DROP DEFAULT
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships" DROP CONSTRAINT "PK_83abbf86c650c05390fd7764ccd"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships"
            ADD CONSTRAINT "RoleClaimMemberships_pkey" PRIMARY KEY ("claimId", "id")
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships" DROP CONSTRAINT "RoleClaimMemberships_pkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships"
            ADD CONSTRAINT "RoleClaimMemberships_pkey" PRIMARY KEY ("roleId", "claimId", "id")
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships"
            ALTER COLUMN "createdAt" DROP DEFAULT
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships"
            ALTER COLUMN "updatedAt" DROP DEFAULT
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships" DROP CONSTRAINT "PK_b5c1ba2c8aa2ea86df91114eb60"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships"
            ADD CONSTRAINT "PlayerClaimMemberships_pkey" PRIMARY KEY ("claimId", "id")
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships" DROP CONSTRAINT "PlayerClaimMemberships_pkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships"
            ADD CONSTRAINT "PlayerClaimMemberships_pkey" PRIMARY KEY ("playerId", "claimId", "id")
        `);
        await queryRunner.query(`
            ALTER TABLE "RequestLinks"
            ALTER COLUMN "playerId" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "RequestLinks"
            ALTER COLUMN "sub" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "personal"."Notifications"
            ALTER COLUMN "updatedAt" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "personal"."Notifications"
            ALTER COLUMN "createdAt" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "Comments"
            ALTER COLUMN "message" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "Comments"
            ALTER COLUMN "updatedAt" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "Comments"
            ALTER COLUMN "createdAt" DROP NOT NULL
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."enum_ClubPlayerMemberships_membershipType_old" AS ENUM('NORMAL', 'LOAN')
        `);
        await queryRunner.query(`
            ALTER TABLE "ClubPlayerMemberships"
            ALTER COLUMN "membershipType" TYPE "public"."enum_ClubPlayerMemberships_membershipType_old" USING "membershipType"::"text"::"public"."enum_ClubPlayerMemberships_membershipType_old"
        `);
        await queryRunner.query(`
            ALTER TABLE "ClubPlayerMemberships"
            ALTER COLUMN "membershipType"
            SET DEFAULT 'NORMAL'
        `);
        await queryRunner.query(`
            DROP TYPE "public"."ClubPlayerMemberships_membershiptype_enum"
        `);
        await queryRunner.query(`
            ALTER TYPE "public"."enum_ClubPlayerMemberships_membershipType_old"
            RENAME TO "enum_ClubPlayerMemberships_membershipType"
        `);
        await queryRunner.query(`
            ALTER TABLE "ClubPlayerMemberships"
            ALTER COLUMN "confirmed"
            SET DEFAULT false
        `);
        await queryRunner.query(`
            ALTER TABLE "Clubs"
            ALTER COLUMN "country"
            SET DEFAULT 'be'
        `);
        await queryRunner.query(`
            ALTER TABLE "Clubs"
            ADD CONSTRAINT "Clubs_slug_key" UNIQUE ("slug")
        `);
        await queryRunner.query(`
            ALTER TABLE "Clubs"
            ALTER COLUMN "slug" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "Clubs" DROP CONSTRAINT "UQ_8df52627355046c679aeb6c2401"
        `);
        await queryRunner.query(`
            ALTER TABLE "Clubs"
            ALTER COLUMN "abbreviation" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "Clubs"
            ALTER COLUMN "useForTeamName" DROP NOT NULL
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."enum_Clubs_useForTeamName_old" AS ENUM('name', 'fullName', 'abbreviation', 'teamName')
        `);
        await queryRunner.query(`
            ALTER TABLE "Clubs"
            ALTER COLUMN "useForTeamName" TYPE "public"."enum_Clubs_useForTeamName_old" USING "useForTeamName"::"text"::"public"."enum_Clubs_useForTeamName_old"
        `);
        await queryRunner.query(`
            ALTER TABLE "Clubs"
            ALTER COLUMN "useForTeamName"
            SET DEFAULT 'name'
        `);
        await queryRunner.query(`
            DROP TYPE "public"."Clubs_useforteamname_enum"
        `);
        await queryRunner.query(`
            ALTER TYPE "public"."enum_Clubs_useForTeamName_old"
            RENAME TO "enum_Clubs_useForTeamName"
        `);
        await queryRunner.query(`
            ALTER TABLE "Clubs"
            ALTER COLUMN "teamName" DROP NOT NULL
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."enum_Teams_preferredDay2_old" AS ENUM(
                'monday',
                'tuesday',
                'wednesday',
                'thursday',
                'friday',
                'saturday',
                'sunday'
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "Teams"
            ALTER COLUMN "preferredDay2" TYPE "public"."enum_Teams_preferredDay2_old" USING "preferredDay2"::"text"::"public"."enum_Teams_preferredDay2_old"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."Teams_preferredday2_enum"
        `);
        await queryRunner.query(`
            ALTER TYPE "public"."enum_Teams_preferredDay2_old"
            RENAME TO "enum_Teams_preferredDay2"
        `);
        await queryRunner.query(`
            ALTER TABLE "Teams"
            ALTER COLUMN "type" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "Teams"
            ADD CONSTRAINT "Teams_slug_key" UNIQUE ("slug")
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."enum_Teams_preferredDay_old" AS ENUM(
                'sunday',
                'monday',
                'tuesday',
                'wednesday',
                'thursday',
                'friday',
                'saturday'
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "Teams"
            ALTER COLUMN "preferredDay" TYPE "public"."enum_Teams_preferredDay_old" USING "preferredDay"::"text"::"public"."enum_Teams_preferredDay_old"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."Teams_preferredday_enum"
        `);
        await queryRunner.query(`
            ALTER TYPE "public"."enum_Teams_preferredDay_old"
            RENAME TO "enum_Teams_preferredDay"
        `);
        await queryRunner.query(`
            ALTER TABLE "Players"
            ALTER COLUMN "competitionPlayer"
            SET DEFAULT false
        `);
        await queryRunner.query(`
            ALTER TABLE "Players" DROP COLUMN "gender"
        `);
        await queryRunner.query(`
            ALTER TABLE "Players"
            ADD "gender" character varying(255)
        `);
        await queryRunner.query(`
            ALTER TABLE "Players"
            ADD CONSTRAINT "Players_slug_key" UNIQUE ("slug")
        `);
        await queryRunner.query(`
            ALTER TABLE "Players" DROP CONSTRAINT "UQ_ebfaf552b0ab613e69aa1ba4202"
        `);
        await queryRunner.query(`
            CREATE TYPE "security"."enum_Roles_linkType_old" AS ENUM(
                'global',
                'club',
                'team',
                'competition',
                'tournament'
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."Roles"
            ALTER COLUMN "linkType" TYPE "security"."enum_Roles_linkType_old" USING "linkType"::"text"::"security"."enum_Roles_linkType_old"
        `);
        await queryRunner.query(`
            DROP TYPE "security"."Roles_linktype_enum"
        `);
        await queryRunner.query(`
            ALTER TYPE "security"."enum_Roles_linkType_old"
            RENAME TO "enum_Roles_linkType"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."Roles"
            ALTER COLUMN "createdAt"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Locations"
            ALTER COLUMN "coordinates" TYPE geometry(POINT, 4326)
        `);
       
        await queryRunner.query(`
            CREATE TYPE "event"."enum_EncounterChangeDates_availabilityAway_old" AS ENUM('POSSIBLE', 'NOT_POSSIBLE')
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterChangeDates"
            ALTER COLUMN "availabilityAway" TYPE "event"."enum_EncounterChangeDates_availabilityAway_old" USING "availabilityAway"::"text"::"event"."enum_EncounterChangeDates_availabilityAway_old"
        `);
        await queryRunner.query(`
            DROP TYPE "event"."EncounterChangeDates_availabilityaway_enum"
        `);
        await queryRunner.query(`
            ALTER TYPE "event"."enum_EncounterChangeDates_availabilityAway_old"
            RENAME TO "enum_EncounterChangeDates_availabilityAway"
        `);
       
        await queryRunner.query(`
            CREATE TYPE "event"."enum_EncounterChangeDates_availabilityHome_old" AS ENUM('POSSIBLE', 'NOT_POSSIBLE')
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterChangeDates"
            ALTER COLUMN "availabilityHome" TYPE "event"."enum_EncounterChangeDates_availabilityHome_old" USING "availabilityHome"::"text"::"event"."enum_EncounterChangeDates_availabilityHome_old"
        `);
        await queryRunner.query(`
            DROP TYPE "event"."EncounterChangeDates_availabilityhome_enum"
        `);
        await queryRunner.query(`
            ALTER TYPE "event"."enum_EncounterChangeDates_availabilityHome_old"
            RENAME TO "enum_EncounterChangeDates_availabilityHome"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterChangeDates"
            ALTER COLUMN "updatedAt" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterChangeDates"
            ALTER COLUMN "createdAt" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterChanges"
            ALTER COLUMN "updatedAt" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterChanges"
            ALTER COLUMN "createdAt" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."Claims"
            ALTER COLUMN "type"
            SET NOT NULL
        `);
        await queryRunner.query(`
            CREATE TYPE "security"."enum_Claims_type_old" AS ENUM(
                'global',
                'club',
                'team',
                'competition',
                'tournament'
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."Claims"
            ALTER COLUMN "type" TYPE "security"."enum_Claims_type_old" USING "type"::"text"::"security"."enum_Claims_type_old"
        `);
        await queryRunner.query(`
            DROP TYPE "security"."Claims_type_enum"
        `);
        await queryRunner.query(`
            ALTER TYPE "security"."enum_Claims_type_old"
            RENAME TO "enum_Claims_type"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."Claims"
            ALTER COLUMN "createdAt"
            SET NOT NULL
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."enum_TeamPlayerMemberships_membershipType_old" AS ENUM('REGULAR', 'BACKUP')
        `);
        await queryRunner.query(`
            ALTER TABLE "TeamPlayerMemberships"
            ALTER COLUMN "membershipType" DROP DEFAULT
        `);
        await queryRunner.query(`
            ALTER TABLE "TeamPlayerMemberships"
            ALTER COLUMN "membershipType" TYPE "public"."enum_TeamPlayerMemberships_membershipType_old" USING "membershipType"::"text"::"public"."enum_TeamPlayerMemberships_membershipType_old"
        `);
        await queryRunner.query(`
            ALTER TABLE "TeamPlayerMemberships"
            ALTER COLUMN "membershipType"
            SET DEFAULT 'REGULAR'
        `);
        await queryRunner.query(`
            DROP TYPE "public"."TeamPlayerMemberships_membershiptype_enum"
        `);
        await queryRunner.query(`
            ALTER TYPE "public"."enum_TeamPlayerMemberships_membershipType_old"
            RENAME TO "enum_TeamPlayerMemberships_membershipType"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."GamePlayerMemberships" DROP CONSTRAINT "PK_9944c9e20e2430dd1a82c4c9026"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."GamePlayerMemberships"
            ADD CONSTRAINT "GamePlayers_pkey" PRIMARY KEY ("gameId", "id")
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."GamePlayerMemberships" DROP CONSTRAINT "GamePlayers_pkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."GamePlayerMemberships"
            ADD CONSTRAINT "GamePlayers_pkey" PRIMARY KEY ("playerId", "gameId", "id")
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Games"
            ALTER COLUMN "linkType" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Games"
            ALTER COLUMN "linkId" DROP NOT NULL
        `);
        await queryRunner.query(`
            CREATE TYPE "event"."enum_Games_status_old" AS ENUM(
                'NORMAL',
                'WALKOVER',
                'RETIREMENT',
                'DISQUALIFIED',
                'NO_MATCH'
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Games"
            ALTER COLUMN "status" TYPE "event"."enum_Games_status_old" USING "status"::"text"::"event"."enum_Games_status_old"
        `);
        await queryRunner.query(`
            DROP TYPE "event"."Games_status_enum"
        `);
        await queryRunner.query(`
            ALTER TYPE "event"."enum_Games_status_old"
            RENAME TO "enum_Games_status"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Games"
            ALTER COLUMN "gameType" DROP NOT NULL
        `);
        await queryRunner.query(`
            CREATE TYPE "event"."enum_Games_gameType_old" AS ENUM('S', 'D', 'MX')
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Games"
            ALTER COLUMN "gameType" TYPE "event"."enum_Games_gameType_old" USING "gameType"::"text"::"event"."enum_Games_gameType_old"
        `);
        await queryRunner.query(`
            DROP TYPE "event"."Games_gametype_enum"
        `);
        await queryRunner.query(`
            ALTER TYPE "event"."enum_Games_gameType_old"
            RENAME TO "enum_Games_gameType"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPoints"
            ALTER COLUMN "systemId" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPoints"
            ALTER COLUMN "gameId" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPoints"
            ALTER COLUMN "playerId" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPoints"
            ALTER COLUMN "differenceInLevel" TYPE numeric(10, 2)
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "startingType" DROP NOT NULL
        `);
        await queryRunner.query(`
            CREATE TYPE "ranking"."enum_Systems_startingType_old" AS ENUM('formula', 'tableLFBB', 'tableBVL')
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "startingType" DROP DEFAULT
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "startingType" TYPE "ranking"."enum_Systems_startingType_old" USING "startingType"::"text"::"ranking"."enum_Systems_startingType_old"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "startingType"
            SET DEFAULT 'formula'
        `);
        await queryRunner.query(`
            DROP TYPE "ranking"."RankingSystems_startingtype_enum"
        `);
        await queryRunner.query(`
            ALTER TYPE "ranking"."enum_Systems_startingType_old"
            RENAME TO "enum_Systems_startingType"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "differenceForDowngradeMix" TYPE numeric(10, 2)
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "differenceForDowngradeDouble" TYPE numeric(10, 2)
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "differenceForDowngradeSingle" TYPE numeric(10, 2)
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "differenceForUpgradeMix" TYPE numeric(10, 2)
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "differenceForUpgradeDouble" TYPE numeric(10, 2)
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "differenceForUpgradeSingle" TYPE numeric(10, 2)
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "runCurrently" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "primary" DROP DEFAULT
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "primary" DROP NOT NULL
        `);
        await queryRunner.query(`
            CREATE TYPE "ranking"."enum_Systems_rankingSystem_old" AS ENUM('BVL', 'ORIGINAL', 'LFBB', 'VISUAL')
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "rankingSystem" TYPE "ranking"."enum_Systems_rankingSystem_old" USING "rankingSystem"::"text"::"ranking"."enum_Systems_rankingSystem_old"
        `);
        await queryRunner.query(`
            DROP TYPE "ranking"."RankingSystems_rankingsystem_enum"
        `);
        await queryRunner.query(`
            ALTER TYPE "ranking"."enum_Systems_rankingSystem_old"
            RENAME TO "enum_Systems_rankingSystem"
        `);
        await queryRunner.query(`
            CREATE TYPE "ranking"."enum_Systems_updateIntervalUnit_old" AS ENUM('months', 'weeks', 'days')
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "updateIntervalUnit" TYPE "ranking"."enum_Systems_updateIntervalUnit_old" USING "updateIntervalUnit"::"text"::"ranking"."enum_Systems_updateIntervalUnit_old"
        `);
        await queryRunner.query(`
            DROP TYPE "ranking"."RankingSystems_updateintervalunit_enum"
        `);
        await queryRunner.query(`
            ALTER TYPE "ranking"."enum_Systems_updateIntervalUnit_old"
            RENAME TO "enum_Systems_updateIntervalUnit"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "updateDayOfWeek"
            SET DEFAULT '1'
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "updateDayOfWeek"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "updateLastUpdate"
            SET DEFAULT '2016-08-31 22:00:00+00'
        `);
        await queryRunner.query(`
            CREATE TYPE "ranking"."enum_Systems_periodUnit_old" AS ENUM('months', 'weeks', 'days')
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "periodUnit" TYPE "ranking"."enum_Systems_periodUnit_old" USING "periodUnit"::"text"::"ranking"."enum_Systems_periodUnit_old"
        `);
        await queryRunner.query(`
            DROP TYPE "ranking"."RankingSystems_periodunit_enum"
        `);
        await queryRunner.query(`
            ALTER TYPE "ranking"."enum_Systems_periodUnit_old"
            RENAME TO "enum_Systems_periodUnit"
        `);
        await queryRunner.query(`
            CREATE TYPE "ranking"."enum_Systems_calculationIntervalUnit_old" AS ENUM('months', 'weeks', 'days')
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "calculationIntervalUnit" TYPE "ranking"."enum_Systems_calculationIntervalUnit_old" USING "calculationIntervalUnit"::"text"::"ranking"."enum_Systems_calculationIntervalUnit_old"
        `);
        await queryRunner.query(`
            DROP TYPE "ranking"."RankingSystems_calculationintervalunit_enum"
        `);
        await queryRunner.query(`
            ALTER TYPE "ranking"."enum_Systems_calculationIntervalUnit_old"
            RENAME TO "enum_Systems_calculationIntervalUnit"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "calculationDayOfWeek"
            SET DEFAULT '1'
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "calculationDayOfWeek"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "calculationLastUpdate"
            SET DEFAULT '2016-08-31 22:00:00+00'
        `);
        await queryRunner.query(`
            CREATE TYPE "ranking"."enum_RankingSystems_inactiveBehavior_old" AS ENUM('freeze', 'decrease')
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "inactiveBehavior" TYPE "ranking"."enum_RankingSystems_inactiveBehavior_old" USING "inactiveBehavior"::"text"::"ranking"."enum_RankingSystems_inactiveBehavior_old"
        `);
        await queryRunner.query(`
            DROP TYPE "ranking"."RankingSystems_inactivebehavior_enum"
        `);
        await queryRunner.query(`
            ALTER TYPE "ranking"."enum_RankingSystems_inactiveBehavior_old"
            RENAME TO "enum_RankingSystems_inactiveBehavior"
        `);
        await queryRunner.query(`
            CREATE TYPE "ranking"."enum_Systems_inactivityUnit_old" AS ENUM('months', 'weeks', 'days')
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "inactivityUnit" TYPE "ranking"."enum_Systems_inactivityUnit_old" USING "inactivityUnit"::"text"::"ranking"."enum_Systems_inactivityUnit_old"
        `);
        await queryRunner.query(`
            DROP TYPE "ranking"."RankingSystems_inactivityunit_enum"
        `);
        await queryRunner.query(`
            ALTER TYPE "ranking"."enum_Systems_inactivityUnit_old"
            RENAME TO "enum_Systems_inactivityUnit"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "procentLosing" TYPE numeric(10, 2)
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "procentWinningPlus1" TYPE numeric(10, 2)
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "procentWinning" TYPE numeric(10, 2)
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ADD CONSTRAINT "Systems_name_key" UNIQUE ("name")
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ALTER COLUMN "name" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingLastPlaces"
            ALTER COLUMN "systemId" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingLastPlaces"
            ALTER COLUMN "playerId" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingLastPlaces"
            ALTER COLUMN "doubleInactive" DROP DEFAULT
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingLastPlaces"
            ALTER COLUMN "doubleInactive" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingLastPlaces"
            ALTER COLUMN "mixInactive" DROP DEFAULT
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingLastPlaces"
            ALTER COLUMN "mixInactive" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingLastPlaces"
            ALTER COLUMN "singleInactive" DROP DEFAULT
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingLastPlaces"
            ALTER COLUMN "singleInactive" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingLastPlaces"
            ALTER COLUMN "rankingDate" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingLastPlaces"
            ALTER COLUMN "updatedAt" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingLastPlaces"
            ALTER COLUMN "createdAt" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPlaces"
            ALTER COLUMN "systemId" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPlaces"
            ALTER COLUMN "playerId" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPlaces"
            ALTER COLUMN "doubleInactive" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPlaces"
            ALTER COLUMN "mixInactive" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPlaces"
            ALTER COLUMN "singleInactive" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPlaces"
            ALTER COLUMN "updatePossible" DROP DEFAULT
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPlaces"
            ALTER COLUMN "updatePossible" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPlaces"
            ALTER COLUMN "gender" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPlaces"
            ALTER COLUMN "rankingDate" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystemRankingGroupMemberships" DROP COLUMN "groupId"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystemRankingGroupMemberships"
            ADD "groupId" character varying(255) NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystemRankingGroupMemberships" DROP CONSTRAINT "PK_d0ae308fb59648b66f1bec6c2ff"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystemRankingGroupMemberships"
            ADD CONSTRAINT "GroupSystems_pkey" PRIMARY KEY ("groupId", "id")
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystemRankingGroupMemberships" DROP CONSTRAINT "GroupSystems_pkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystemRankingGroupMemberships"
            ADD CONSTRAINT "GroupSystems_pkey" PRIMARY KEY ("groupId", "systemId", "id")
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingGroups"
            ADD CONSTRAINT "Groups_name_key" UNIQUE ("name")
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingGroups"
            ALTER COLUMN "name" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingGroups" DROP CONSTRAINT "PK_444b4810c1a20aa442417cd6b94"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingGroups" DROP COLUMN "id"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingGroups"
            ADD "id" character varying(255) NOT NULL DEFAULT gen_random_uuid()
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingGroups"
            ADD CONSTRAINT "Groups_pkey" PRIMARY KEY ("id")
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions"
            ALTER COLUMN "gameLeaderAccepted"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions"
            ALTER COLUMN "awayCaptainAccepted"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions"
            ALTER COLUMN "homeCaptainAccepted"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions"
            ALTER COLUMN "gameLeaderPresent"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions"
            ALTER COLUMN "awayCaptainPresent"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions"
            ALTER COLUMN "homeCaptainPresent"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "personal"."Assemblies"
            ALTER COLUMN "isComplete"
            SET NOT NULL
        `);
        await queryRunner.query(`
            DROP TYPE "event"."DrawCompetitions_type_enum"
        `);
        await queryRunner.query(`
            CREATE TYPE "event"."enum_SubEventCompetitions_eventType_old" AS ENUM('M', 'F', 'MX', 'MINIBAD')
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventCompetitions"
            ALTER COLUMN "eventType" TYPE "event"."enum_SubEventCompetitions_eventType_old" USING "eventType"::"text"::"event"."enum_SubEventCompetitions_eventType_old"
        `);
        await queryRunner.query(`
            DROP TYPE "event"."SubEventCompetitions_eventtype_enum"
        `);
        await queryRunner.query(`
            ALTER TYPE "event"."enum_SubEventCompetitions_eventType_old"
            RENAME TO "enum_SubEventCompetitions_eventType"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions"
            ALTER COLUMN "started" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions"
            ALTER COLUMN "country" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions"
            ALTER COLUMN "state" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions"
            ALTER COLUMN "type" DROP NOT NULL
        `);
        await queryRunner.query(`
            CREATE TYPE "event"."enum_EventCompetitions_type_old" AS ENUM('PROV', 'LIGA', 'NATIONAL')
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions"
            ALTER COLUMN "type" TYPE "event"."enum_EventCompetitions_type_old" USING "type"::"text"::"event"."enum_EventCompetitions_type_old"
        `);
        await queryRunner.query(`
            DROP TYPE "event"."EventCompetitions_type_enum"
        `);
        await queryRunner.query(`
            ALTER TYPE "event"."enum_EventCompetitions_type_old"
            RENAME TO "enum_EventCompetitions_type"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions"
            ALTER COLUMN "usedRankingUnit" DROP NOT NULL
        `);
        await queryRunner.query(`
            CREATE TYPE "event"."enum_EventCompetitions_usedRankingUnit_old" AS ENUM('months', 'weeks', 'days')
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions"
            ALTER COLUMN "usedRankingUnit" TYPE "event"."enum_EventCompetitions_usedRankingUnit_old" USING "usedRankingUnit"::"text"::"event"."enum_EventCompetitions_usedRankingUnit_old"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions"
            ALTER COLUMN "usedRankingUnit"
            SET DEFAULT 'months'
        `);
        await queryRunner.query(`
            DROP TYPE "event"."EventCompetitions_usedrankingunit_enum"
        `);
        await queryRunner.query(`
            ALTER TYPE "event"."enum_EventCompetitions_usedRankingUnit_old"
            RENAME TO "enum_EventCompetitions_usedRankingUnit"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions"
            ALTER COLUMN "usedRankingAmount"
            SET DEFAULT '4'
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions"
            ALTER COLUMN "usedRankingAmount" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions"
            ALTER COLUMN "teamMatcher" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions"
            ADD CONSTRAINT "EventCompetitions_slug_key" UNIQUE ("slug")
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions"
            ALTER COLUMN "slug" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions"
            ALTER COLUMN "visualCode" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions"
            ALTER COLUMN "changeCloseRequestDatePeriod2" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions"
            ALTER COLUMN "changeCloseDatePeriod2" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions"
            ALTER COLUMN "changeCloseRequestDatePeriod1" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions"
            ALTER COLUMN "changeCloseDatePeriod1" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions"
            ALTER COLUMN "changeOpenDate" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions"
            ALTER COLUMN "closeDate" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions"
            ALTER COLUMN "openDate" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions"
            ALTER COLUMN "lastSync" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions"
            ALTER COLUMN "season" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions"
            ALTER COLUMN "name" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."DrawTournaments"
            ALTER COLUMN "risers"
            SET DEFAULT '1'
        `);
        await queryRunner.query(`
            CREATE TYPE "event"."enum_DrawTournaments_type_old" AS ENUM('KO', 'POULE', 'QUALIFICATION')
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."DrawTournaments"
            ALTER COLUMN "type" TYPE "event"."enum_DrawTournaments_type_old" USING "type"::"text"::"event"."enum_DrawTournaments_type_old"
        `);
        await queryRunner.query(`
            DROP TYPE "event"."DrawTournaments_type_enum"
        `);
        await queryRunner.query(`
            ALTER TYPE "event"."enum_DrawTournaments_type_old"
            RENAME TO "enum_DrawTournaments_type"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Standings"
            ALTER COLUMN "position" DROP NOT NULL
        `);
        await queryRunner.query(`
            CREATE TYPE "event"."enum_SubEventTournaments_gameType_old" AS ENUM('S', 'D', 'MX')
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments"
            ALTER COLUMN "gameType" TYPE "event"."enum_SubEventTournaments_gameType_old" USING "gameType"::"text"::"event"."enum_SubEventTournaments_gameType_old"
        `);
        await queryRunner.query(`
            DROP TYPE "event"."SubEventTournaments_gametype_enum"
        `);
        await queryRunner.query(`
            ALTER TYPE "event"."enum_SubEventTournaments_gameType_old"
            RENAME TO "enum_SubEventTournaments_gameType"
        `);
        await queryRunner.query(`
            CREATE TYPE "event"."enum_SubEventTournaments_eventType_old" AS ENUM('M', 'F', 'MX', 'MINIBAD')
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments"
            ALTER COLUMN "eventType" TYPE "event"."enum_SubEventTournaments_eventType_old" USING "eventType"::"text"::"event"."enum_SubEventTournaments_eventType_old"
        `);
        await queryRunner.query(`
            DROP TYPE "event"."SubEventTournaments_eventtype_enum"
        `);
        await queryRunner.query(`
            ALTER TYPE "event"."enum_SubEventTournaments_eventType_old"
            RENAME TO "enum_SubEventTournaments_eventType"
        `);
        await queryRunner.query(`
            CREATE TYPE "event"."enum_EventTournaments_usedRankingUnit_old" AS ENUM('months', 'weeks', 'days')
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventTournaments"
            ALTER COLUMN "usedRankingUnit" DROP DEFAULT
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventTournaments"
            ALTER COLUMN "usedRankingUnit" TYPE "event"."enum_EventTournaments_usedRankingUnit_old" USING "usedRankingUnit"::"text"::"event"."enum_EventTournaments_usedRankingUnit_old"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventTournaments"
            ALTER COLUMN "usedRankingUnit"
            SET DEFAULT 'months'
        `);
        await queryRunner.query(`
            DROP TYPE "event"."EventTournaments_usedrankingunit_enum"
        `);
        await queryRunner.query(`
            ALTER TYPE "event"."enum_EventTournaments_usedRankingUnit_old"
            RENAME TO "enum_EventTournaments_usedRankingUnit"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventTournaments"
            ADD CONSTRAINT "EventTournaments_slug_key" UNIQUE ("slug")
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships" DROP CONSTRAINT "PlayerRoleMemberships_pkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships"
            ADD CONSTRAINT "PlayerRoleMemberships_pkey" PRIMARY KEY ("playerId", "roleId")
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships" DROP COLUMN "id"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships" DROP CONSTRAINT "RoleClaimMemberships_pkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships"
            ADD CONSTRAINT "RoleClaimMemberships_pkey" PRIMARY KEY ("roleId", "claimId")
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships" DROP COLUMN "id"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships" DROP CONSTRAINT "PlayerClaimMemberships_pkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships"
            ADD CONSTRAINT "PlayerClaimMemberships_pkey" PRIMARY KEY ("playerId", "claimId")
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships" DROP COLUMN "id"
        `);
        await queryRunner.query(`
            ALTER TABLE "RequestLinks" DROP COLUMN "usedAt"
        `);
        await queryRunner.query(`
            ALTER TABLE "RequestLinks" DROP COLUMN "isUsed"
        `);
        await queryRunner.query(`
            ALTER TABLE "RequestLinks" DROP COLUMN "expiresAt"
        `);
        await queryRunner.query(`
            ALTER TABLE "RequestLinks" DROP COLUMN "requestType"
        `);
        await queryRunner.query(`
            ALTER TABLE "RequestLinks" DROP COLUMN "requestId"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."Roles" DROP COLUMN "tournamentId"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."Roles" DROP COLUMN "competitionId"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."Roles" DROP COLUMN "teamId"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."Roles" DROP COLUMN "clubId"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."GamePlayerMemberships" DROP CONSTRAINT "GamePlayers_pkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."GamePlayerMemberships"
            ADD CONSTRAINT "GamePlayers_pkey" PRIMARY KEY ("playerId", "gameId")
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."GamePlayerMemberships" DROP COLUMN "id"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingLastPlaces" DROP COLUMN "groupId"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPlaces" DROP COLUMN "groupId"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystemRankingGroupMemberships" DROP CONSTRAINT "GroupSystems_pkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystemRankingGroupMemberships"
            ADD CONSTRAINT "GroupSystems_pkey" PRIMARY KEY ("groupId", "systemId")
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystemRankingGroupMemberships" DROP COLUMN "id"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."DrawCompetitions" DROP COLUMN "lastSync"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventCompetitions" DROP COLUMN "lastSync"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."DrawTournaments" DROP COLUMN "lastSync"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments" DROP COLUMN "lastSync"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships"
            ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships"
            ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ClubPlayerMemberships"
            ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        `);
        await queryRunner.query(`
            ALTER TABLE "ClubPlayerMemberships"
            ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions"
            ADD "changeUntill_2" TIMESTAMP WITH TIME ZONE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions"
            ADD "changeUntill_1" TIMESTAMP WITH TIME ZONE
        `);
        await queryRunner.query(`
            ALTER TABLE "ClubPlayerMemberships"
            ADD CONSTRAINT "ClubMemberships_playerId_clubId_start_key" UNIQUE ("playerId", "clubId", "start")
        `);
        await queryRunner.query(`
            ALTER TABLE "Clubs"
            ADD CONSTRAINT "club_number_unique" UNIQUE ("name", "clubId")
        `);
        await queryRunner.query(`
            ALTER TABLE "Players"
            ADD CONSTRAINT "Players_firstName_lastName_memberId_key" UNIQUE ("firstName", "lastName", "memberId")
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Courts"
            ADD CONSTRAINT "Courts_name_locationId_key" UNIQUE ("name", "locationId")
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Availabilities"
            ADD CONSTRAINT "availability_unique_constraint" UNIQUE ("season", "locationId")
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."Claims"
            ADD CONSTRAINT "Claims_name_category_type_key" UNIQUE ("name", "category", "type")
        `);
        await queryRunner.query(`
            ALTER TABLE "TeamPlayerMemberships"
            ADD CONSTRAINT "TeamPlayerMemberships_playerId_teamId_start_key" UNIQUE ("playerId", "teamId", "start")
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingLastPlaces"
            ADD CONSTRAINT "lastPlaces_unique_constraint" UNIQUE ("playerId", "systemId")
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPlaces"
            ADD CONSTRAINT "Places_rankingDate_PlayerId_SystemId_key" UNIQUE ("rankingDate", "playerId", "systemId")
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."DrawCompetitions"
            ADD CONSTRAINT "DrawCompetitions_unique_constraint" UNIQUE ("name", "subeventId", "visualCode", "type")
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventCompetitions"
            ADD CONSTRAINT "SubEventCompetitions_unique_constraint" UNIQUE ("name", "eventType", "eventId", "visualCode")
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions"
            ADD CONSTRAINT "EventCompetitions_unique_constraint" UNIQUE ("name", "season", "type", "visualCode")
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."DrawTournaments"
            ADD CONSTRAINT "DrawTournaments_unique_constraint" UNIQUE ("name", "type", "visualCode", "subeventId")
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments"
            ADD CONSTRAINT "SubEventTournaments_unique_constraint" UNIQUE (
                    "name",
                    "eventType",
                    "gameType",
                    "visualCode",
                    "eventId"
                )
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventTournaments"
            ADD CONSTRAINT "EventTournaments_unique_constraint" UNIQUE ("name", "firstDay", "visualCode")
        `);
        await queryRunner.query(`
            CREATE INDEX "request_links__player_id" ON "RequestLinks" ("playerId")
        `);
        await queryRunner.query(`
            CREATE INDEX "settings_player_id" ON "personal"."Settings" ("playerId")
        `);
        await queryRunner.query(`
            CREATE INDEX "comment_index" ON "Comments" ("clubId", "linkId", "linkType")
        `);
        await queryRunner.query(`
            CREATE INDEX "player_club_index" ON "ClubPlayerMemberships" ("playerId", "clubId")
        `);
        await queryRunner.query(`
            CREATE INDEX "clubs_name" ON "Clubs" ("name")
        `);
        await queryRunner.query(`
            CREATE INDEX "teams_club_index" ON "Teams" ("clubId")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "players_slug" ON "Players" ("slug")
        `);
        await queryRunner.query(`
            CREATE INDEX "players_member_id" ON "Players" ("memberId")
        `);
        await queryRunner.query(`
            CREATE INDEX "players_last_name" ON "Players" ("lastName")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "players_id" ON "Players" ("id")
        `);
        await queryRunner.query(`
            CREATE INDEX "players_first_name" ON "Players" ("firstName")
        `);
        await queryRunner.query(`
            CREATE INDEX "roles_name" ON "security"."Roles" ("name")
        `);
        await queryRunner.query(`
            CREATE INDEX "roles_description" ON "security"."Roles" ("description")
        `);
        await queryRunner.query(`
            CREATE INDEX "locations_club_id" ON "event"."Locations" ("clubId")
        `);
        await queryRunner.query(`
            CREATE INDEX "claims_name" ON "security"."Claims" ("name")
        `);
        await queryRunner.query(`
            CREATE INDEX "claims_description" ON "security"."Claims" ("description")
        `);
        await queryRunner.query(`
            CREATE INDEX "player_team_index" ON "TeamPlayerMemberships" ("playerId", "teamId")
        `);
        await queryRunner.query(`
            CREATE INDEX "game_players_player_id" ON "event"."GamePlayerMemberships" ("playerId")
        `);
        await queryRunner.query(`
            CREATE INDEX "game_players_game_id" ON "event"."GamePlayerMemberships" ("gameId")
        `);
        await queryRunner.query(`
            CREATE INDEX "game_parent_index" ON "event"."Games" ("linkId", "linkType")
        `);
        await queryRunner.query(`
            CREATE INDEX "points_date_index" ON "ranking"."RankingPoints" ("rankingDate")
        `);
        await queryRunner.query(`
            CREATE INDEX "point_system_index" ON "ranking"."RankingPoints" ("playerId", "systemId")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "point_player_system_index" ON "ranking"."RankingPoints" ("playerId", "gameId", "systemId")
        `);
        await queryRunner.query(`
            CREATE INDEX "point_game_system_index" ON "ranking"."RankingPoints" ("gameId", "systemId")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "lastPlaces_ranking_index" ON "ranking"."RankingLastPlaces" ("playerId", "systemId")
        `);
        await queryRunner.query(`
            CREATE INDEX "ranking_index" ON "ranking"."RankingPlaces" ("playerId", "systemId")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "places_system_index" ON "ranking"."RankingPlaces" ("rankingDate", "playerId", "systemId")
        `);
        await queryRunner.query(`
            CREATE INDEX "places_date_index" ON "ranking"."RankingPlaces" ("rankingDate")
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships"
            ADD CONSTRAINT "PlayerRoleMemberships_userId_fkey" FOREIGN KEY ("playerId") REFERENCES "Players"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships"
            ADD CONSTRAINT "PlayerRoleMemberships_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "security"."Roles"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships"
            ADD CONSTRAINT "RoleClaimMemberships_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "security"."Roles"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships"
            ADD CONSTRAINT "RoleClaimMemberships_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "security"."Claims"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships"
            ADD CONSTRAINT "PlayerClaimMemberships_userId_fkey" FOREIGN KEY ("playerId") REFERENCES "Players"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships"
            ADD CONSTRAINT "PlayerClaimMemberships_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "security"."Claims"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "RequestLinks"
            ADD CONSTRAINT "RequestLinks_PlayerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Players"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "personal"."Settings"
            ADD CONSTRAINT "Settings_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Players"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "personal"."Notifications"
            ADD CONSTRAINT "Notifications_sendToId_fkey" FOREIGN KEY ("sendToId") REFERENCES "Players"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "Comments"
            ADD CONSTRAINT "Comments_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Players"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "Comments"
            ADD CONSTRAINT "Comments_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "ClubPlayerMemberships"
            ADD CONSTRAINT "ClubMemberships_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Players"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "ClubPlayerMemberships"
            ADD CONSTRAINT "ClubMemberships_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "Teams"
            ADD CONSTRAINT "Teams_prefferedLocationId_fkey" FOREIGN KEY ("prefferedLocationId") REFERENCES "event"."Locations"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "Teams"
            ADD CONSTRAINT "Teams_prefferedLocation2Id_fkey" FOREIGN KEY ("prefferedLocation2Id") REFERENCES "event"."Locations"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "Teams"
            ADD CONSTRAINT "Teams_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "Teams"
            ADD CONSTRAINT "Teams_captainId_fkey" FOREIGN KEY ("captainId") REFERENCES "Players"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Locations"
            ADD CONSTRAINT "Locations_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Courts"
            ADD CONSTRAINT "Courts_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "event"."Locations"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterChangeDates"
            ADD CONSTRAINT "EncounterChangeDates_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "event"."Locations"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterChangeDates"
            ADD CONSTRAINT "EncounterChangeDates_encounterChangeId_fkey" FOREIGN KEY ("encounterChangeId") REFERENCES "event"."EncounterChanges"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterChanges"
            ADD CONSTRAINT "EncounterChanges_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "event"."EncounterCompetitions"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Availabilities"
            ADD CONSTRAINT "Availabilities_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "event"."Locations"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "TeamPlayerMemberships"
            ADD CONSTRAINT "TeamPlayerMemberships_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Teams"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "TeamPlayerMemberships"
            ADD CONSTRAINT "TeamPlayerMemberships_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Players"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."GamePlayerMemberships"
            ADD CONSTRAINT "GamePlayers_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Players"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."GamePlayerMemberships"
            ADD CONSTRAINT "GamePlayers_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "event"."Games"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."GamePlayerMemberships"
            ADD CONSTRAINT "GamePlayerMemberships_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "ranking"."RankingSystems"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Games"
            ADD CONSTRAINT "Games_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "event"."Courts"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPoints"
            ADD CONSTRAINT "Points_SystemId_fkey" FOREIGN KEY ("systemId") REFERENCES "ranking"."RankingSystems"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPoints"
            ADD CONSTRAINT "Points_PlayerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Players"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPoints"
            ADD CONSTRAINT "Points_GameId_fkey" FOREIGN KEY ("gameId") REFERENCES "event"."Games"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingLastPlaces"
            ADD CONSTRAINT "LastPlaces_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "ranking"."RankingSystems"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingLastPlaces"
            ADD CONSTRAINT "LastPlaces_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Players"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPlaces"
            ADD CONSTRAINT "Places_SystemId_fkey" FOREIGN KEY ("systemId") REFERENCES "ranking"."RankingSystems"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPlaces"
            ADD CONSTRAINT "Places_PlayerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Players"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystemRankingGroupMemberships"
            ADD CONSTRAINT "GroupSystems_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "ranking"."RankingSystems"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystemRankingGroupMemberships"
            ADD CONSTRAINT "GroupSystems_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ranking"."RankingGroups"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions"
            ADD CONSTRAINT "EncounterCompetitions_tempHomeCaptainId_fkey" FOREIGN KEY ("tempHomeCaptainId") REFERENCES "Players"("id") ON DELETE
            SET NULL ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions"
            ADD CONSTRAINT "EncounterCompetitions_tempAwayCaptainId_fkey" FOREIGN KEY ("tempAwayCaptainId") REFERENCES "Players"("id") ON DELETE
            SET NULL ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions"
            ADD CONSTRAINT "EncounterCompetitions_originalLocationId_fkey" FOREIGN KEY ("originalLocationId") REFERENCES "event"."Locations"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions"
            ADD CONSTRAINT "EncounterCompetitions_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "event"."Locations"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions"
            ADD CONSTRAINT "EncounterCompetitions_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Teams"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions"
            ADD CONSTRAINT "EncounterCompetitions_gameLeaderId_fkey" FOREIGN KEY ("gameLeaderId") REFERENCES "Players"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions"
            ADD CONSTRAINT "EncounterCompetitions_enteredById_fkey" FOREIGN KEY ("enteredById") REFERENCES "Players"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions"
            ADD CONSTRAINT "EncounterCompetitions_drawId_fkey" FOREIGN KEY ("drawId") REFERENCES "event"."DrawCompetitions"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions"
            ADD CONSTRAINT "EncounterCompetitions_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Teams"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions"
            ADD CONSTRAINT "EncounterCompetitions_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "Players"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "personal"."Assemblies"
            ADD CONSTRAINT "Assemblies_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Teams"("id") ON DELETE
            SET NULL ON UPDATE CASCADE DEFERRABLE INITIALLY IMMEDIATE
        `);
        await queryRunner.query(`
            ALTER TABLE "personal"."Assemblies"
            ADD CONSTRAINT "Assemblies_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Players"("id") ON DELETE
            SET NULL ON UPDATE CASCADE DEFERRABLE INITIALLY IMMEDIATE
        `);
        await queryRunner.query(`
            ALTER TABLE "personal"."Assemblies"
            ADD CONSTRAINT "Assemblies_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "event"."EncounterCompetitions"("id") ON DELETE
            SET NULL ON UPDATE CASCADE DEFERRABLE INITIALLY IMMEDIATE
        `);
        await queryRunner.query(`
            ALTER TABLE "personal"."Assemblies"
            ADD CONSTRAINT "Assemblies_captainId_fkey" FOREIGN KEY ("captainId") REFERENCES "Players"("id") ON DELETE
            SET NULL ON UPDATE CASCADE DEFERRABLE INITIALLY IMMEDIATE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."DrawCompetitions"
            ADD CONSTRAINT "DrawCompetitions_subeventId_fkey" FOREIGN KEY ("subeventId") REFERENCES "event"."SubEventCompetitions"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventCompetitions"
            ADD CONSTRAINT "SubEventCompetitions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"."EventCompetitions"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions"
            ADD CONSTRAINT "EventCompetitions_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Players"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."DrawTournaments"
            ADD CONSTRAINT "DrawTournaments_subeventId_fkey" FOREIGN KEY ("subeventId") REFERENCES "event"."SubEventTournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Entries"
            ADD CONSTRAINT "Entries_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Teams"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Entries"
            ADD CONSTRAINT "Entries_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "Players"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Entries"
            ADD CONSTRAINT "Entries_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "Players"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Standings"
            ADD CONSTRAINT "Standings_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "event"."Entries"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments"
            ADD CONSTRAINT "SubEventTournaments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"."EventTournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
    }

}
