-- 新主线累计沿用唯一计时行；既有起点原样保留，新领取链从版本1、空窗口和空类别计数开始。
-- 格式、规则语义和时间尺度独立持久化，未来不兼容配置须显式迁移，不能读取时取模清空。
ALTER TABLE game_main_chapter_idle ADD COLUMN schema_version INT NOT NULL DEFAULT 1;
ALTER TABLE game_main_chapter_idle ADD COLUMN semantics_version INT NOT NULL DEFAULT 1;
ALTER TABLE game_main_chapter_idle ADD COLUMN frequency_seconds INT NOT NULL DEFAULT 60;
ALTER TABLE game_main_chapter_idle ADD COLUMN reset_seconds INT NOT NULL DEFAULT 43200;
ALTER TABLE game_main_chapter_idle ADD COLUMN operation_version BIGINT NOT NULL DEFAULT 1;
ALTER TABLE game_main_chapter_idle ADD COLUMN drop_seconds INT NOT NULL DEFAULT 0;
ALTER TABLE game_main_chapter_idle ADD CONSTRAINT ck_main_idle_accumulation CHECK (
        started_at >= 0 AND started_at <= 9007199254740991
        AND schema_version > 0 AND semantics_version > 0
        AND frequency_seconds > 0 AND reset_seconds > 0
        AND operation_version > 0 AND operation_version <= 9007199254740991
        AND drop_seconds >= 0 AND drop_seconds < reset_seconds
    );

-- 类别键来自旧item_group_type，跨关延续；数量只统计普通原始掉落，不含加成或活动。
CREATE TABLE game_main_chapter_idle_counter (
    role_id VARCHAR(36) NOT NULL,
    group_type INT NOT NULL,
    quantity BIGINT NOT NULL,
    misses INT NOT NULL,
    PRIMARY KEY (role_id, group_type),
    CONSTRAINT fk_main_idle_counter_clock FOREIGN KEY (role_id) REFERENCES game_main_chapter_idle(role_id),
    CONSTRAINT ck_main_idle_counter CHECK (
        group_type > 0 AND quantity >= 0 AND quantity <= 9007199254740991 AND misses >= 0
    )
);
