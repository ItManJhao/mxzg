-- 按策划编号保存每档层数奖励。旧版只开放第 10 层，已领取记录迁移为编号 1。
CREATE TABLE game_tower_milestone_claim (
    role_id VARCHAR(36) NOT NULL,
    milestone_id INT NOT NULL,
    PRIMARY KEY (role_id, milestone_id),
    CONSTRAINT fk_tower_milestone_progress FOREIGN KEY (role_id) REFERENCES game_tower(role_id),
    CONSTRAINT ck_tower_milestone_id CHECK (milestone_id > 0)
);

INSERT INTO game_tower_milestone_claim (role_id, milestone_id)
SELECT role_id, 1 FROM game_tower WHERE milestone_claimed = TRUE;

ALTER TABLE game_tower DROP COLUMN milestone_claimed;
