CREATE TABLE game_server (
    id VARCHAR(32) PRIMARY KEY,
    region_id VARCHAR(32) NOT NULL,
    region_name VARCHAR(64) NOT NULL,
    server_name VARCHAR(64) NOT NULL,
    enabled BOOLEAN NOT NULL
);
INSERT INTO game_server VALUES ('local-1', 'local', '本地开发区', '开发一服', TRUE);
INSERT INTO game_server VALUES ('local-2', 'local', '本地开发区', '开发二服', TRUE);
ALTER TABLE game_role ADD COLUMN server_id VARCHAR(32) NOT NULL DEFAULT 'local-1';
ALTER TABLE game_role ADD COLUMN login_account VARCHAR(64) NOT NULL DEFAULT '';
UPDATE game_role SET login_account = account_key;
CREATE UNIQUE INDEX uq_role_account_server ON game_role(login_account, server_id);

CREATE TABLE game_inventory (
    role_id VARCHAR(36) NOT NULL,
    item_id INT NOT NULL,
    quantity BIGINT NOT NULL,
    PRIMARY KEY(role_id, item_id),
    CONSTRAINT fk_inventory_role FOREIGN KEY(role_id) REFERENCES game_role(id),
    CONSTRAINT ck_inventory_quantity CHECK(quantity >= 0)
);
CREATE TABLE game_campaign (
    role_id VARCHAR(36) PRIMARY KEY,
    initialized BOOLEAN NOT NULL DEFAULT FALSE,
    stage_id INT NOT NULL DEFAULT 1,
    role_exp BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT fk_campaign_role FOREIGN KEY(role_id) REFERENCES game_role(id)
);
CREATE TABLE game_battle (
    id VARCHAR(36) PRIMARY KEY,
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    stage_id INT NOT NULL,
    claimed BOOLEAN NOT NULL DEFAULT FALSE,
    snapshot_json TEXT NOT NULL,
    CONSTRAINT uq_battle_request UNIQUE(role_id, request_id),
    CONSTRAINT fk_battle_role FOREIGN KEY(role_id) REFERENCES game_role(id)
);
CREATE INDEX idx_battle_owner_claim ON game_battle(role_id, claimed);
