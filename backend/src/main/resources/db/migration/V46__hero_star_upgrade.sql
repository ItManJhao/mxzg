-- 吞噬已升级过的素材英雄后保留原升级收据，归属仍由角色外键保障。
ALTER TABLE game_hero_level_request DROP FOREIGN KEY fk_hero_level_request_owner;

-- 升星收据保留原始目标、材料指纹和成长返还，防止丢回包后二次结算。
CREATE TABLE game_hero_star_request (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    hero_id VARCHAR(36) NOT NULL,
    from_star INT NOT NULL,
    to_star INT NOT NULL,
    material_fingerprint CHAR(64) NOT NULL,
    refunded_json TEXT NOT NULL,
    asset_revision BIGINT NOT NULL,
    PRIMARY KEY (role_id, request_id),
    CONSTRAINT fk_hero_star_request_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT ck_hero_star_request_values CHECK (from_star >= 4 AND to_star = from_star + 1 AND asset_revision > 0)
);
