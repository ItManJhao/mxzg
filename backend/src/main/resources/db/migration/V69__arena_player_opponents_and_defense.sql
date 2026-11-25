-- 真人候选、专用防守阵容及守方战报。原攻方结算和门票回执表继续保留。
ALTER TABLE game_role ADD COLUMN arena_last_battle_at_seconds BIGINT NOT NULL DEFAULT 0;
UPDATE game_role SET arena_last_battle_at_seconds=COALESCE((
    SELECT MAX(settled_at_seconds) FROM game_arena_challenge WHERE role_id=game_role.id
),0);
CREATE INDEX ix_arena_role_cup ON game_role(server_id,cup);

CREATE TABLE game_arena_player_candidate (
    role_id VARCHAR(36) NOT NULL,
    position INT NOT NULL CHECK (position > 0),
    target_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (role_id,position),
    CONSTRAINT uq_arena_candidate UNIQUE (role_id,target_id),
    CONSTRAINT fk_arena_candidate_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT fk_arena_candidate_target FOREIGN KEY (target_id) REFERENCES game_role(id),
    CONSTRAINT ck_arena_candidate_not_self CHECK (role_id <> target_id)
);

CREATE TABLE game_arena_defense (
    role_id VARCHAR(36) PRIMARY KEY,
    version BIGINT NOT NULL CHECK (version > 0),
    formation_id INT NOT NULL CHECK (formation_id > 0),
    CONSTRAINT fk_arena_defense_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);

-- 英雄消耗时只移除该专用阵容位置。阵容为空时按原服使用主阵。
CREATE TABLE game_arena_defense_slot (
    role_id VARCHAR(36) NOT NULL,
    position INT NOT NULL CHECK (position BETWEEN 1 AND 8),
    hero_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (role_id,position),
    CONSTRAINT uq_arena_defense_hero UNIQUE (role_id,hero_id),
    CONSTRAINT fk_arena_defense_slot FOREIGN KEY (role_id) REFERENCES game_arena_defense(role_id),
    CONSTRAINT fk_arena_defense_hero_owner FOREIGN KEY (hero_id,role_id) REFERENCES game_hero(id,role_id)
        ON DELETE CASCADE
);

CREATE TABLE game_arena_defense_save (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    receipt_json LONGTEXT NOT NULL,
    receipt_hash VARCHAR(64) NOT NULL,
    PRIMARY KEY (role_id,request_id),
    CONSTRAINT fk_arena_defense_save_role FOREIGN KEY (role_id) REFERENCES game_arena_defense(role_id)
);

-- 唯一冻结报告仍由攻方原表持有。守方历史保存独立视角与积分，双方回放访问同一战报。
ALTER TABLE game_arena_challenge ADD COLUMN opponent_role_id VARCHAR(36);
ALTER TABLE game_arena_challenge ADD CONSTRAINT fk_arena_challenge_target
    FOREIGN KEY (opponent_role_id) REFERENCES game_role(id);

CREATE TABLE game_arena_defense_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    battle_id VARCHAR(36) NOT NULL UNIQUE,
    role_id VARCHAR(36) NOT NULL,
    opponent_role_id VARCHAR(36) NOT NULL,
    opponent_name VARCHAR(128) NOT NULL,
    won BOOLEAN NOT NULL,
    score_delta INT NOT NULL CHECK (score_delta <= 0),
    settled_at_seconds BIGINT NOT NULL CHECK (settled_at_seconds > 0),
    CONSTRAINT fk_arena_defense_battle FOREIGN KEY (battle_id) REFERENCES game_arena_challenge(battle_id),
    CONSTRAINT fk_arena_defense_history_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT fk_arena_defense_history_target FOREIGN KEY (opponent_role_id) REFERENCES game_role(id)
);
CREATE INDEX ix_arena_defense_history_role ON game_arena_defense_history(role_id,settled_at_seconds,id);
