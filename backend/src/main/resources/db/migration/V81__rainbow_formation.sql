-- 彩虹圣殿的独立出战阵容，消费英雄时仅移除对应圣殿站位。
CREATE TABLE game_rainbow_formation (
    role_id VARCHAR(36) PRIMARY KEY,
    version BIGINT NOT NULL CHECK (version > 0),
    formation_id INT NOT NULL CHECK (formation_id > 0),
    CONSTRAINT fk_rainbow_formation_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);

CREATE TABLE game_rainbow_formation_slot (
    role_id VARCHAR(36) NOT NULL,
    position INT NOT NULL CHECK (position BETWEEN 1 AND 8),
    hero_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (role_id, position),
    CONSTRAINT uq_rainbow_formation_hero UNIQUE (role_id, hero_id),
    CONSTRAINT fk_rainbow_formation_slot FOREIGN KEY (role_id) REFERENCES game_rainbow_formation(role_id),
    CONSTRAINT fk_rainbow_formation_hero FOREIGN KEY (hero_id, role_id) REFERENCES game_hero(id, role_id)
        ON DELETE CASCADE
);

CREATE TABLE game_rainbow_formation_save (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    receipt_json LONGTEXT NOT NULL,
    receipt_hash VARCHAR(64) NOT NULL,
    PRIMARY KEY (role_id, request_id),
    CONSTRAINT fk_rainbow_formation_save_role FOREIGN KEY (role_id) REFERENCES game_rainbow_formation(role_id)
);
