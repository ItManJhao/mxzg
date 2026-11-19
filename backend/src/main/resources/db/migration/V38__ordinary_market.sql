-- 每角色一份普通市场。午夜只重置付费次数，免费库存独立按时间补充。
CREATE TABLE game_market (
    role_id VARCHAR(36) PRIMARY KEY,
    shelf_version BIGINT NOT NULL,
    free_refreshes INT NOT NULL,
    paid_refreshes INT NOT NULL,
    next_free_refresh_at BIGINT NOT NULL,
    next_paid_reset_at BIGINT NOT NULL,
    CONSTRAINT fk_market_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT ck_market_state CHECK (shelf_version>0 AND free_refreshes>=0 AND paid_refreshes>=0
        AND next_free_refresh_at>=0 AND next_paid_reset_at>0)
);

-- 持久货架与实际已购份数，由显式换货架重置。
CREATE TABLE game_market_offer (
    role_id VARCHAR(36) NOT NULL,
    product_id INT NOT NULL,
    purchased INT NOT NULL,
    PRIMARY KEY (role_id, product_id),
    CONSTRAINT fk_market_offer_market FOREIGN KEY (role_id) REFERENCES game_market(role_id),
    CONSTRAINT ck_market_offer_count CHECK (product_id>0 AND purchased>=0)
);

-- 在同一交易内冻结原参数和操作结果，断线重发同请求不重复扣款、发奖或消耗刷新次数。
CREATE TABLE game_market_request (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    expected_shelf BIGINT NOT NULL,
    product_id INT NOT NULL,
    purchase_count INT NOT NULL,
    payload_json LONGTEXT NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    PRIMARY KEY (role_id, request_id),
    CONSTRAINT fk_market_request_market FOREIGN KEY (role_id) REFERENCES game_market(role_id),
    CONSTRAINT ck_market_request_type CHECK (expected_shelf>0
        AND ((product_id=0 AND purchase_count=0) OR (product_id>0 AND purchase_count>0)))
);
