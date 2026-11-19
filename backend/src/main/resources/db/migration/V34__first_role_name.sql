-- 保留已有角色的昵称和使用状态。新角色由创角入口显式写入未命名状态。
ALTER TABLE game_role ADD COLUMN first_named BOOLEAN NOT NULL DEFAULT TRUE;
-- 新认领的名字按同服、UTF-8 字节精确比较，阻止不同角色同时抢占同名。
-- 历史角色保持空键，避免旧库历史重名阻断迁移，认领前仍检查旧昵称。
ALTER TABLE game_role ADD COLUMN claimed_nickname VARBINARY(256);
CREATE UNIQUE INDEX uq_role_claimed_nickname ON game_role(server_id, claimed_nickname);
CREATE INDEX idx_role_nickname_lookup ON game_role(server_id, nickname);
