ALTER TABLE game_role ADD COLUMN lineup_version BIGINT NOT NULL DEFAULT 0;

CREATE TABLE game_hero (
    id VARCHAR(36) PRIMARY KEY,
    role_id VARCHAR(36) NOT NULL,
    template_id INT NOT NULL,
    hero_level INT NOT NULL,
    star INT NOT NULL,
    CONSTRAINT uq_hero_owner UNIQUE (id, role_id),
    CONSTRAINT fk_hero_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT ck_hero_values CHECK (template_id > 0 AND hero_level > 0 AND star > 0)
);
CREATE INDEX idx_hero_role ON game_hero(role_id);

CREATE TABLE game_lineup_slot (
    role_id VARCHAR(36) NOT NULL,
    position INT NOT NULL,
    hero_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (role_id, position),
    CONSTRAINT uq_lineup_hero UNIQUE (role_id, hero_id),
    CONSTRAINT fk_lineup_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT fk_lineup_hero_owner FOREIGN KEY (hero_id, role_id) REFERENCES game_hero(id, role_id)
);
