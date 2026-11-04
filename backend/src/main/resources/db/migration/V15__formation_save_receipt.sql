-- 主线保存回执与阵容同事务，防止断线后重复提交或复用请求ID修改参数。
CREATE TABLE game_formation_save (
 role_id VARCHAR(36) NOT NULL,
 request_id VARCHAR(36) NOT NULL,
 payload_hash VARCHAR(64) NOT NULL,
 result_version BIGINT NOT NULL,
 PRIMARY KEY(role_id, request_id),
 CONSTRAINT fk_formation_save_role FOREIGN KEY(role_id) REFERENCES game_role(id),
 CONSTRAINT ck_formation_save_version CHECK(result_version >= 0)
);
