-- 冒险点由独立酒馆领域持有；历史普通堆叠按原量迁入，合法0也必须保留。
-- 不给已有角色补差、不创建任务或回执；真正缺行由角色锁事务按同源初始配置懒建。
CREATE TABLE game_tavern_point (
    role_id VARCHAR(36) PRIMARY KEY,
    adventure_count BIGINT NOT NULL,
    CONSTRAINT fk_tavern_point_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT ck_tavern_point_nonnegative CHECK (adventure_count BETWEEN 0 AND 9007199254740991)
);

-- 先完整写入并校验，成功后才移除旧堆叠；坏数量不能静默过滤为缺行或零余额。
INSERT INTO game_tavern_point (role_id, adventure_count)
SELECT role_id, quantity FROM game_inventory WHERE item_id = 900401;

DELETE FROM game_inventory WHERE item_id = 900401;
