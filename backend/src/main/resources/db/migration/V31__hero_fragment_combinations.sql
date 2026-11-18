-- 同角色业务键冻结合成参数和实际回执，重复提交不会再次消耗碎片或重新抽样。
CREATE TABLE game_hero_fragment_combination (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    receipt_id VARCHAR(36) NOT NULL,
    payload_json LONGTEXT NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    PRIMARY KEY (role_id,request_id),
    CONSTRAINT uq_hero_fragment_receipt UNIQUE (receipt_id),
    CONSTRAINT fk_hero_fragment_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);
