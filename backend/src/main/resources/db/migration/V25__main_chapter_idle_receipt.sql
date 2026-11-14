-- 新主线挂机仅保存成功领取回执；请求键与累计版本双重唯一，和资产/累计在同一事务提交。
CREATE TABLE game_main_chapter_idle_receipt (
    role_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    receipt_id VARCHAR(36) NOT NULL,
    server_id VARCHAR(32) NOT NULL,
    request_format INTEGER NOT NULL,
    request_fingerprint CHAR(64) NOT NULL,
    expected_operation_version BIGINT NOT NULL,
    before_operation_version BIGINT NOT NULL,
    after_operation_version BIGINT NOT NULL,
    committed_at_seconds BIGINT NOT NULL,
    asset_revision BIGINT NOT NULL,
    storage_version INTEGER NOT NULL,
    payload_json LONGTEXT NOT NULL,
    payload_hash CHAR(64) NOT NULL,
    PRIMARY KEY (role_id, request_id),
    CONSTRAINT uk_main_idle_receipt_id UNIQUE (receipt_id),
    CONSTRAINT uk_main_idle_consumed_version UNIQUE (role_id, before_operation_version),
    CONSTRAINT fk_main_idle_receipt_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT ck_main_idle_receipt_versions CHECK (
        expected_operation_version > 0 AND before_operation_version = expected_operation_version
        AND after_operation_version = before_operation_version + 1 AND asset_revision > 0),
    CONSTRAINT ck_main_idle_receipt_format CHECK (request_format > 0 AND storage_version > 0 AND committed_at_seconds >= 0)
);
