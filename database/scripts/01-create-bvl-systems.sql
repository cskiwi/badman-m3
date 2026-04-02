-- Migration: Create BVL Rating systems based on BBF Rating configuration
-- Run this script first, then run 02-copy-ranking-data-to-bvl.sql
--
-- Source systems:
--   BBF Rating:           684f355c-cfcf-463b-8cc3-931cfed6417c
--   BBF Rating (voor 1/7): 934116c8-ee7e-4f3c-9c8b-6de579c3686f
--
-- New systems created by this script:
--   BVL Rating:           7f1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c
--   BVL Rating (voor 1/7): a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6

BEGIN;

-- Create BVL Rating system (mirrors BBF Rating, active system)
INSERT INTO ranking."RankingSystems" (
  id,
  name,
  "amountOfLevels",
  "procentWinning",
  "procentWinningPlus1",
  "procentLosing",
  "minNumberOfGamesUsedForUpgrade",
  "maxDiffLevels",
  "maxDiffLevelsHighest",
  "latestXGamesToUse",
  "updateIntervalAmount",
  "updateIntervalUnit",
  "periodAmount",
  "periodUnit",
  "rankingSystem",
  "runCurrently",
  "startingType",
  "maxLevelUpPerChange",
  "maxLevelDownPerChange",
  "inactivityAmount",
  "inactivityUnit",
  "gamesForInactivty",
  "createdAt",
  "updatedAt",
  "updateLastUpdate",
  "calculationIntervalAmount",
  "calculationIntervalUnit",
  "calculationLastUpdate",
  "inactiveBehavior",
  "minNumberOfGamesUsedForDowngrade",
  "differenceForDowngradeSingle",
  "differenceForDowngradeDouble",
  "differenceForDowngradeMix",
  "differenceForUpgradeSingle",
  "differenceForUpgradeDouble",
  "differenceForUpgradeMix",
  "calculateUpdates",
  "calculationDayOfWeek",
  "updateDayOfWeek",
  "startDate",
  "endDate"
)
SELECT
  '7f1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c'::uuid,
  'BVL Rating',
  "amountOfLevels",
  "procentWinning",
  "procentWinningPlus1",
  "procentLosing",
  "minNumberOfGamesUsedForUpgrade",
  "maxDiffLevels",
  "maxDiffLevelsHighest",
  "latestXGamesToUse",
  "updateIntervalAmount",
  "updateIntervalUnit",
  "periodAmount",
  "periodUnit",
  'BVL',
  "runCurrently",
  "startingType",
  "maxLevelUpPerChange",
  "maxLevelDownPerChange",
  "inactivityAmount",
  "inactivityUnit",
  "gamesForInactivty",
  NOW(),
  NOW(),
  "updateLastUpdate",
  "calculationIntervalAmount",
  "calculationIntervalUnit",
  "calculationLastUpdate",
  "inactiveBehavior",
  "minNumberOfGamesUsedForDowngrade",
  "differenceForDowngradeSingle",
  "differenceForDowngradeDouble",
  "differenceForDowngradeMix",
  "differenceForUpgradeSingle",
  "differenceForUpgradeDouble",
  "differenceForUpgradeMix",
  "calculateUpdates",
  "calculationDayOfWeek",
  "updateDayOfWeek",
  "startDate",
  "endDate"
FROM ranking."RankingSystems"
WHERE id = '684f355c-cfcf-463b-8cc3-931cfed6417c';

-- Create BVL Rating (voor 1/7) system (mirrors BBF Rating (voor 1/7), historical system)
INSERT INTO ranking."RankingSystems" (
  id,
  name,
  "amountOfLevels",
  "procentWinning",
  "procentWinningPlus1",
  "procentLosing",
  "minNumberOfGamesUsedForUpgrade",
  "maxDiffLevels",
  "maxDiffLevelsHighest",
  "latestXGamesToUse",
  "updateIntervalAmount",
  "updateIntervalUnit",
  "periodAmount",
  "periodUnit",
  "rankingSystem",
  "runCurrently",
  "startingType",
  "maxLevelUpPerChange",
  "maxLevelDownPerChange",
  "inactivityAmount",
  "inactivityUnit",
  "gamesForInactivty",
  "createdAt",
  "updatedAt",
  "updateLastUpdate",
  "calculationIntervalAmount",
  "calculationIntervalUnit",
  "calculationLastUpdate",
  "inactiveBehavior",
  "minNumberOfGamesUsedForDowngrade",
  "differenceForDowngradeSingle",
  "differenceForDowngradeDouble",
  "differenceForDowngradeMix",
  "differenceForUpgradeSingle",
  "differenceForUpgradeDouble",
  "differenceForUpgradeMix",
  "calculateUpdates",
  "calculationDayOfWeek",
  "updateDayOfWeek",
  "startDate",
  "endDate"
)
SELECT
  'a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6'::uuid,
  'BVL Rating (voor 1/7)',
  "amountOfLevels",
  "procentWinning",
  "procentWinningPlus1",
  "procentLosing",
  "minNumberOfGamesUsedForUpgrade",
  "maxDiffLevels",
  "maxDiffLevelsHighest",
  "latestXGamesToUse",
  "updateIntervalAmount",
  "updateIntervalUnit",
  "periodAmount",
  "periodUnit",
  'BVL',
  "runCurrently",
  "startingType",
  "maxLevelUpPerChange",
  "maxLevelDownPerChange",
  "inactivityAmount",
  "inactivityUnit",
  "gamesForInactivty",
  NOW(),
  NOW(),
  "updateLastUpdate",
  "calculationIntervalAmount",
  "calculationIntervalUnit",
  "calculationLastUpdate",
  "inactiveBehavior",
  "minNumberOfGamesUsedForDowngrade",
  "differenceForDowngradeSingle",
  "differenceForDowngradeDouble",
  "differenceForDowngradeMix",
  "differenceForUpgradeSingle",
  "differenceForUpgradeDouble",
  "differenceForUpgradeMix",
  "calculateUpdates",
  "calculationDayOfWeek",
  "updateDayOfWeek",
  "startDate",
  "endDate"
FROM ranking."RankingSystems"
WHERE id = '934116c8-ee7e-4f3c-9c8b-6de579c3686f';

-- Copy the "Adults" group membership to BVL Rating
INSERT INTO ranking."RankingSystemRankingGroupMemberships" ("id", "systemId", "groupId")
SELECT gen_random_uuid(), '7f1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c'::uuid, "groupId"
FROM ranking."RankingSystemRankingGroupMemberships"
WHERE "systemId" = '684f355c-cfcf-463b-8cc3-931cfed6417c';

COMMIT;

-- Verify
SELECT id, name, "rankingSystem", "runCurrently", "startDate", "endDate"
FROM ranking."RankingSystems"
ORDER BY name;
