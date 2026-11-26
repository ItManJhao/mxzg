-- 每个角色只保留上次派遣的冻结英雄及其自然日，发奖和覆盖在梦境命令事务内完成。
CREATE TABLE game_dreamland_dispatch (
    role_id VARCHAR(36) NOT NULL PRIMARY KEY,
    reset_at_seconds BIGINT NOT NULL,
    hero_json LONGTEXT NOT NULL,
    CONSTRAINT fk_dreamland_dispatch_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT ck_dreamland_dispatch_day CHECK (reset_at_seconds > 0)
);

-- 选择引用已有派遣行，借用时只锁出战角色，允许好友同时借用对方。
-- 更换助战或跨日时，用冻结的英雄 ID 从梦境阵容移除旧站位。
CREATE TABLE game_dreamland_borrow (
    role_id VARCHAR(36) NOT NULL PRIMARY KEY,
    sender_id VARCHAR(36) NOT NULL,
    hero_id VARCHAR(36) NOT NULL,
    reset_at_seconds BIGINT NOT NULL,
    CONSTRAINT fk_dreamland_borrow_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT fk_dreamland_borrow_sender FOREIGN KEY (sender_id) REFERENCES game_dreamland_dispatch(role_id),
    CONSTRAINT ck_dreamland_borrow_day CHECK (reset_at_seconds > 0 AND role_id <> sender_id)
);
