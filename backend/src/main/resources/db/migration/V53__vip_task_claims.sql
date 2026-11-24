-- 每个角色的契约任务只领取一次；同一操作键重试可恢复原回执。
CREATE TABLE game_vip_task_claim (
    role_id VARCHAR(36) NOT NULL,
    task_id INT NOT NULL CHECK (task_id > 0),
    request_id VARCHAR(36) NOT NULL,
    receipt_id VARCHAR(36) NOT NULL UNIQUE,
    asset_revision BIGINT NOT NULL CHECK (asset_revision > 0),
    payload_json LONGTEXT NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    PRIMARY KEY (role_id, task_id),
    CONSTRAINT uq_vip_task_request UNIQUE (role_id, request_id),
    CONSTRAINT fk_vip_task_claim_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);
