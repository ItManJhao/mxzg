-- 持久保存公会创建时选择的正式徽章，已有公会使用原版 00 徽章。
ALTER TABLE game_guild ADD COLUMN badge_id SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE game_guild ADD CONSTRAINT ck_game_guild_badge CHECK (badge_id BETWEEN 0 AND 43);
