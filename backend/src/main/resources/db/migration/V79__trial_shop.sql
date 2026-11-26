-- 试炼商店只保留角色与货位最近的周购买记录。角色锁串行化同一角色的扣费和限购。
CREATE TABLE game_trial_shop_stock (
    role_id VARCHAR(36) NOT NULL,
    offer_id INT NOT NULL,
    refresh_at BIGINT NOT NULL,
    purchased INT NOT NULL,
    PRIMARY KEY (role_id, offer_id),
    CONSTRAINT fk_trial_shop_stock_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);

-- 保存成功交易的参数和实际发奖结果，断线重试不会重新扣费或发货。
CREATE TABLE game_trial_shop_receipt (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    result_json TEXT NOT NULL,
    result_hash VARCHAR(64) NOT NULL,
    PRIMARY KEY (role_id, request_id),
    CONSTRAINT fk_trial_shop_receipt_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);
