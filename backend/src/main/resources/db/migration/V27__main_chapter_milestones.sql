-- 主线额外奖励的真实已领集合，与通关数及首通待领奖分离；旧3008尚未恢复，不迁移或推断已领。
-- 独立新版没有旧玩家迁移，表内无角色记录即真实空集合；读取不插行或改变资产版本。
CREATE TABLE game_main_chapter_milestone (
    role_id VARCHAR(36) NOT NULL,
    reward_id INT NOT NULL,
    PRIMARY KEY (role_id, reward_id),
    CONSTRAINT fk_main_milestone_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT ck_main_milestone_reward CHECK (reward_id > 0)
);
