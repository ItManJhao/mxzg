-- 每角色保存一条普通首抽完成记录，免费时间与原实际发放回执在同一行提交。
CREATE TABLE game_hero_first_summon (
    role_id VARCHAR(36) NOT NULL PRIMARY KEY,
    request_id VARCHAR(36) NOT NULL,
    receipt_id VARCHAR(36) NOT NULL,
    asset_revision BIGINT NOT NULL,
    normal_free_at_seconds BIGINT NOT NULL,
    payload_json LONGTEXT NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    CONSTRAINT uq_hero_first_summon_receipt UNIQUE (receipt_id),
    CONSTRAINT fk_hero_first_summon_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT ck_hero_first_summon_revision CHECK (asset_revision > 0),
    CONSTRAINT ck_hero_first_summon_free_at CHECK (normal_free_at_seconds > 0)
);
