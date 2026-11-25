-- 上海自然日内每榜只允许点一次。请求幂等键与原发奖回执一起耐久化。
CREATE TABLE game_rank_like (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    board_kind VARCHAR(24) NOT NULL,
    reset_at_seconds BIGINT NOT NULL,
    target_id VARCHAR(36) NOT NULL,
    notice_json LONGTEXT NOT NULL,
    notice_hash VARCHAR(64) NOT NULL,
    PRIMARY KEY (role_id, request_id),
    CONSTRAINT uq_rank_like_day UNIQUE (role_id, reset_at_seconds, board_kind),
    CONSTRAINT fk_rank_like_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT ck_rank_like_period CHECK (reset_at_seconds > 0)
);
