-- 冻结上一期计算出的下一次调度点，不以新配置重新推断已有期次。
-- 044发布时next等于start，消费开始标记后为NULL；16/34循环时间另由纯规则校验。
-- 不把控制时间推进记录成角色兑换清理、任务重置或资产回收已经完成。
ALTER TABLE game_idle_activity_control ADD COLUMN next_start_seconds BIGINT NULL;
ALTER TABLE game_idle_activity_control ADD CONSTRAINT ck_idle_activity_next_start CHECK (next_start_seconds >= 0);

-- 发布配置版本与控制revision分开；相同运营意图重启不重置已消费的开始标记。
-- 0表示尚未由可信发布入口应用配置，不拿已有V21记录猜测历史发布内容。
ALTER TABLE game_idle_activity_control ADD COLUMN publication_version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE game_idle_activity_control ADD COLUMN publication_fingerprint VARCHAR(64) NULL;
ALTER TABLE game_idle_activity_control ADD COLUMN publication_config TEXT NULL;
ALTER TABLE game_idle_activity_control ADD CONSTRAINT ck_idle_publication_version CHECK (publication_version >= 0);
ALTER TABLE game_idle_activity_control ADD CONSTRAINT ck_idle_publication_metadata CHECK (
    (publication_version = 0 AND publication_fingerprint IS NULL AND publication_config IS NULL)
    OR (activity_id = 44 AND publication_version > 0
        AND publication_fingerprint IS NOT NULL AND publication_config IS NOT NULL)
);
