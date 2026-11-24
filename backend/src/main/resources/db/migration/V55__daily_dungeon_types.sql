-- 日常副本按类型分别记录胜场与最高通关，原金币记录归入 gold。
CREATE TABLE game_daily_dungeon (
    role_id VARCHAR(36) NOT NULL,
    dungeon_type VARCHAR(16) NOT NULL,
    wins INT NOT NULL,
    highest_cleared INT NOT NULL,
    reset_at_seconds BIGINT NOT NULL,
    PRIMARY KEY (role_id,dungeon_type),
    CONSTRAINT fk_daily_dungeon_role FOREIGN KEY (role_id) REFERENCES game_role(id),
    CONSTRAINT ck_daily_dungeon_progress CHECK (
        wins>=0 AND highest_cleared>=0 AND (wins=0 OR highest_cleared>0) AND reset_at_seconds>0
    )
);

-- 角色内请求编号仍唯一，防止相同命令同时用于两类副本。
CREATE TABLE game_daily_dungeon_request (
    role_id VARCHAR(36) NOT NULL,
    dungeon_type VARCHAR(16) NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    sweep BOOLEAN NOT NULL,
    max_diamonds BIGINT NOT NULL,
    report_bytes LONGBLOB,
    receipt_json LONGTEXT NOT NULL,
    receipt_hash VARCHAR(64) NOT NULL,
    PRIMARY KEY (role_id,request_id),
    CONSTRAINT fk_daily_dungeon_request_progress FOREIGN KEY (role_id,dungeon_type)
        REFERENCES game_daily_dungeon(role_id,dungeon_type),
    CONSTRAINT ck_daily_dungeon_request_mode CHECK (max_diamonds>=0
        AND ((sweep=TRUE AND report_bytes IS NULL) OR (sweep=FALSE AND report_bytes IS NOT NULL)))
);

INSERT INTO game_daily_dungeon(role_id,dungeon_type,wins,highest_cleared,reset_at_seconds)
SELECT role_id,'gold',wins,highest_cleared,reset_at_seconds FROM game_daily_gold;

INSERT INTO game_daily_dungeon_request(role_id,dungeon_type,request_id,sweep,max_diamonds,report_bytes,receipt_json,receipt_hash)
SELECT role_id,'gold',request_id,sweep,max_diamonds,report_bytes,receipt_json,receipt_hash FROM game_daily_gold_request;

DROP TABLE game_daily_gold_request;
DROP TABLE game_daily_gold;
