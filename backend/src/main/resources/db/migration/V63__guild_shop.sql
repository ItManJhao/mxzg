-- 固定货架按角色和商品保存最近周购买进度。退出公会或换会不能重置限购。
CREATE TABLE game_guild_shop_stock (
    role_id VARCHAR(36) NOT NULL,
    product_id INT NOT NULL,
    reset_at_seconds BIGINT NOT NULL,
    purchased INT NOT NULL,
    PRIMARY KEY (role_id, product_id),
    CONSTRAINT fk_guild_shop_stock_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);

-- 独立保存原购买请求和货架回包，重复请求只回读，不重复扣款或发奖。
CREATE TABLE game_guild_shop_receipt (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    result_json TEXT NOT NULL,
    result_hash VARCHAR(64) NOT NULL,
    PRIMARY KEY (role_id, request_id),
    CONSTRAINT fk_guild_shop_receipt_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);
