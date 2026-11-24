-- 金币各关共享当日成功次数，首关清扫资格转换为已通过的最高关卡。
ALTER TABLE game_daily_gold ADD COLUMN highest_cleared INT NOT NULL DEFAULT 0;
UPDATE game_daily_gold SET highest_cleared=1 WHERE cleared=TRUE;
ALTER TABLE game_daily_gold DROP CONSTRAINT ck_daily_gold_progress;
ALTER TABLE game_daily_gold DROP COLUMN cleared;
ALTER TABLE game_daily_gold ADD CONSTRAINT ck_daily_gold_progress CHECK (
    wins>=0 AND highest_cleared>=0 AND (wins=0 OR highest_cleared>0) AND reset_at_seconds>0
);
