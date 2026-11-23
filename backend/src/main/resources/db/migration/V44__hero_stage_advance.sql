-- 进阶成功收据独立保存，重复请求返回原阶级和提交版本。
CREATE TABLE game_hero_stage_request (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    hero_id VARCHAR(36) NOT NULL,
    from_stage INT NOT NULL,
    to_stage INT NOT NULL,
    config_version VARCHAR(128) NOT NULL,
    asset_revision BIGINT NOT NULL,
    PRIMARY KEY (role_id, request_id),
    CONSTRAINT fk_hero_stage_request_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT ck_hero_stage_request CHECK (from_stage >= 0 AND to_stage = from_stage + 1 AND asset_revision > 0)
);
