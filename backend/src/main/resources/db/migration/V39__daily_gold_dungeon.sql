-- 旧金币副本用当前角色的历史最高主阵容战力判断入场。
ALTER TABLE game_role ADD COLUMN max_main_power INT NOT NULL DEFAULT 0;

-- 上海零点只刷新当日胜场，首关清扫资格永久保留。
CREATE TABLE game_daily_gold (
    role_id VARCHAR(36) PRIMARY KEY,
    wins INT NOT NULL,
    cleared BOOLEAN NOT NULL,
    reset_at_seconds BIGINT NOT NULL,
    CONSTRAINT fk_daily_gold_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT ck_daily_gold_progress CHECK (wins>=0 AND (wins=0 OR cleared=TRUE) AND reset_at_seconds>0)
);

-- 一次挑战或扫荡在资产同事务内保存原参数、回执和可选的原二进制战报。
CREATE TABLE game_daily_gold_request (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    sweep BOOLEAN NOT NULL,
    max_diamonds BIGINT NOT NULL,
    report_bytes LONGBLOB,
    receipt_json LONGTEXT NOT NULL,
    receipt_hash VARCHAR(64) NOT NULL,
    PRIMARY KEY (role_id,request_id),
    CONSTRAINT fk_daily_gold_request_role FOREIGN KEY (role_id) REFERENCES game_daily_gold(role_id),
    CONSTRAINT ck_daily_gold_request_mode CHECK (max_diamonds>=0
        AND ((sweep=TRUE AND report_bytes IS NULL) OR (sweep=FALSE AND report_bytes IS NOT NULL)))
);
