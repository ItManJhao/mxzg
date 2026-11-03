-- 仅补充角色基础列；旧数量、等级及 ID 不变，旧时间无法反推，以 0 明确表示未知。
ALTER TABLE game_role ADD COLUMN role_experience BIGINT NOT NULL DEFAULT 0;
ALTER TABLE game_role ADD COLUMN cup INT NOT NULL DEFAULT 0;
ALTER TABLE game_role ADD COLUMN head_id INT NOT NULL DEFAULT 0;
ALTER TABLE game_role ADD COLUMN image_id INT NOT NULL DEFAULT 0;
ALTER TABLE game_role ADD COLUMN border_id INT NOT NULL DEFAULT 0;
ALTER TABLE game_role ADD COLUMN language_id INT NOT NULL DEFAULT 1;
ALTER TABLE game_role ADD COLUMN created_at_seconds BIGINT NOT NULL DEFAULT 0;
ALTER TABLE game_role ADD COLUMN last_login_at_seconds BIGINT NOT NULL DEFAULT 0;
ALTER TABLE game_role ADD CONSTRAINT ck_role_basics CHECK (role_experience>=0 AND cup>=0 AND head_id>=0 AND image_id>=0 AND border_id>=0 AND language_id BETWEEN 0 AND 8 AND created_at_seconds>=0 AND last_login_at_seconds>=created_at_seconds);
