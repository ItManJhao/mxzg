-- 神装为独立实例，解除穿戴只清空英雄关系。角色和装备部位仍按原实例持有。
CREATE TABLE game_god_equipment (
    id VARCHAR(36) PRIMARY KEY,
    role_id VARCHAR(36) NOT NULL,
    template_id INT NOT NULL,
    slot INT NOT NULL,
    hero_id VARCHAR(36),
    CONSTRAINT fk_god_equipment_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT fk_god_equipment_hero FOREIGN KEY (hero_id) REFERENCES game_hero(id) ON DELETE SET NULL,
    CONSTRAINT uq_god_equipment_hero_slot UNIQUE (hero_id, slot)
);

CREATE INDEX ix_god_equipment_role ON game_god_equipment(role_id);

CREATE TABLE game_god_equipment_modifier (
    equipment_id VARCHAR(36) NOT NULL,
    position INT NOT NULL,
    attribute_type INT NOT NULL,
    attribute_level INT NOT NULL,
    PRIMARY KEY (equipment_id, position),
    CONSTRAINT fk_god_equipment_modifier FOREIGN KEY (equipment_id) REFERENCES game_god_equipment(id)
);

CREATE TABLE game_god_equipment_change (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    hero_id VARCHAR(36) NOT NULL,
    slot INT NOT NULL,
    action VARCHAR(16) NOT NULL,
    instance_id VARCHAR(36) NOT NULL,
    expected_instance_id VARCHAR(36),
    asset_revision BIGINT NOT NULL,
    PRIMARY KEY (role_id, request_id),
    CONSTRAINT fk_god_equipment_change_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);

CREATE TABLE game_god_equipment_lottery (
    role_id VARCHAR(36) PRIMARY KEY,
    draw_count INT NOT NULL,
    last_free_day BIGINT,
    CONSTRAINT fk_god_equipment_lottery_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);

CREATE TABLE game_god_equipment_lottery_request (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    draw_quantity INT NOT NULL,
    max_diamonds BIGINT NOT NULL,
    diamonds_paid BIGINT NOT NULL,
    asset_revision BIGINT NOT NULL,
    PRIMARY KEY (role_id, request_id),
    CONSTRAINT fk_god_equipment_lottery_request_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);

CREATE TABLE game_god_equipment_lottery_reward (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    position INT NOT NULL,
    template_id INT NOT NULL,
    quantity INT NOT NULL,
    PRIMARY KEY (role_id, request_id, position),
    CONSTRAINT fk_god_equipment_lottery_reward FOREIGN KEY (role_id, request_id)
        REFERENCES game_god_equipment_lottery_request(role_id, request_id)
);
