-- 为区服登记稳定的四位号段，保留现有开发一、二服的旧编号约定。
CREATE TABLE game_role_public_sequence (
    server_id VARCHAR(32) PRIMARY KEY,
    server_code_offset INT NOT NULL AUTO_INCREMENT UNIQUE,
    last_sequence BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT fk_public_sequence_server FOREIGN KEY (server_id) REFERENCES game_server(id),
    CONSTRAINT ck_public_sequence_range CHECK (last_sequence >= 0)
);
INSERT INTO game_role_public_sequence(server_id, server_code_offset)
    SELECT id, 1 FROM game_server WHERE id = 'local-1';
INSERT INTO game_role_public_sequence(server_id, server_code_offset)
    SELECT id, 2 FROM game_server WHERE id = 'local-2';
INSERT INTO game_role_public_sequence(server_id)
    SELECT id FROM game_server WHERE id NOT IN ('local-1', 'local-2') ORDER BY id;

-- 公开编号与现有角色 UUID 一一对应。存量按已知创建时刻依次回填，时间相同按 UUID 排序。
CREATE TABLE game_role_public_number (
    role_id VARCHAR(36) PRIMARY KEY,
    public_id BIGINT NOT NULL UNIQUE,
    CONSTRAINT fk_public_number_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT ck_public_number_positive CHECK (public_id > 0)
);
INSERT INTO game_role_public_number(role_id, public_id)
    SELECT numbered.role_id,
        CASE WHEN numbered.server_code_offset BETWEEN 1 AND 8999 THEN
            CONCAT(1000 + numbered.server_code_offset, LPAD(CONCAT('', numbered.serial_number),
                GREATEST(6, LENGTH(CONCAT('', numbered.serial_number))), '0'))
        END
    FROM (
        SELECT player.id AS role_id, seq.server_code_offset,
            ROW_NUMBER() OVER (PARTITION BY player.server_id ORDER BY
                CASE WHEN player.created_at_seconds = 0 THEN 1 ELSE 0 END, player.created_at_seconds, player.id)
                AS serial_number
        FROM game_role player
        JOIN game_role_public_sequence seq ON seq.server_id = player.server_id
    ) numbered;
UPDATE game_role_public_sequence SET last_sequence = (
    SELECT COUNT(*) FROM game_role player WHERE player.server_id = game_role_public_sequence.server_id
);
