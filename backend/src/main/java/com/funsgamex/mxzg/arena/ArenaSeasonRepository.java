/**
 * 普通竞技场的区服结算、排名与操作回执存储。
 * 区服锁先于角色锁，真实挑战写入的原记录是赛季累计次数唯一来源。
 */
package com.funsgamex.mxzg.arena;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class ArenaSeasonRepository {
    /** 本区开服和下两个结算的 Unix 秒，赛季为 0 表示无可信开服时点。 */
    record Schedule(long openedAt, long dailyEndsAt, long seasonEndsAt) {}

    /** 同区服用于排行和结算的持久角色字段；同分战力、等级和序号稳定排序。 */
    record RankRow(String roleId, String name, int score, int power, int level,
                   int headId, int borderId, int receivedLikes) {}

    /** 同一请求和期次已经提交的各业务动作及原通用反馈。 */
    record Action(String type, long periodEnd, String key, int quantity, String json, String hash) {}

    /** 冻结邮件的唯一投递键。 */
    record PrizeKey(String roleId, String kind, long periodEnd) {}

    /** 含原邮件配置内容、奖励副本及本次可否进入投递。 */
    record Prize(PrizeKey key, String title, String body, String json, String hash, String mailId, long retryAt) {}

    /** 同一角色事务或区服结算事务用的数据库连接。 */
    private final JdbcTemplate jdbc;

    /** 注入共享事务连接。 */
    ArenaSeasonRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** 查找原区服可信开服时间，并先锁区服行，供跨定时器与挑战的串行化。 */
    long lockServer(String serverId) {
        return jdbc.queryForObject("SELECT COALESCE(opened_at_seconds,0) FROM game_server WHERE id=? FOR UPDATE",
                Long.class, serverId);
    }

    /** 只有需要读结算周期时才读区服对应的进度。 */
    Schedule schedule(String serverId) {
        return jdbc.query("""
                SELECT opened_at_seconds,next_daily_end,next_season_end FROM game_arena_schedule WHERE server_id=?
                """, row -> row.next() ? new Schedule(row.getLong(1), row.getLong(2), row.getLong(3)) : null, serverId);
    }

    /** 第一次维护创建记录；之后仅在结算或可信开服时间改变时写进度。 */
    void saveSchedule(String serverId, Schedule old, Schedule latest) {
        if (old == null) {
            jdbc.update("""
                    INSERT INTO game_arena_schedule(server_id,opened_at_seconds,next_daily_end,next_season_end)
                    VALUES (?,?,?,?)
                    """, serverId, latest.openedAt(), latest.dailyEndsAt(), latest.seasonEndsAt());
        } else if (!old.equals(latest)) {
            jdbc.update("""
                    UPDATE game_arena_schedule SET opened_at_seconds=?,next_daily_end=?,next_season_end=? WHERE server_id=?
                    """, latest.openedAt(), latest.dailyEndsAt(), latest.seasonEndsAt(), serverId);
        }
    }

    /** 读取原普通竞技场排名，范围按登录区服隔离。 */
    List<RankRow> ranks(String serverId, int minimumLevel, int count) {
        return jdbc.query("""
                SELECT r.id,r.nickname,r.cup,r.current_main_power,r.role_level,r.head_id,r.border_id,
                    (SELECT COUNT(*) FROM game_arena_season_action a WHERE a.action_type='like' AND a.target_key=r.id) AS likes
                  FROM game_role r LEFT JOIN game_role_public_number n ON r.id=n.role_id
                 WHERE r.server_id=? AND r.role_level>=? AND r.cup>0 AND r.current_main_power>0
                 ORDER BY r.cup DESC,r.current_main_power DESC,r.role_level DESC,n.public_id,r.id LIMIT ?
                """, ArenaSeasonRepository::rankRow, serverId, minimumLevel, count);
    }

    /** 本人榜外时依角色资料照常返回积分，无需插入排行记录。 */
    RankRow own(String roleId) {
        return jdbc.queryForObject("""
                SELECT r.id,r.nickname,r.cup,COALESCE(r.current_main_power,0),r.role_level,r.head_id,r.border_id,
                    (SELECT COUNT(*) FROM game_arena_season_action a WHERE a.action_type='like' AND a.target_key=r.id)
                  FROM game_role r WHERE r.id=?
                """, ArenaSeasonRepository::rankRow, roleId);
    }

    /** 按固定角色顺序读本区所有积分；守锁的赛季维护对该区统一重算。 */
    Map<String, Integer> scores(String serverId) {
        return jdbc.query("SELECT id,cup FROM game_role WHERE server_id=? ORDER BY id",
                (row, index) -> Map.entry(row.getString(1), row.getInt(2)), serverId).stream()
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue,
                        (left, right) -> left, java.util.LinkedHashMap::new));
    }

    /** 主攻胜负都已在挑战表落盘，赛季边界按结算时间左闭右开查累计。 */
    int seasonChallenges(String roleId, long start, long end) {
        return jdbc.queryForObject("""
                SELECT COUNT(*) FROM game_arena_challenge WHERE role_id=? AND settled_at_seconds>=? AND settled_at_seconds<?
                """, Integer.class, roleId, start, end);
    }

    /** 背包无缓存，赛季宝箱和点赞对同一业务目标查询本期实际操作键。 */
    Set<String> used(String roleId, String action, long end) {
        return Set.copyOf(jdbc.queryForList("""
                SELECT target_key FROM game_arena_season_action WHERE role_id=? AND action_type=? AND period_end=?
                """, String.class, roleId, action, end));
    }

    /** 商品换购数量来自成功回执，超过刷新边界即自动读取到新期。 */
    Map<Integer, Integer> purchases(String roleId, long end) {
        return jdbc.query("""
                SELECT target_key,SUM(quantity) FROM game_arena_season_action
                 WHERE role_id=? AND action_type='shop' AND period_end=? GROUP BY target_key
                """, (row, index) -> Map.entry(Integer.parseInt(row.getString(1)), Math.toIntExact(row.getLong(2))),
                roleId, end).stream().collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }

    /** 在角色锁内读取原请求；可按原业务身份恢复明细，不依赖当前期次。 */
    Action action(String roleId, String requestId) {
        return jdbc.query("""
                SELECT action_type,period_end,target_key,quantity,notice_json,notice_hash FROM game_arena_season_action
                 WHERE role_id=? AND request_id=?
                """, row -> row.next() ? new Action(row.getString(1), row.getLong(2), row.getString(3), row.getInt(4),
                    row.getString(5), row.getString(6)) : null, roleId, requestId);
    }

    /** 真实发奖与原操作键一起落库。 */
    void saveAction(String roleId, String requestId, Action action) {
        jdbc.update("""
                INSERT INTO game_arena_season_action(role_id,request_id,action_type,period_end,target_key,
                    quantity,notice_json,notice_hash) VALUES (?,?,?,?,?,?,?,?)
                """, roleId, requestId, action.type(), action.periodEnd(), action.key(), action.quantity(),
                action.json(), action.hash());
    }

    /** 区服结算事务记录已冻结的邮件奖励。 */
    void savePrize(Prize prize) {
        jdbc.update("""
                INSERT INTO game_arena_rank_prize(role_id,prize_kind,period_end,title,body,awards_json,awards_hash)
                VALUES (?,?,?,?,?,?,?)
                """, prize.key().roleId(), prize.key().kind(), prize.key().periodEnd(), prize.title(), prize.body(),
                prize.json(), prize.hash());
    }

    /** 获取当前可投递的一批，已经提交的邮件不会重复进入待投递列表。 */
    List<PrizeKey> pending(long now, int limit) {
        return jdbc.query("""
                SELECT role_id,prize_kind,period_end FROM game_arena_rank_prize
                 WHERE mail_id IS NULL AND retry_at<=? ORDER BY period_end,role_id,prize_kind LIMIT ?
                """, (row, index) -> new PrizeKey(row.getString(1), row.getString(2), row.getLong(3)), now, limit);
    }

    /** 投递动作在行锁内核对是否已被另一实例送信。 */
    Prize lockPrize(PrizeKey key) {
        return jdbc.queryForObject("""
                SELECT title,body,awards_json,awards_hash,mail_id,retry_at FROM game_arena_rank_prize
                 WHERE role_id=? AND prize_kind=? AND period_end=? FOR UPDATE
                """, (row, index) -> new Prize(key, row.getString(1), row.getString(2), row.getString(3),
                    row.getString(4), row.getString(5), row.getLong(6)), key.roleId(), key.kind(), key.periodEnd());
    }

    /** 送信与结算标记同事务提交，重启后也只会有一封邮件。 */
    void markDelivered(PrizeKey key, String mailId) {
        jdbc.update("""
                UPDATE game_arena_rank_prize SET mail_id=? WHERE role_id=? AND prize_kind=? AND period_end=?
                """, mailId, key.roleId(), key.kind(), key.periodEnd());
    }

    /** 满信箱的单个奖励等待下次投递，其他角色与后续期次仍可结算。 */
    void delayPrize(PrizeKey key, long retryAt) {
        jdbc.update("""
                UPDATE game_arena_rank_prize SET retry_at=? WHERE role_id=? AND prize_kind=? AND period_end=?
                    AND mail_id IS NULL AND retry_at<?
                """, retryAt, key.roleId(), key.kind(), key.periodEnd(), retryAt);
    }

    /** 竞技场行的点赞收入是累计次数，展示行自己的已点赞资格另查当前日。 */
    private static RankRow rankRow(ResultSet row, int index) throws SQLException {
        return new RankRow(row.getString(1), row.getString(2), row.getInt(3), row.getInt(4), row.getInt(5),
                row.getInt(6), row.getInt(7), row.getInt(8));
    }
}
