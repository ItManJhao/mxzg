-- 保存三个宝石槽及命令完成时的原回执，库存继续使用原物品堆叠。
CREATE TABLE game_hero_jewel (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    role_id VARCHAR(36) NOT NULL,
    hero_id VARCHAR(36) NOT NULL,
    slot INT NOT NULL,
    template_id INT NOT NULL,
    CONSTRAINT uq_hero_jewel_slot UNIQUE (hero_id, slot),
    CONSTRAINT fk_hero_jewel_owner FOREIGN KEY (hero_id, role_id) REFERENCES game_hero(id, role_id),
    CONSTRAINT ck_hero_jewel_slot CHECK (slot BETWEEN 1 AND 3 AND template_id > 0)
);
CREATE INDEX idx_hero_jewel_role ON game_hero_jewel(role_id);

CREATE TABLE game_hero_jewel_request (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    receipt_json VARCHAR(3000) NOT NULL,
    PRIMARY KEY (role_id, request_id),
    CONSTRAINT fk_hero_jewel_request_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);
