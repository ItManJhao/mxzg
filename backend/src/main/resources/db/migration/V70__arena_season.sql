-- 各区服独立保存普通竞技场每日和赛季结算边界。开服未知时赛季时间为 0。
CREATE TABLE game_arena_schedule (
    server_id VARCHAR(32) PRIMARY KEY,
    opened_at_seconds BIGINT NOT NULL CHECK (opened_at_seconds >= 0),
    next_daily_end BIGINT NOT NULL CHECK (next_daily_end > 0),
    next_season_end BIGINT NOT NULL CHECK (next_season_end >= 0),
    CONSTRAINT fk_arena_schedule_server FOREIGN KEY (server_id) REFERENCES game_server(id)
);

-- 名次和原邮件附件随结算持久化，信箱满时保留本笔以便之后进行原样投递。
CREATE TABLE game_arena_rank_prize (
    role_id VARCHAR(36) NOT NULL,
    prize_kind VARCHAR(16) NOT NULL,
    period_end BIGINT NOT NULL CHECK (period_end > 0),
    title VARCHAR(96) NOT NULL,
    body VARCHAR(512) NOT NULL,
    awards_json LONGTEXT NOT NULL,
    awards_hash VARCHAR(64) NOT NULL,
    mail_id VARCHAR(36) NULL,
    retry_at BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (role_id,prize_kind,period_end),
    CONSTRAINT fk_arena_rank_prize_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);
CREATE INDEX ix_arena_rank_prize_pending ON game_arena_rank_prize(mail_id,retry_at,period_end);

-- 领取、点赞、兑换的原命令与资产回执，同一角色锁内核验业务目标与期次。
CREATE TABLE game_arena_season_action (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    action_type VARCHAR(16) NOT NULL,
    period_end BIGINT NOT NULL CHECK (period_end > 0),
    target_key VARCHAR(36) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    notice_json LONGTEXT NOT NULL,
    notice_hash VARCHAR(64) NOT NULL,
    PRIMARY KEY (role_id,request_id),
    CONSTRAINT fk_arena_season_action_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);
CREATE INDEX ix_arena_season_action_scope ON game_arena_season_action(role_id,action_type,period_end,target_key);
CREATE INDEX ix_arena_season_likes ON game_arena_season_action(action_type,target_key);
CREATE INDEX ix_arena_season_battles ON game_arena_challenge(role_id,settled_at_seconds);
