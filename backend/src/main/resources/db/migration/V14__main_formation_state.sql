-- 只读阵型与永久助战状态；保留现有阵容站位，不清理历史数据。
ALTER TABLE game_role ADD COLUMN main_formation_id INT NOT NULL DEFAULT 1;
ALTER TABLE game_role ADD COLUMN assistance_unlocked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE game_role ADD CONSTRAINT ck_main_formation_id CHECK (main_formation_id > 0);
CREATE TABLE game_formation_unlock (
 role_id VARCHAR(36) NOT NULL,
 formation_id INT NOT NULL,
 PRIMARY KEY(role_id, formation_id),
 CONSTRAINT fk_formation_unlock_role FOREIGN KEY(role_id) REFERENCES game_role(id),
 CONSTRAINT ck_formation_unlock_id CHECK(formation_id > 1)
);
