-- 扩展 V71 的消息序列。世界频道正文、请求回执和阅读位置沿用原编号。
ALTER TABLE game_world_chat_message RENAME TO game_chat_message;
ALTER TABLE game_world_chat_receipt RENAME TO game_chat_receipt;

ALTER TABLE game_chat_message ADD COLUMN channel_type INT NOT NULL DEFAULT 2;
ALTER TABLE game_chat_message ADD COLUMN room_key VARCHAR(73) NOT NULL DEFAULT '';
ALTER TABLE game_chat_message ADD COLUMN notice_id INT NULL;
ALTER TABLE game_chat_message DROP FOREIGN KEY fk_world_chat_message_sender;
ALTER TABLE game_chat_message MODIFY COLUMN sender_id VARCHAR(36) NULL;
ALTER TABLE game_chat_message ADD CONSTRAINT fk_chat_message_sender FOREIGN KEY (sender_id) REFERENCES game_role(id);
ALTER TABLE game_chat_message MODIFY COLUMN content VARCHAR(512) NOT NULL;
UPDATE game_chat_message SET room_key=server_id;
CREATE INDEX ix_game_chat_room_message ON game_chat_message(channel_type, room_key, id);

ALTER TABLE game_chat_receipt ADD COLUMN channel_type INT NOT NULL DEFAULT 2;
ALTER TABLE game_chat_receipt ADD COLUMN room_key VARCHAR(73) NOT NULL DEFAULT '';
UPDATE game_chat_receipt SET room_key=server_id;

CREATE TABLE game_chat_room (
    channel_type INT NOT NULL,
    room_key VARCHAR(73) NOT NULL,
    PRIMARY KEY (channel_type, room_key)
);
INSERT INTO game_chat_room(channel_type, room_key) SELECT 2,server_id FROM game_world_chat_channel;

CREATE TABLE game_chat_read (
    role_id VARCHAR(36) NOT NULL,
    channel_type INT NOT NULL,
    room_key VARCHAR(73) NOT NULL,
    read_through_id BIGINT NOT NULL,
    PRIMARY KEY (role_id, channel_type, room_key),
    CONSTRAINT fk_chat_read_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);
INSERT INTO game_chat_read(role_id, channel_type, room_key, read_through_id)
    SELECT history.role_id,2,role.server_id,history.read_through_id
    FROM game_world_chat_read history JOIN game_role role ON role.id=history.role_id;

DROP TABLE game_world_chat_read;
DROP TABLE game_world_chat_channel;
