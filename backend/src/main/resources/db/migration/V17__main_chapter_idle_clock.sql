-- 新主线挂机计时与旧简化game_idle隔离；查询不发奖，首次通关后的统一快照初始化。
CREATE TABLE game_main_chapter_idle (
    role_id VARCHAR(36) PRIMARY KEY,
    started_at BIGINT NOT NULL,
    CONSTRAINT fk_main_chapter_idle_role FOREIGN KEY (role_id) REFERENCES game_role(id)
);
