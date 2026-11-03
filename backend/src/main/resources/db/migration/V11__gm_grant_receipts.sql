CREATE TABLE game_gm_grant (
 role_id VARCHAR(36) NOT NULL, request_id VARCHAR(36) NOT NULL,
 kind VARCHAR(8) NOT NULL, config_id INT NOT NULL, quantity INT NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(role_id, request_id), CONSTRAINT fk_gm_role FOREIGN KEY(role_id) REFERENCES game_role(id)
);
