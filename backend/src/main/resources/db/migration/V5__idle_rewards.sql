-- 普通挂机计时、累计掉落及幂等收据；旧角色第一次进入时初始化，不追溯补发历史收益。
CREATE TABLE game_idle (
    role_id VARCHAR(36) PRIMARY KEY,
    started_at BIGINT NOT NULL,
    revision BIGINT NOT NULL DEFAULT 0,
    drop_seconds INT NOT NULL DEFAULT 0,
    counters_json TEXT NOT NULL,
    CONSTRAINT fk_idle_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT ck_idle_state CHECK (started_at >= 0 AND revision >= 0 AND drop_seconds >= 0)
);
CREATE TABLE game_idle_receipt (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    expected_revision BIGINT NOT NULL,
    receipt_json TEXT NOT NULL,
    PRIMARY KEY(role_id, request_id),
    CONSTRAINT fk_idle_receipt_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);
