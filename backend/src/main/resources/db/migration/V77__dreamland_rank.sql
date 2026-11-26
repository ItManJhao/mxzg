-- 每服单独锁住梦境排行榜。其结算锁独立于竞技场和角色锁，初次启用时从下一零点开始结算。
CREATE TABLE game_dreamland_rank_schedule (
    server_id VARCHAR(32) NOT NULL PRIMARY KEY,
    next_daily_end BIGINT NOT NULL CHECK (next_daily_end > 0)
);

-- 只在确认新的历史最高层后更新。达到时间为 0 表示 V75 存量进度没有可信历史时刻。
CREATE TABLE game_dreamland_rank_best (
    role_id VARCHAR(36) NOT NULL PRIMARY KEY,
    server_id VARCHAR(32) NOT NULL,
    floor INT NOT NULL CHECK (floor BETWEEN 1 AND 1500),
    achieved_at BIGINT NOT NULL CHECK (achieved_at >= 0),
    CONSTRAINT fk_dreamland_rank_best_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);

CREATE INDEX ix_dreamland_rank_best_order ON game_dreamland_rank_best(server_id,floor DESC,achieved_at,role_id);

-- 奖励冻结只引用已存在的梦境排名行，不持有角色锁。邮件写入与已投递标记随后逐角色提交。
CREATE TABLE game_dreamland_rank_prize (
    server_id VARCHAR(32) NOT NULL,
    period_end BIGINT NOT NULL CHECK (period_end > 0),
    role_id VARCHAR(36) NOT NULL,
    rank_place INT NOT NULL CHECK (rank_place BETWEEN 1 AND 50),
    awards_json LONGTEXT NOT NULL,
    awards_hash VARCHAR(64) NOT NULL,
    mail_id VARCHAR(36) NULL,
    retry_at BIGINT NOT NULL DEFAULT 0 CHECK (retry_at >= 0),
    PRIMARY KEY (server_id,period_end,role_id),
    CONSTRAINT fk_dreamland_rank_prize_best FOREIGN KEY (role_id) REFERENCES game_dreamland_rank_best(role_id)
);

CREATE INDEX ix_dreamland_rank_prize_due ON game_dreamland_rank_prize(mail_id,retry_at,period_end);
