-- 进化只读持久状态；历史英雄明确未进化，不创建养成操作。
ALTER TABLE game_hero ADD COLUMN evolve_type INT NOT NULL DEFAULT 0;
ALTER TABLE game_hero ADD COLUMN evolve_level INT NOT NULL DEFAULT 0;
ALTER TABLE game_hero ADD CONSTRAINT ck_hero_evolution CHECK (
    (evolve_type = 0 AND evolve_level = 0) OR (evolve_type > 0 AND evolve_level > 0)
);
