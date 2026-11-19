-- 原版的附魂等级和标识归英雄装备槽位，卸下后保留同一槽位的历史记录。
ALTER TABLE game_equipment ADD COLUMN equipped BOOLEAN NOT NULL DEFAULT TRUE;

-- 冻结同一角色的原操作与返回版本，重发时不重复扣回背包装备。
CREATE TABLE game_hero_equipment_request (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    hero_id VARCHAR(36) NOT NULL,
    action VARCHAR(16) NOT NULL,
    equipment_id VARCHAR(96),
    slot INT NOT NULL,
    expected_template_id INT NOT NULL,
    asset_revision BIGINT NOT NULL,
    changed BOOLEAN NOT NULL,
    PRIMARY KEY (role_id, request_id),
    CONSTRAINT fk_hero_equipment_request_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT ck_hero_equipment_request_action CHECK (
        (action='EQUIP' AND equipment_id IS NOT NULL AND slot=0 AND expected_template_id=0)
        OR (action='UNEQUIP' AND equipment_id IS NOT NULL AND slot BETWEEN 1 AND 4 AND expected_template_id>0)
        OR (action IN ('EQUIP_ALL','UNEQUIP_ALL') AND equipment_id IS NULL AND slot=0 AND expected_template_id=0)
    ),
    CONSTRAINT ck_hero_equipment_request_revision CHECK (asset_revision >= 0)
);
