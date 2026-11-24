-- 当前主阵容战力独立于历史最高战力。旧角色待按真实阵容计算，空阵容的实际值为0。
ALTER TABLE game_role ADD COLUMN current_main_power INT NULL;
ALTER TABLE game_role ADD CONSTRAINT ck_role_current_main_power CHECK (current_main_power >= 0);
