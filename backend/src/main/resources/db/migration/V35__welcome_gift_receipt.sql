-- 每角色只保存一笔新手赠礼回执。状态快照从回执是否存在判断领取结果。
CREATE TABLE game_role_welcome_gift (
    role_id VARCHAR(36) PRIMARY KEY,
    receipt_id VARCHAR(36) NOT NULL UNIQUE,
    payload_json LONGTEXT NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    CONSTRAINT fk_role_welcome_gift_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);
