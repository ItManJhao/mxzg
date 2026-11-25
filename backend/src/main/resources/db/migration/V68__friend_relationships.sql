-- 好友关系双向成对写入。请求及黑名单保留方向，角色 ID 一律沿用持久 UUID。
CREATE TABLE game_friend_relation (
    role_id VARCHAR(36) NOT NULL,
    target_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (role_id, target_id),
    CONSTRAINT fk_friend_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT fk_friend_target FOREIGN KEY (target_id) REFERENCES game_role(id),
    CONSTRAINT ck_friend_not_self CHECK (role_id <> target_id)
);

CREATE TABLE game_friend_application (
    recipient_id VARCHAR(36) NOT NULL,
    requester_id VARCHAR(36) NOT NULL,
    created_at_seconds BIGINT NOT NULL,
    PRIMARY KEY (recipient_id, requester_id),
    CONSTRAINT fk_friend_requester FOREIGN KEY (requester_id) REFERENCES game_role(id),
    CONSTRAINT fk_friend_recipient FOREIGN KEY (recipient_id) REFERENCES game_role(id),
    CONSTRAINT ck_friend_request_not_self CHECK (recipient_id <> requester_id)
);

CREATE TABLE game_friend_block (
    role_id VARCHAR(36) NOT NULL,
    target_id VARCHAR(36) NOT NULL,
    created_at_seconds BIGINT NOT NULL,
    PRIMARY KEY (role_id, target_id),
    CONSTRAINT fk_friend_block_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT fk_friend_block_target FOREIGN KEY (target_id) REFERENCES game_role(id),
    CONSTRAINT ck_friend_block_not_self CHECK (role_id <> target_id)
);

-- 同一期次不能给同一个好友重复赠送。取消关系时保留已用次数和历史领取次数。
CREATE TABLE game_friend_gift (
    sender_id VARCHAR(36) NOT NULL,
    recipient_id VARCHAR(36) NOT NULL,
    reset_at_seconds BIGINT NOT NULL,
    delivered BOOLEAN NOT NULL,
    claimed BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (sender_id, reset_at_seconds, recipient_id),
    CONSTRAINT fk_friend_gift_sender FOREIGN KEY (sender_id) REFERENCES game_role(id),
    CONSTRAINT fk_friend_gift_recipient FOREIGN KEY (recipient_id) REFERENCES game_role(id),
    CONSTRAINT ck_friend_gift_day CHECK (reset_at_seconds > 0 AND sender_id <> recipient_id)
);
CREATE INDEX ix_friend_received_day ON game_friend_gift(recipient_id, reset_at_seconds);

-- 同业务编号重试返回原奖励反馈。当日与永久操作用同一幂等入口。
CREATE TABLE game_friend_change (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    action VARCHAR(24) NOT NULL,
    target_id VARCHAR(36),
    reset_at_seconds BIGINT NOT NULL,
    notice_json LONGTEXT,
    notice_hash VARCHAR(64),
    PRIMARY KEY (role_id, request_id),
    CONSTRAINT fk_friend_change_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT ck_friend_change_record CHECK (reset_at_seconds >= 0 AND
        ((notice_json IS NULL AND notice_hash IS NULL) OR (notice_json IS NOT NULL AND notice_hash IS NOT NULL)))
);
