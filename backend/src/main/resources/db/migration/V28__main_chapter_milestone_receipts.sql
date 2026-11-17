-- 每角色每原配置ID只发一次；已领集合仍使用V27，不按最大值推断顺序。
-- 成功回执保存原实际发放及新英雄实例，恢复不重新创建英雄或依据当前配置补奖。
CREATE TABLE game_main_chapter_milestone_receipt (
    role_id VARCHAR(36) NOT NULL,
    reward_id INT NOT NULL,
    receipt_id VARCHAR(36) NOT NULL,
    asset_revision BIGINT NOT NULL,
    payload_json LONGTEXT NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    PRIMARY KEY (role_id, reward_id),
    CONSTRAINT uq_main_milestone_receipt UNIQUE (receipt_id),
    CONSTRAINT fk_main_milestone_receipt_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT ck_main_milestone_receipt_id CHECK (reward_id > 0),
    CONSTRAINT ck_main_milestone_receipt_revision CHECK (asset_revision > 0)
);
