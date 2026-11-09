-- 挂机阵容按主线阵容版本抽样一次，重复登录不重新随机；与正式阵容分开保存。
CREATE TABLE game_main_chapter_idle_lineup (
    role_id VARCHAR(36) PRIMARY KEY,
    lineup_version BIGINT NOT NULL,
    slots_json LONGTEXT NOT NULL,
    CONSTRAINT fk_main_idle_lineup_role FOREIGN KEY(role_id) REFERENCES game_role(id)
);
