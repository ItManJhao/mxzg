-- 激活关系归英雄，独立装备归角色。素材英雄被消耗时，已戴圣器回到原角色。
CREATE TABLE game_hero_artifact_slot (
    role_id VARCHAR(36) NOT NULL,
    hero_id VARCHAR(36) NOT NULL,
    slot INT NOT NULL,
    PRIMARY KEY (hero_id, slot),
    CONSTRAINT fk_artifact_slot_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT fk_artifact_slot_hero FOREIGN KEY (hero_id) REFERENCES game_hero(id) ON DELETE CASCADE
);

CREATE INDEX ix_artifact_slot_role ON game_hero_artifact_slot(role_id);

CREATE TABLE game_hero_artifact (
    id VARCHAR(36) PRIMARY KEY,
    role_id VARCHAR(36) NOT NULL,
    template_id INT NOT NULL,
    slot INT NOT NULL,
    hero_id VARCHAR(36),
    CONSTRAINT fk_artifact_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT fk_artifact_hero FOREIGN KEY (hero_id) REFERENCES game_hero(id) ON DELETE SET NULL,
    CONSTRAINT uq_artifact_hero_slot UNIQUE (hero_id, slot)
);

CREATE INDEX ix_hero_artifact_role ON game_hero_artifact(role_id);

CREATE TABLE game_hero_artifact_request (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    fingerprint VARCHAR(64) NOT NULL,
    receipt VARCHAR(2048) NOT NULL,
    PRIMARY KEY (role_id, request_id),
    CONSTRAINT fk_artifact_request_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);
