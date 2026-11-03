-- 角色与背包共用持久版本；断线后以完整快照恢复，不重放资产变化。
ALTER TABLE game_role ADD COLUMN state_revision BIGINT NOT NULL DEFAULT 0;
