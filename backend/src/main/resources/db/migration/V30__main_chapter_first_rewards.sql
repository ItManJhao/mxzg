-- 独立通关奖励按角色和绝对关卡号保存，原领取结果同时作为权威已领集合。
CREATE TABLE game_main_chapter_first_reward (
    role_id VARCHAR(36) NOT NULL,
    chapter_id INT NOT NULL,
    receipt_id VARCHAR(36) NOT NULL,
    payload_json LONGTEXT NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    PRIMARY KEY (role_id,chapter_id),
    CONSTRAINT uq_main_first_reward_receipt UNIQUE (receipt_id),
    CONSTRAINT fk_main_first_reward_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT ck_main_first_reward_chapter CHECK (chapter_id > 0)
);
