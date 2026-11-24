-- 已有公会与新建公会沿用旧服的初始等级和本级经验。
ALTER TABLE game_guild ADD COLUMN guild_level INT NOT NULL DEFAULT 1 CHECK (guild_level >= 1);
ALTER TABLE game_guild ADD COLUMN experience INT NOT NULL DEFAULT 0 CHECK (experience >= 0);
