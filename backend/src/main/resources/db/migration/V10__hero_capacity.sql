-- 旧 system.hero_space_initial 当前为 300；历史新版角色按此基线补齐，不修改资产或发放英雄。
ALTER TABLE game_role ADD COLUMN hero_capacity INT NOT NULL DEFAULT 300;
ALTER TABLE game_role ADD COLUMN hero_capacity_buys INT NOT NULL DEFAULT 0;
ALTER TABLE game_role ADD COLUMN goddess_vip INT NOT NULL DEFAULT 0;
ALTER TABLE game_role ADD CONSTRAINT ck_hero_capacity CHECK (hero_capacity > 0 AND hero_capacity_buys >= 0 AND goddess_vip >= 0);
