-- 公会、同区角色唯一成员身份、申请、离会冷却及已提交命令记录。
CREATE TABLE game_guild (
    id VARCHAR(36) PRIMARY KEY,
    server_id VARCHAR(32) NOT NULL,
    name VARCHAR(64) NOT NULL,
    name_key VARCHAR(64) NOT NULL,
    description VARCHAR(512) NOT NULL,
    leader_role_id VARCHAR(36) NOT NULL,
    created_at_seconds BIGINT NOT NULL,
    CONSTRAINT uq_game_guild_server_name UNIQUE (server_id, name_key),
    CONSTRAINT fk_game_guild_leader FOREIGN KEY (leader_role_id) REFERENCES game_role(id)
);
CREATE TABLE game_guild_member (
    role_id VARCHAR(36) PRIMARY KEY,
    guild_id VARCHAR(36) NOT NULL,
    joined_at_seconds BIGINT NOT NULL,
    CONSTRAINT fk_game_guild_member_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT fk_game_guild_member_guild FOREIGN KEY (guild_id) REFERENCES game_guild(id)
);
CREATE INDEX idx_game_guild_member_guild ON game_guild_member(guild_id);
CREATE TABLE game_guild_application (
    guild_id VARCHAR(36) NOT NULL,
    role_id VARCHAR(36) NOT NULL,
    applied_at_seconds BIGINT NOT NULL,
    PRIMARY KEY (guild_id, role_id),
    CONSTRAINT fk_game_guild_application_guild FOREIGN KEY (guild_id) REFERENCES game_guild(id),
    CONSTRAINT fk_game_guild_application_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);
CREATE INDEX idx_game_guild_application_role ON game_guild_application(role_id);
CREATE TABLE game_guild_leave (
    role_id VARCHAR(36) PRIMARY KEY,
    rejoin_at_seconds BIGINT NOT NULL,
    CONSTRAINT fk_game_guild_leave_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);
CREATE TABLE game_guild_command (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    command_key VARCHAR(64) NOT NULL,
    PRIMARY KEY (role_id, request_id),
    CONSTRAINT fk_game_guild_command_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);
