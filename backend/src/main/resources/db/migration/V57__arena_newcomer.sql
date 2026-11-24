-- 新手竞技场的胜场、已结算参与次数和当前对手均按角色保存。
CREATE TABLE game_arena_progress (
    role_id VARCHAR(36) NOT NULL PRIMARY KEY,
    robot_wins INT NOT NULL,
    settled_challenges INT NOT NULL,
    daily_challenges INT NOT NULL,
    reset_at_seconds BIGINT NOT NULL CHECK (reset_at_seconds > 0),
    opponents VARCHAR(255) NOT NULL,
    CONSTRAINT fk_arena_progress_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT ck_arena_progress_counts CHECK (
        robot_wins >= 0 AND settled_challenges >= robot_wins
        AND daily_challenges >= 0 AND daily_challenges <= settled_challenges
    )
);

-- 排序索引和对战记录使用持久场次序号，不依赖同秒时间戳。
CREATE TABLE game_arena_challenge (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    battle_id VARCHAR(36) NOT NULL UNIQUE,
    settlement_number INT NOT NULL CHECK (settlement_number > 0),
    opponent_id INT NOT NULL CHECK (opponent_id > 0),
    opponent_name VARCHAR(128) NOT NULL,
    won BOOLEAN NOT NULL,
    score_delta INT NOT NULL CHECK (score_delta >= 0),
    settled_at_seconds BIGINT NOT NULL CHECK (settled_at_seconds > 0),
    report_bytes LONGBLOB NOT NULL,
    receipt_json LONGTEXT NOT NULL,
    receipt_hash VARCHAR(64) NOT NULL,
    PRIMARY KEY (role_id, request_id),
    CONSTRAINT uq_arena_settlement UNIQUE (role_id, settlement_number),
    CONSTRAINT fk_arena_challenge_progress FOREIGN KEY (role_id) REFERENCES game_arena_progress(role_id)
);

-- 门票购买单独冻结资产结果，重发相同命令不会重复扣钻石。
CREATE TABLE game_arena_ticket_purchase (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    receipt_json LONGTEXT NOT NULL,
    receipt_hash VARCHAR(64) NOT NULL,
    PRIMARY KEY (role_id, request_id),
    CONSTRAINT fk_arena_ticket_purchase_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);
