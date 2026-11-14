-- 开服时间此前没有权威持久来源；保留未知为NULL，不以迁移执行时间代替真实开服时刻。
-- 活动仅增加只读输入结构，不填默认行、不创建角色活动记录、不启用发布或奖励写入口。
ALTER TABLE game_server ADD COLUMN opened_at_seconds BIGINT NULL;
ALTER TABLE game_server ADD CONSTRAINT ck_server_opened_at CHECK (opened_at_seconds >= 0);

CREATE TABLE game_idle_activity_control (
    server_id VARCHAR(32) NOT NULL,
    activity_id INT NOT NULL,
    publication_state INT NOT NULL,
    start_seconds BIGINT NULL,
    end_seconds BIGINT NULL,
    clear_seconds BIGINT NULL,
    turns INT NULL,
    turns_time BIGINT NULL,
    limit_days INT NULL,
    revision BIGINT NOT NULL,
    PRIMARY KEY (server_id, activity_id),
    CONSTRAINT fk_idle_activity_server FOREIGN KEY (server_id) REFERENCES game_server(id),
    -- CASE与IN约束等价，避免独立H2库反复迁移时复用已关闭会话的常量集合。
    CONSTRAINT ck_idle_activity_type CHECK (
        CASE activity_id WHEN 16 THEN 1 WHEN 34 THEN 1 WHEN 44 THEN 1 ELSE 0 END = 1
    ),
    CONSTRAINT ck_idle_activity_publication CHECK (publication_state BETWEEN 0 AND 1),
    CONSTRAINT ck_idle_activity_revision CHECK (revision >= 1),
    CONSTRAINT ck_idle_activity_nonnegative CHECK (
        (start_seconds IS NULL OR start_seconds >= 0)
        AND (end_seconds IS NULL OR end_seconds >= 0)
        AND (clear_seconds IS NULL OR clear_seconds >= 0)
        AND (turns IS NULL OR turns >= 0)
        AND (turns_time IS NULL OR turns_time >= 0)
        AND (limit_days IS NULL OR limit_days >= 0)
    ),
    CONSTRAINT ck_idle_activity_dates CHECK (end_seconds >= start_seconds AND clear_seconds >= end_seconds),
    CONSTRAINT ck_idle_activity_ready CHECK (
        publication_state = 0 OR (
            start_seconds IS NOT NULL AND end_seconds IS NOT NULL AND clear_seconds IS NOT NULL
            AND turns IS NOT NULL AND (activity_id = 44 OR turns >= 1)
            AND turns_time IS NOT NULL AND limit_days IS NOT NULL
        )
    )
);
