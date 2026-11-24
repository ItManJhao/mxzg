-- 幻境最高通关、精力、每日扫荡和专用阵容版本，在同一角色锁内更新。
CREATE TABLE game_tower (
    role_id VARCHAR(36) PRIMARY KEY,
    highest_cleared INT NOT NULL,
    energy INT NOT NULL,
    energy_time_seconds BIGINT NOT NULL,
    sweep_times INT NOT NULL,
    sweep_reset_at_seconds BIGINT NOT NULL,
    milestone_claimed BOOLEAN NOT NULL,
    formation_version BIGINT NOT NULL DEFAULT 0,
    formation_id INT NOT NULL DEFAULT 1,
    CONSTRAINT fk_tower_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT ck_tower_progress CHECK (
        highest_cleared>=0 AND energy>=0 AND energy_time_seconds>=0
        AND sweep_times>=0 AND sweep_reset_at_seconds>0 AND formation_version>=0 AND formation_id>0
    )
);

-- 英雄被当作材料消耗时从专用阵容移除，主线自己的出阵检查仍独立执行。
CREATE TABLE game_tower_formation_slot (
    role_id VARCHAR(36) NOT NULL,
    position INT NOT NULL,
    hero_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (role_id,position),
    CONSTRAINT uq_tower_formation_hero UNIQUE (role_id,hero_id),
    CONSTRAINT fk_tower_formation_progress FOREIGN KEY (role_id) REFERENCES game_tower(role_id),
    CONSTRAINT fk_tower_formation_hero_owner FOREIGN KEY (hero_id,role_id) REFERENCES game_hero(id,role_id)
        ON DELETE CASCADE,
    CONSTRAINT ck_tower_formation_position CHECK (position BETWEEN 1 AND 8)
);

-- 原请求、结果和二进制战报与消耗/奖励一起提交，重试可恢复且不再结算。
CREATE TABLE game_tower_request (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    action_kind VARCHAR(16) NOT NULL,
    target_id INT NOT NULL,
    max_diamonds BIGINT NOT NULL,
    report_bytes LONGBLOB,
    receipt_json LONGTEXT NOT NULL,
    receipt_hash VARCHAR(64) NOT NULL,
    PRIMARY KEY (role_id,request_id),
    CONSTRAINT fk_tower_request_progress FOREIGN KEY (role_id) REFERENCES game_tower(role_id),
    CONSTRAINT ck_tower_request_mode CHECK (target_id>0 AND max_diamonds>=0
        AND ((action_kind='CHALLENGE' AND report_bytes IS NOT NULL)
            OR (action_kind IN ('SWEEP','MILESTONE') AND report_bytes IS NULL)))
);
