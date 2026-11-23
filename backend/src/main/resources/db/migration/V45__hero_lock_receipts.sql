-- 保存英雄锁定或解锁的原操作，防止后到的重复请求覆盖后来设置的状态。
CREATE TABLE game_hero_lock_request (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    hero_id VARCHAR(36) NOT NULL,
    locked BOOLEAN NOT NULL,
    asset_revision BIGINT NOT NULL,
    PRIMARY KEY (role_id, request_id),
    CONSTRAINT fk_hero_lock_request_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);
