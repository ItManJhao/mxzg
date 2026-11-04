-- 普通装备实例和穿戴关系；保留字符串 ID，禁止跨角色穿戴及同槽多件。
CREATE TABLE game_equipment (
    id VARCHAR(64) PRIMARY KEY,
    role_id VARCHAR(36) NOT NULL,
    template_id INT NOT NULL,
    slot INT NOT NULL,
    soul_level INT NOT NULL DEFAULT 0,
    hero_id VARCHAR(36),
    CONSTRAINT fk_equipment_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT fk_equipment_hero_owner FOREIGN KEY (hero_id, role_id) REFERENCES game_hero(id, role_id),
    CONSTRAINT uq_equipment_hero_slot UNIQUE (hero_id, slot),
    CONSTRAINT ck_equipment_values CHECK (template_id > 0 AND slot BETWEEN 1 AND 4 AND soul_level >= 0)
);
CREATE INDEX idx_equipment_role ON game_equipment(role_id);
