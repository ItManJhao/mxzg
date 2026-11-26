-- 勇者试炼日进度、独立阵容、守军和上一场战报在同一角色事务提交。
CREATE TABLE game_trial (
    role_id VARCHAR(36) NOT NULL PRIMARY KEY,
    progress_json LONGTEXT NOT NULL,
    report_bytes LONGBLOB,
    CONSTRAINT fk_trial_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);

-- 每个已提交命令的原回执和战报不随自然日重置。
CREATE TABLE game_trial_request (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    receipt_json LONGTEXT NOT NULL,
    receipt_hash VARCHAR(64) NOT NULL,
    report_bytes LONGBLOB,
    PRIMARY KEY (role_id, request_id),
    CONSTRAINT fk_trial_request_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);

-- 派遣快照仅在所属自然日可选，派遣者可以在次日重新选择。
CREATE TABLE game_trial_dispatch (
    role_id VARCHAR(36) NOT NULL,
    hero_id VARCHAR(36) NOT NULL,
    reset_at BIGINT NOT NULL,
    hero_json LONGTEXT NOT NULL,
    PRIMARY KEY (role_id, hero_id),
    CONSTRAINT fk_trial_dispatch_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);

-- 首次保存好友上阵时写入；后台在次日投递邮件，离线角色同样可领取。
CREATE TABLE game_trial_assist_usage (
    sender_id VARCHAR(36) NOT NULL,
    borrower_id VARCHAR(36) NOT NULL,
    hero_id VARCHAR(36) NOT NULL,
    reset_at BIGINT NOT NULL,
    mailed BOOLEAN DEFAULT FALSE NOT NULL,
    PRIMARY KEY (sender_id, borrower_id, hero_id, reset_at),
    CONSTRAINT fk_trial_usage_borrower FOREIGN KEY (borrower_id) REFERENCES game_role(id)
);

CREATE INDEX idx_trial_assist_due ON game_trial_assist_usage(mailed,reset_at,sender_id);
