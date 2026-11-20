-- 贵重标记按旧版默认显示，可由角色本人独立关闭。
ALTER TABLE game_role ADD COLUMN peerage_chat_visible BOOLEAN NOT NULL DEFAULT TRUE;

-- 免费头像框由配置派生，激活头像框单独保存所获配置与期限。
CREATE TABLE game_role_border (
    role_id VARCHAR(36) NOT NULL,
    border_id INT NOT NULL,
    expires_at_seconds BIGINT NOT NULL,
    PRIMARY KEY (role_id, border_id),
    CONSTRAINT fk_role_border_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT ck_role_border_values CHECK (border_id > 0 AND (expires_at_seconds = -1 OR expires_at_seconds > 0))
);
