-- 累计充值由未来可信到账入口维护；在支付接入前默认未达到积分召唤门槛。
ALTER TABLE game_role ADD COLUMN total_recharge BIGINT NOT NULL DEFAULT 0 CHECK (total_recharge >= 0);

-- 高级免费冷却和保底历史随召唤资产一并提交。
CREATE TABLE game_hero_summon_progress (
    role_id VARCHAR(36) PRIMARY KEY,
    advanced_free_at_seconds BIGINT NOT NULL CHECK (advanced_free_at_seconds >= 0),
    advanced_singles BIGINT NOT NULL CHECK (advanced_singles >= 0),
    advanced_tens BIGINT NOT NULL CHECK (advanced_tens >= 0),
    advanced_draws BIGINT NOT NULL CHECK (advanced_draws >= 0),
    advanced_without_five INT NOT NULL CHECK (advanced_without_five >= 0),
    advanced_since_four INT NOT NULL CHECK (advanced_since_four >= 0),
    advanced_since_five INT NOT NULL CHECK (advanced_since_five >= 0),
    CONSTRAINT fk_summon_progress_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);

-- 原有普通单抽保留唯一旧回执，其余池按同一角色级请求键冻结结果及扣费确认金额。
CREATE TABLE game_hero_summon_receipt (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    pool VARCHAR(16) NOT NULL,
    summon_count INT NOT NULL CHECK (summon_count IN (1, 10)),
    max_diamonds BIGINT NOT NULL CHECK (max_diamonds >= 0),
    receipt_id VARCHAR(36) NOT NULL UNIQUE,
    asset_revision BIGINT NOT NULL CHECK (asset_revision > 0),
    payload_json LONGTEXT NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    PRIMARY KEY (role_id, request_id),
    CONSTRAINT fk_summon_receipt_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT uq_summon_receipt_revision UNIQUE (role_id, asset_revision)
);
