-- 系统信箱按收件角色归属；客户端仅能读、领和删除自己的邮件。
CREATE TABLE game_mail (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    role_id VARCHAR(36) NOT NULL,
    title VARCHAR(96) NOT NULL,
    content TEXT NOT NULL,
    created_at_seconds BIGINT NOT NULL,
    is_read BOOLEAN NOT NULL,
    is_claimed BOOLEAN NOT NULL,
    attachment_count INT NOT NULL,
    attachments_json TEXT NOT NULL,
    CONSTRAINT fk_mail_recipient FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT ck_mail_time CHECK (created_at_seconds >= 0),
    CONSTRAINT ck_mail_attachment_count CHECK (attachment_count BETWEEN 0 AND 30)
);

CREATE INDEX ix_mail_role_time ON game_mail(role_id, created_at_seconds, id);

-- 冻结领奖实际回执，删掉邮件之后仍可处理已结算请求的重试。
CREATE TABLE game_mail_request (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    action VARCHAR(24) NOT NULL,
    mail_id VARCHAR(36),
    notice_json LONGTEXT,
    notice_hash VARCHAR(64),
    PRIMARY KEY (role_id, request_id),
    CONSTRAINT fk_mail_request_recipient FOREIGN KEY (role_id) REFERENCES game_role(id)
);
