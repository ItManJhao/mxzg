-- 独立新版此前没有礼包购买/激活写入链，也不迁移旧玩家；新表明确从空持有记录开始。
-- 礼包记录与库存物品不同，不从已有库存推断或补发权益。
-- 旧持有记录使用独立主键，同角色同配置并未有唯一约束；读取时保留全部记录。
CREATE TABLE game_privilege_gift (
    id VARCHAR(64) PRIMARY KEY,
    role_id VARCHAR(36) NOT NULL,
    gift_id INT NOT NULL,
    purchased_at_seconds BIGINT NOT NULL,
    ends_at_seconds BIGINT NOT NULL,
    purchase_count INT NOT NULL,
    active INT NOT NULL,
    CONSTRAINT fk_privilege_gift_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT ck_privilege_gift_id CHECK (gift_id > 0),
    CONSTRAINT ck_privilege_gift_time CHECK (purchased_at_seconds >= 0 AND ends_at_seconds >= 0),
    CONSTRAINT ck_privilege_gift_count CHECK (purchase_count >= 0),
    CONSTRAINT ck_privilege_gift_active CHECK (active BETWEEN 0 AND 1)
);
CREATE INDEX ix_privilege_gift_role ON game_privilege_gift(role_id);
