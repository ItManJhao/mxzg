-- 保留原逐级收据；历史数据没有快照版本，以 0 标记。
ALTER TABLE game_hero_level_request ADD COLUMN asset_revision BIGINT NOT NULL DEFAULT 0;
ALTER TABLE game_hero_level_request DROP CONSTRAINT ck_hero_level_request;
ALTER TABLE game_hero_level_request ADD CONSTRAINT ck_hero_level_request_batch
    CHECK (from_level > 0 AND to_level > from_level AND asset_revision >= 0);
