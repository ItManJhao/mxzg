-- 最小精灵实例持久化，仅恢复普通挂机可能产生的2000002，不写入普通堆叠库存。
-- 每件保存独立UUID及真实随机属性；当前不开放穿戴、升级、洗练或重置。
CREATE TABLE game_spirit (
    instance_id VARCHAR(36) PRIMARY KEY,
    role_id VARCHAR(36) NOT NULL,
    item_id INT NOT NULL,
    ability_id INT NOT NULL,
    skills_json TEXT NOT NULL,
    hero_id VARCHAR(36) NULL,
    place INT NOT NULL DEFAULT 0,
    exp BIGINT NOT NULL DEFAULT 0,
    wash_ability_id INT NOT NULL DEFAULT 0,
    wash_skills_json TEXT NOT NULL,
    CONSTRAINT fk_spirit_instance_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT ck_spirit_instance_item CHECK (item_id = 2000002),
    CONSTRAINT ck_spirit_instance_ability CHECK (ability_id BETWEEN 1 AND 4),
    CONSTRAINT ck_spirit_instance_unopened CHECK (
        hero_id IS NULL AND place = 0 AND exp = 0 AND wash_ability_id = 0 AND wash_skills_json = '[]'
    )
);
CREATE INDEX idx_spirit_instance_role ON game_spirit(role_id);
