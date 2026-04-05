-- Migration: Copy RankingPlaces and RankingLastPlaces from BBF to BVL systems
-- Run AFTER 01-create-bvl-systems.sql
--
-- Copies all historical data from:
--   BBF Rating           (684f355c) → BVL Rating           (7f1a2b3c)
--   BBF Rating (voor 1/7) (934116c8) → BVL Rating (voor 1/7) (a1b2c3d4)
--
-- This script does NOT delete the BBF data — it creates parallel BVL copies.
-- Estimated rows: ~2.96M + ~1.53M RankingPlaces, ~49K + ~38K RankingLastPlaces

-- ============================================================
-- STEP 1: Copy RankingPlaces — BBF Rating → BVL Rating
-- ============================================================
-- Run in batches if needed; this is a single bulk INSERT for simplicity.

INSERT INTO ranking."RankingPlaces" (
  id,
  "rankingDate",
  "singlePoints",
  "mixPoints",
  "doublePoints",
  "singleRank",
  "mixRank",
  "doubleRank",
  single,
  mix,
  double,
  "singlePointsDowngrade",
  "doublePointsDowngrade",
  "mixPointsDowngrade",
  "singleInactive",
  "doubleInactive",
  "mixInactive",
  "totalSingleRanking",
  "totalDoubleRanking",
  "totalMixRanking",
  "totalWithinSingleLevel",
  "totalWithinDoubleLevel",
  "totalWithinMixLevel",
  "playerId",
  "systemId",
  "groupId",
  "createdAt",
  "updatedAt",
  "updatePossible",
  gender
)
SELECT
  gen_random_uuid(),
  "rankingDate",
  "singlePoints",
  "mixPoints",
  "doublePoints",
  "singleRank",
  "mixRank",
  "doubleRank",
  single,
  mix,
  double,
  "singlePointsDowngrade",
  "doublePointsDowngrade",
  "mixPointsDowngrade",
  "singleInactive",
  "doubleInactive",
  "mixInactive",
  "totalSingleRanking",
  "totalDoubleRanking",
  "totalMixRanking",
  "totalWithinSingleLevel",
  "totalWithinDoubleLevel",
  "totalWithinMixLevel",
  "playerId",
  '7f1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c'::uuid, -- new BVL Rating systemId
  "groupId",
  "createdAt",
  "updatedAt",
  "updatePossible",
  gender
FROM ranking."RankingPlaces"
WHERE "systemId" = '684f355c-cfcf-463b-8cc3-931cfed6417c';

-- ============================================================
-- STEP 2: Copy RankingPlaces — BBF Rating (voor 1/7) → BVL Rating (voor 1/7)
-- ============================================================

INSERT INTO ranking."RankingPlaces" (
  id,
  "rankingDate",
  "singlePoints",
  "mixPoints",
  "doublePoints",
  "singleRank",
  "mixRank",
  "doubleRank",
  single,
  mix,
  double,
  "singlePointsDowngrade",
  "doublePointsDowngrade",
  "mixPointsDowngrade",
  "singleInactive",
  "doubleInactive",
  "mixInactive",
  "totalSingleRanking",
  "totalDoubleRanking",
  "totalMixRanking",
  "totalWithinSingleLevel",
  "totalWithinDoubleLevel",
  "totalWithinMixLevel",
  "playerId",
  "systemId",
  "groupId",
  "createdAt",
  "updatedAt",
  "updatePossible",
  gender
)
SELECT
  gen_random_uuid(),
  "rankingDate",
  "singlePoints",
  "mixPoints",
  "doublePoints",
  "singleRank",
  "mixRank",
  "doubleRank",
  single,
  mix,
  double,
  "singlePointsDowngrade",
  "doublePointsDowngrade",
  "mixPointsDowngrade",
  "singleInactive",
  "doubleInactive",
  "mixInactive",
  "totalSingleRanking",
  "totalDoubleRanking",
  "totalMixRanking",
  "totalWithinSingleLevel",
  "totalWithinDoubleLevel",
  "totalWithinMixLevel",
  "playerId",
  'a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6'::uuid, -- new BVL Rating (voor 1/7) systemId
  "groupId",
  "createdAt",
  "updatedAt",
  "updatePossible",
  gender
FROM ranking."RankingPlaces"
WHERE "systemId" = '934116c8-ee7e-4f3c-9c8b-6de579c3686f';

-- ============================================================
-- STEP 3: Copy RankingLastPlaces — BBF Rating → BVL Rating
-- ============================================================

INSERT INTO ranking."RankingLastPlaces" (
  id,
  "rankingDate",
  gender,
  "singlePoints",
  "mixPoints",
  "doublePoints",
  "singlePointsDowngrade",
  "mixPointsDowngrade",
  "doublePointsDowngrade",
  "singleRank",
  "mixRank",
  "doubleRank",
  "totalSingleRanking",
  "totalMixRanking",
  "totalDoubleRanking",
  "totalWithinSingleLevel",
  "totalWithinMixLevel",
  "totalWithinDoubleLevel",
  single,
  mix,
  double,
  "singleInactive",
  "mixInactive",
  "doubleInactive",
  "playerId",
  "systemId",
  "groupId",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  "rankingDate",
  gender,
  "singlePoints",
  "mixPoints",
  "doublePoints",
  "singlePointsDowngrade",
  "mixPointsDowngrade",
  "doublePointsDowngrade",
  "singleRank",
  "mixRank",
  "doubleRank",
  "totalSingleRanking",
  "totalMixRanking",
  "totalDoubleRanking",
  "totalWithinSingleLevel",
  "totalWithinMixLevel",
  "totalWithinDoubleLevel",
  single,
  mix,
  double,
  "singleInactive",
  "mixInactive",
  "doubleInactive",
  "playerId",
  '7f1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c'::uuid, -- new BVL Rating systemId
  "groupId",
  "createdAt",
  "updatedAt"
FROM ranking."RankingLastPlaces"
WHERE "systemId" = '684f355c-cfcf-463b-8cc3-931cfed6417c';

-- ============================================================
-- STEP 4: Copy RankingLastPlaces — BBF Rating (voor 1/7) → BVL Rating (voor 1/7)
-- ============================================================

INSERT INTO ranking."RankingLastPlaces" (
  id,
  "rankingDate",
  gender,
  "singlePoints",
  "mixPoints",
  "doublePoints",
  "singlePointsDowngrade",
  "mixPointsDowngrade",
  "doublePointsDowngrade",
  "singleRank",
  "mixRank",
  "doubleRank",
  "totalSingleRanking",
  "totalMixRanking",
  "totalDoubleRanking",
  "totalWithinSingleLevel",
  "totalWithinMixLevel",
  "totalWithinDoubleLevel",
  single,
  mix,
  double,
  "singleInactive",
  "mixInactive",
  "doubleInactive",
  "playerId",
  "systemId",
  "groupId",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  "rankingDate",
  gender,
  "singlePoints",
  "mixPoints",
  "doublePoints",
  "singlePointsDowngrade",
  "mixPointsDowngrade",
  "doublePointsDowngrade",
  "singleRank",
  "mixRank",
  "doubleRank",
  "totalSingleRanking",
  "totalMixRanking",
  "totalDoubleRanking",
  "totalWithinSingleLevel",
  "totalWithinMixLevel",
  "totalWithinDoubleLevel",
  single,
  mix,
  double,
  "singleInactive",
  "mixInactive",
  "doubleInactive",
  "playerId",
  'a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6'::uuid, -- new BVL Rating (voor 1/7) systemId
  "groupId",
  "createdAt",
  "updatedAt"
FROM ranking."RankingLastPlaces"
WHERE "systemId" = '934116c8-ee7e-4f3c-9c8b-6de579c3686f';

-- ============================================================
-- Verify counts
-- ============================================================
SELECT
  rs.name,
  rs.id,
  (SELECT COUNT(*) FROM ranking."RankingPlaces" rp WHERE rp."systemId" = rs.id) AS places,
  (SELECT COUNT(*) FROM ranking."RankingLastPlaces" rlp WHERE rlp."systemId" = rs.id) AS last_places
FROM ranking."RankingSystems" rs
ORDER BY rs.name;
