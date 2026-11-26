-- 永恒梦境进度及独立阵容随角色锁更新；活跃期限由服务端持久保存。
CREATE TABLE game_dreamland (
    role_id VARCHAR(36) NOT NULL PRIMARY KEY,
    wake_at BIGINT NOT NULL,
    progress_json LONGTEXT NOT NULL,
    report_bytes LONGBLOB,
    CONSTRAINT fk_dreamland_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT ck_dreamland_wake_at CHECK (wake_at >= 0)
);

CREATE INDEX idx_dreamland_wake_at ON game_dreamland(wake_at);

-- 记录同一命令的原进度、原战报和实际到账；重试不重复战斗或发奖。
CREATE TABLE game_dreamland_request (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    receipt_json LONGTEXT NOT NULL,
    receipt_hash VARCHAR(64) NOT NULL,
    report_bytes LONGBLOB,
    PRIMARY KEY (role_id, request_id),
    CONSTRAINT fk_dreamland_request_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);
