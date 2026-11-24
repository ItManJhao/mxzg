-- 真实五星发放与名册实例生命周期分开，避免消耗英雄后丢失获得进度。
-- 当前发放及可追溯旧回执使用英雄实例 ID，既有开发发放以原请求 ID 记录批量数量。
CREATE TABLE game_hero_five_star_grant (
    role_id VARCHAR(36) NOT NULL,
    acquisition_key VARCHAR(40) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (role_id, acquisition_key),
    CONSTRAINT fk_five_star_grant_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);

CREATE INDEX idx_hero_star_request_role_star ON game_hero_star_request(role_id, to_star);
