-- 旧Role.clergyLevel的真实新角色初值为0，配置0行明确无已解锁神职特权。
-- 独立新版此前未开放神职、未持久化或发放神职等级；既有新版角色按这一已知初值补齐。
-- 这里只保存已解锁等级作为挂机输入，不恢复经验获取、神职升级、充值或奖励接口。
ALTER TABLE game_role ADD COLUMN clergy_level INT NOT NULL DEFAULT 0;
ALTER TABLE game_role ADD CONSTRAINT ck_role_clergy_level CHECK (clergy_level >= 0);
