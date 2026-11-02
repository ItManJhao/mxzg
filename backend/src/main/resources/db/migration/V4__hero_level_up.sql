-- 普通升级：保留旧版本数据，初始等阶来自旧服 createHero 的 0 阶规则；不开放升阶操作。
ALTER TABLE game_hero ADD COLUMN stage INT NOT NULL DEFAULT 0;
ALTER TABLE game_hero ADD CONSTRAINT ck_hero_stage CHECK (stage >= 0);
CREATE TABLE game_hero_level_request (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    hero_id VARCHAR(36) NOT NULL,
    from_level INT NOT NULL,
    to_level INT NOT NULL,
    config_version VARCHAR(64) NOT NULL,
    PRIMARY KEY (role_id, request_id),
    CONSTRAINT fk_hero_level_request_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT fk_hero_level_request_owner FOREIGN KEY (hero_id, role_id) REFERENCES game_hero(id, role_id),
    CONSTRAINT ck_hero_level_request CHECK (from_level > 0 AND to_level = from_level + 1)
);
