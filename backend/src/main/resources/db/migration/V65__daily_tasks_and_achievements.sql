-- 任务域仅维护无法由既有业务回执或角色资料复原的计数。
-- 周期 0 为累计，正数为上海自然日结束的 Unix 秒。
CREATE TABLE game_quest_counter (
    role_id VARCHAR(36) NOT NULL,
    period_end_seconds BIGINT NOT NULL,
    metric VARCHAR(40) NOT NULL,
    condition_value INT NOT NULL,
    amount BIGINT NOT NULL,
    PRIMARY KEY (role_id, period_end_seconds, metric, condition_value),
    CONSTRAINT fk_quest_counter_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT ck_quest_counter_values CHECK (period_end_seconds >= 0 AND condition_value >= 0 AND amount > 0)
);

-- 记录现役实例及历史升星回执证明的星级下限；五星已有独立台账。
INSERT INTO game_quest_counter (role_id, period_end_seconds, metric, condition_value, amount)
SELECT role_id, 0, 'GET_HERO', star, COUNT(*)
FROM (
    SELECT role_id, id AS hero_id, star FROM game_hero
    UNION
    SELECT role_id, hero_id, from_star AS star FROM game_hero_star_request
    UNION
    SELECT role_id, hero_id, to_star AS star FROM game_hero_star_request
) AS acquired
WHERE star IN (4, 6, 9, 10)
GROUP BY role_id, star;

-- 首次达到后记录已提示资格，后续状态减少或重复登录时也不再次飘字。
CREATE TABLE game_quest_achievement (
    role_id VARCHAR(36) NOT NULL,
    quest_id INT NOT NULL,
    completed_at_seconds BIGINT NOT NULL,
    completed_progress BIGINT NOT NULL,
    PRIMARY KEY (role_id, quest_id),
    CONSTRAINT fk_quest_achievement_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT ck_quest_achievement_values CHECK (quest_id > 0 AND completed_at_seconds > 0 AND completed_progress > 0)
);

-- 回执按原请求及资格双重去重，保留实际通用奖励通知用于重试恢复。
CREATE TABLE game_quest_claim (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    kind VARCHAR(16) NOT NULL,
    quest_id INT NOT NULL,
    period_end_seconds BIGINT NOT NULL,
    activity_points INT NOT NULL,
    notice_json LONGTEXT NOT NULL,
    notice_hash VARCHAR(64) NOT NULL,
    PRIMARY KEY (role_id, request_id),
    CONSTRAINT uq_quest_claim UNIQUE (role_id, kind, period_end_seconds, quest_id),
    CONSTRAINT fk_quest_claim_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT ck_quest_claim_values CHECK (quest_id > 0 AND period_end_seconds >= 0 AND activity_points >= 0)
);
