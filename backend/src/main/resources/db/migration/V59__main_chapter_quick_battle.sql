-- 一次实际发奖即一条成功记录。按上海日结束时刻计每日次数，全部记录汇总为契约累计进度。
CREATE TABLE game_quick_battle_receipt (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    reset_at BIGINT NOT NULL CHECK (reset_at > 0),
    payload_json LONGTEXT NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    PRIMARY KEY (role_id, request_id),
    CONSTRAINT fk_quick_battle_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);

CREATE INDEX idx_quick_battle_day ON game_quick_battle_receipt(role_id, reset_at);
