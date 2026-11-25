-- 档位 0 记录当日捐献，其余槽记录按配置编号领取的公会宝箱。换会不重置个人次数。
CREATE TABLE game_guild_donation_receipt (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    guild_id VARCHAR(36) NOT NULL,
    reset_at_seconds BIGINT NOT NULL,
    reward_slot INT NOT NULL CHECK (reward_slot BETWEEN 0 AND 3),
    option_id INT NOT NULL CHECK (option_id BETWEEN 1 AND 3),
    points INT NOT NULL CHECK (points >= 0),
    receipt_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (role_id, request_id),
    CONSTRAINT uq_game_guild_donation_slot UNIQUE (role_id, reset_at_seconds, reward_slot),
    CONSTRAINT fk_game_guild_donation_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);
CREATE INDEX idx_game_guild_donation_daily ON game_guild_donation_receipt(guild_id, reset_at_seconds, reward_slot);
