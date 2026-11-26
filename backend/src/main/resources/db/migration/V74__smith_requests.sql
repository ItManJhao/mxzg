-- 冻结装备锻造的原命令与结算。角色锁串行化同一角色资产，重复请求可读取原回执。
CREATE TABLE game_smith_request (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    item_id INT NOT NULL,
    forge_count INT NOT NULL,
    slot_id INT NOT NULL,
    expected_revision BIGINT NOT NULL,
    receipt_json TEXT NOT NULL,
    PRIMARY KEY (role_id,request_id),
    CONSTRAINT fk_smith_request_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT ck_smith_request CHECK (
        (item_id>0 AND forge_count>0 AND slot_id=0 AND expected_revision=0) OR
        (item_id=0 AND forge_count=0 AND slot_id BETWEEN 1 AND 4 AND expected_revision>=0)
    )
);
