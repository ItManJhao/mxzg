-- 普通堆叠库存保留配置键，另加稳定数据标识；旧数量不变。
ALTER TABLE game_inventory ADD COLUMN instance_id VARCHAR(96);
UPDATE game_inventory SET instance_id=CONCAT('stack:',role_id,':',item_id);
ALTER TABLE game_inventory MODIFY COLUMN instance_id VARCHAR(96) NOT NULL;
CREATE UNIQUE INDEX uq_inventory_instance ON game_inventory(instance_id);
-- 期限物品逐件保存，不能以配置 ID 合并。
CREATE TABLE game_timed_inventory (
 instance_id VARCHAR(96) PRIMARY KEY,
 role_id VARCHAR(36) NOT NULL,
 item_id INT NOT NULL,
 effect_type INT NOT NULL,
 active_at_seconds BIGINT NOT NULL,
 expires_at_seconds BIGINT NOT NULL,
 CONSTRAINT fk_timed_inventory_role FOREIGN KEY(role_id) REFERENCES game_role(id),
 CONSTRAINT ck_timed_inventory_id CHECK(item_id > 0),
 CONSTRAINT ck_timed_inventory_time CHECK(expires_at_seconds >= active_at_seconds)
);
CREATE INDEX ix_timed_inventory_owner_expiry ON game_timed_inventory(role_id,expires_at_seconds);
