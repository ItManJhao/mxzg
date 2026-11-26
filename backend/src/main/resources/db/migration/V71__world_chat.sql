-- 每服世界频道独立串行发布，保证同区消息游标和提交顺序一致。
CREATE TABLE game_world_chat_channel (
    server_id VARCHAR(32) NOT NULL PRIMARY KEY,
    CONSTRAINT fk_world_chat_channel_server FOREIGN KEY (server_id) REFERENCES game_server(id)
);

CREATE TABLE game_world_chat_message (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    server_id VARCHAR(32) NOT NULL,
    sender_id VARCHAR(36) NOT NULL,
    sender_name VARCHAR(64) NOT NULL,
    avatar_id INT NOT NULL,
    border_id INT NOT NULL,
    sender_level INT NOT NULL,
    content VARCHAR(102) NOT NULL,
    sent_at_seconds BIGINT NOT NULL,
    CONSTRAINT fk_world_chat_message_server FOREIGN KEY (server_id) REFERENCES game_server(id),
    CONSTRAINT fk_world_chat_message_sender FOREIGN KEY (sender_id) REFERENCES game_role(id)
);
CREATE INDEX ix_world_chat_server_id ON game_world_chat_message(server_id, id);

-- 聊天正文仅保留最近 100 条。保留编号及摘要，旧请求重试时不会重新发布过期消息。
CREATE TABLE game_world_chat_receipt (
    message_id BIGINT NOT NULL PRIMARY KEY,
    server_id VARCHAR(32) NOT NULL,
    sender_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    sent_at_seconds BIGINT NOT NULL,
    CONSTRAINT fk_world_chat_receipt_sender FOREIGN KEY (sender_id) REFERENCES game_role(id),
    CONSTRAINT uq_world_chat_receipt_request UNIQUE (sender_id, request_id)
);
CREATE INDEX ix_world_chat_receipt_sender_id ON game_world_chat_receipt(sender_id, message_id);

CREATE TABLE game_world_chat_read (
    role_id VARCHAR(36) NOT NULL PRIMARY KEY,
    read_through_id BIGINT NOT NULL,
    CONSTRAINT fk_world_chat_read_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);
