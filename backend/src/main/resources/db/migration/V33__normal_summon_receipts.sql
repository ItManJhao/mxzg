-- 普通召唤按玩家每次操作保存结果。原首抽时间、请求键和已发英雄的冻结回执完整迁移。
CREATE TABLE game_hero_normal_summon (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    first_draw BOOLEAN NOT NULL,
    receipt_id VARCHAR(36) NOT NULL UNIQUE,
    asset_revision BIGINT NOT NULL CHECK (asset_revision > 0),
    normal_free_at_seconds BIGINT NOT NULL CHECK (normal_free_at_seconds > 0),
    payload_json LONGTEXT NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    PRIMARY KEY (role_id, request_id),
    CONSTRAINT uq_normal_summon_revision UNIQUE (role_id, asset_revision),
    CONSTRAINT fk_normal_summon_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);

INSERT INTO game_hero_normal_summon
    (role_id,request_id,first_draw,receipt_id,asset_revision,normal_free_at_seconds,payload_json,payload_hash)
SELECT role_id,request_id,TRUE,receipt_id,asset_revision,normal_free_at_seconds,payload_json,payload_hash
FROM game_hero_first_summon;

DROP TABLE game_hero_first_summon;
