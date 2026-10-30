CREATE TABLE game_role (
    id VARCHAR(36) PRIMARY KEY,
    account_key VARCHAR(64) NOT NULL UNIQUE,
    nickname VARCHAR(64) NOT NULL,
    role_level INT NOT NULL,
    gold BIGINT NOT NULL,
    diamonds BIGINT NOT NULL
);

CREATE TABLE game_session (
    token_hash VARCHAR(64) PRIMARY KEY,
    role_id VARCHAR(36) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_session_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);
CREATE INDEX idx_session_expiry ON game_session(expires_at);
