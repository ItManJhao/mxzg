-- 原主线持久闭环；与早期简化game_campaign/game_battle隔离，不迁移或猜测旧测试进度。
CREATE TABLE game_main_chapter (
    role_id VARCHAR(36) PRIMARY KEY,
    max_cleared INT NOT NULL DEFAULT 0,
    pending_battle_id VARCHAR(36),
    CONSTRAINT fk_main_chapter_role FOREIGN KEY(role_id) REFERENCES game_role(id),
    CONSTRAINT ck_main_chapter_progress CHECK(max_cleared >= 0)
);
CREATE TABLE game_main_chapter_battle (
    id VARCHAR(36) PRIMARY KEY,
    role_id VARCHAR(36) NOT NULL,
    replay_bytes LONGBLOB NOT NULL,
    details_json LONGTEXT NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    settlement_json LONGTEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_main_battle_role FOREIGN KEY(role_id) REFERENCES game_role(id)
);
CREATE INDEX idx_main_battle_role ON game_main_chapter_battle(role_id);
CREATE TABLE game_main_chapter_command (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    result_json LONGTEXT NOT NULL,
    PRIMARY KEY(role_id, request_id),
    CONSTRAINT fk_main_command_role FOREIGN KEY(role_id) REFERENCES game_role(id)
);
