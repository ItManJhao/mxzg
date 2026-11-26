-- 道具摊位按上海自然日结算。每件商品只保留最后一次购买的期次和计数。
CREATE TABLE game_black_market_purchase (
    role_id VARCHAR(36) NOT NULL,
    product_id INT NOT NULL,
    reset_at BIGINT NOT NULL,
    purchased INT NOT NULL,
    PRIMARY KEY (role_id,product_id),
    CONSTRAINT fk_black_market_purchase_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT ck_black_market_purchase CHECK (product_id>0 AND reset_at>0 AND purchased>0)
);

-- 冻结黑市买入的原货架及命令，刷新、重连和跨日重试都不能重复发放。
CREATE TABLE game_black_market_request (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    shop_type INT NOT NULL,
    expected_shelf BIGINT NOT NULL,
    product_id INT NOT NULL,
    purchase_count INT NOT NULL,
    payload_json TEXT NOT NULL,
    payload_hash CHAR(64) NOT NULL,
    PRIMARY KEY (role_id,request_id),
    CONSTRAINT fk_black_market_request_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT ck_black_market_request CHECK (shop_type>0 AND expected_shelf>0 AND product_id>0 AND purchase_count>0)
);
