-- 公会科技归个人，离会只暂停属性；研究进度和重置次数跨公会保留。
CREATE TABLE game_guild_technology (
    role_id VARCHAR(36) NOT NULL PRIMARY KEY,
    version BIGINT NOT NULL,
    resets_completed INT NOT NULL,
    CONSTRAINT fk_guild_tech_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);

-- 未点亮的职业没有记录，默认第一阶第零格。
CREATE TABLE game_guild_technology_branch (
    role_id VARCHAR(36) NOT NULL,
    profession INT NOT NULL,
    stage INT NOT NULL,
    step INT NOT NULL,
    PRIMARY KEY (role_id, profession),
    CONSTRAINT fk_guild_tech_branch_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);

-- 同一个操作编号只成功一次，保留原确认参数和已提交的科技、资产版本。
CREATE TABLE game_guild_technology_receipt (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    action_type VARCHAR(12) NOT NULL,
    profession INT NOT NULL,
    previous_version BIGINT NOT NULL,
    result_version BIGINT NOT NULL,
    asset_revision BIGINT NOT NULL,
    PRIMARY KEY (role_id, request_id),
    CONSTRAINT fk_guild_tech_receipt_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);
