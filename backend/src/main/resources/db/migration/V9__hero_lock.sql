-- 英雄自身锁定；只增加持久字段，不发放英雄或开放锁定操作。
ALTER TABLE game_hero ADD COLUMN is_locked BOOLEAN NOT NULL DEFAULT FALSE;
