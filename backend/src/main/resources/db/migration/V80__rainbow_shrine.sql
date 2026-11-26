-- 神位属于区服，空位保留上一次进化等级；同服角色只允许占一席。
CREATE TABLE game_rainbow_seat (
    server_id VARCHAR(32) NOT NULL,
    seat_id INT NOT NULL,
    evolution INT NOT NULL,
    role_id VARCHAR(36),
    occupied_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL,
    PRIMARY KEY (server_id, seat_id),
    CONSTRAINT uq_rainbow_occupant UNIQUE (server_id, role_id),
    CONSTRAINT fk_rainbow_server FOREIGN KEY (server_id) REFERENCES game_server(id),
    CONSTRAINT fk_rainbow_occupant FOREIGN KEY (role_id) REFERENCES game_role(id)
);
CREATE INDEX idx_rainbow_role ON game_rainbow_seat(role_id);
CREATE INDEX idx_rainbow_expiry ON game_rainbow_seat(expires_at, server_id);

-- 一次挑战保存相同请求可重读的结算，只有胜场进入该神位的公开历史。
CREATE TABLE game_rainbow_attempt (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    server_id VARCHAR(32) NOT NULL,
    seat_id INT NOT NULL,
    evolution_step INT NOT NULL,
    lineup_version BIGINT NOT NULL,
    battle_id VARCHAR(36) NOT NULL UNIQUE,
    attacker_name VARCHAR(96) NOT NULL,
    attacker_power INT NOT NULL,
    won BOOLEAN NOT NULL,
    fought_at BIGINT NOT NULL,
    replay LONGBLOB NOT NULL,
    PRIMARY KEY (role_id, request_id),
    CONSTRAINT fk_rainbow_attempt_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);
CREATE INDEX idx_rainbow_history ON game_rainbow_attempt(server_id, seat_id, won, fought_at, battle_id);

-- 仅战败写入截止时间，跨会话和自然日保留。
CREATE TABLE game_rainbow_cooldown (
    role_id VARCHAR(36) NOT NULL PRIMARY KEY,
    ends_at BIGINT NOT NULL,
    CONSTRAINT fk_rainbow_cooldown_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);

-- 占位失效与通知入队同事务，独立投递处理离线玩家和暂满的邮箱。
CREATE TABLE game_rainbow_notice (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    role_id VARCHAR(36) NOT NULL,
    seat_id INT NOT NULL,
    expired BOOLEAN NOT NULL,
    CONSTRAINT fk_rainbow_notice_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);
