-- 开发角色等级和主线关卡的请求回执，与状态修改同事务保存。
CREATE TABLE game_gm_adjustment (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    kind VARCHAR(16) NOT NULL,
    target_value INT NOT NULL,
    PRIMARY KEY(role_id, request_id),
    CONSTRAINT fk_gm_adjustment_role FOREIGN KEY(role_id) REFERENCES game_role(id),
    CONSTRAINT ck_gm_adjustment_target CHECK(target_value > 0)
);
