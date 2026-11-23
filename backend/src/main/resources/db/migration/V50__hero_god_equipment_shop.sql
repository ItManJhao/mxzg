-- 神装商城按上海零点轮转。每个商品只记录最近周期的次数，每次确认保留独立回执。
CREATE TABLE game_god_equipment_shop_stock (
    role_id VARCHAR(36) NOT NULL,
    product_id INT NOT NULL,
    reset_at BIGINT NOT NULL,
    purchased INT NOT NULL,
    PRIMARY KEY (role_id, product_id),
    CONSTRAINT fk_god_shop_stock_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);

CREATE TABLE game_god_equipment_shop_receipt (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    product_id INT NOT NULL,
    bought_count INT NOT NULL,
    reset_at BIGINT NOT NULL,
    purchased INT NOT NULL,
    asset_revision BIGINT NOT NULL,
    PRIMARY KEY (role_id, request_id),
    CONSTRAINT fk_god_shop_receipt_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);
