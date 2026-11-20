-- 赠礼资格取首次命名来源。历史角色二次改名时会写入昵称唯一键，不能因此取得新手赠礼。
ALTER TABLE game_role ADD COLUMN welcome_gift_eligible BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE game_role SET welcome_gift_eligible = TRUE WHERE first_named = TRUE AND claimed_nickname IS NOT NULL;

-- 形象由角色历史图鉴最高星级解锁，存量只登记有持久英雄实例可以证明的进度。
CREATE TABLE game_hero_illustration (
    role_id VARCHAR(36) NOT NULL,
    template_id INT NOT NULL,
    max_star INT NOT NULL,
    PRIMARY KEY (role_id, template_id),
    CONSTRAINT fk_hero_illustration_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT ck_hero_illustration_values CHECK (template_id > 0 AND max_star > 0)
);
INSERT INTO game_hero_illustration(role_id, template_id, max_star)
SELECT role_id, template_id, MAX(star) FROM game_hero GROUP BY role_id, template_id;

-- 沿用旧称号期限：-1 为永久，0 为已回收，正数为到期的服务器 Unix 秒。
CREATE TABLE game_role_title (
    role_id VARCHAR(36) NOT NULL,
    title_id INT NOT NULL,
    end_time_seconds BIGINT NOT NULL,
    PRIMARY KEY (role_id, title_id),
    CONSTRAINT fk_role_title_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT ck_role_title_values CHECK (title_id > 0 AND end_time_seconds >= -1)
);
