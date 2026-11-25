/**
 * 任务计数、达成历史和领取回执的持久化入口。
 * 已有可靠领域表的条件直接读取真实事实，领取和计数写入由 QuestService 在角色锁内组织。
 */
package com.funsgamex.mxzg.quest;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class QuestRepository {
    /** 任务表和已接入领域的权威计数查询。 */
    private final JdbcTemplate jdbc;

    /** 原任务指标及配置条件组成的查询键。 */
    record MetricKey(QuestMetric metric, int condition) {}
    /** 单日或累计有效计数，周期 0 表示累计。 */
    record Counter(long period, MetricKey key, long amount) {}
    /** 角色快照中任务规则使用的持久事实。未命名角色与未开户玩法不因默认行而达成事件任务。 */
    record Actor(int level, int arenaScore, int maxPower, long lastLogin) {}
    /** 一笔已提交的领取资格及实际发奖反馈。 */
    record Receipt(String kind, int id, long period, int points, String noticeJson, String noticeHash) {}
    /** 同一角色的某档任务是否已领取及其活跃度。 */
    record Claim(String kind, int id, int points) {}

    /** 使用应用共享连接以参加来源操作与发奖事务。 */
    QuestRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** 读取原角色资料、竞技场积分和已记录的最高战力。 */
    Actor actor(String roleId) {
        return jdbc.queryForObject("""
                SELECT role_level, cup, max_main_power, last_login_at_seconds FROM game_role WHERE id=?
                """, (row, index) -> new Actor(row.getInt(1), row.getInt(2), row.getInt(3), row.getLong(4)), roleId);
    }

    /** 读取当日与累计的补充计数，周期外记录不参与展示。 */
    List<Counter> counters(String roleId, long period) {
        return jdbc.query("""
                SELECT period_end_seconds, metric, condition_value, amount FROM game_quest_counter
                WHERE role_id=? AND (period_end_seconds=0 OR period_end_seconds=?)
                """, (row, index) -> new Counter(row.getLong(1),
                        new MetricKey(QuestMetric.valueOf(row.getString(2)), row.getInt(3)), row.getLong(4)), roleId, period);
    }

    /** 在调用方持有的角色锁内累计本次真实动作。 */
    void increase(String roleId, long period, QuestMetric metric, int condition, long amount) {
        int updated = jdbc.update("""
                UPDATE game_quest_counter SET amount=amount+?
                WHERE role_id=? AND period_end_seconds=? AND metric=? AND condition_value=?
                """, amount, roleId, period, metric.name(), condition);
        if (updated == 0) {
            jdbc.update("""
                    INSERT INTO game_quest_counter(role_id, period_end_seconds, metric, condition_value, amount)
                    VALUES (?, ?, ?, ?, ?)
                    """, roleId, period, metric.name(), condition, amount);
        }
    }

    /** 用现有永久进度保存本服竞技场实际到过的最小正名次，调用方已持有角色锁。 */
    boolean observeArenaRank(String roleId, long rank) {
        Long previous = jdbc.query("""
                SELECT amount FROM game_quest_counter WHERE role_id=? AND period_end_seconds=0
                    AND metric='ARENA_MAX_RANK' AND condition_value=0
                """, rows -> rows.next() ? rows.getLong(1) : null, roleId);
        if (previous == null) {
            increase(roleId, 0, QuestMetric.ARENA_MAX_RANK, 0, rank);
            return true;
        }
        if (previous <= rank) {
            return false;
        }
        jdbc.update("""
                UPDATE game_quest_counter SET amount=? WHERE role_id=? AND period_end_seconds=0
                    AND metric='ARENA_MAX_RANK' AND condition_value=0
                """, rank, roleId);
        return true;
    }

    /** 批量读取当前持有英雄的等级分布，每个等级仅一条，用于多档门槛。 */
    Map<Integer, Long> heroLevels(String roleId) {
        return jdbc.query("""
                SELECT hero_level, COUNT(*) FROM game_hero WHERE role_id=? GROUP BY hero_level
                """, rows -> {
                    Map<Integer, Long> result = new HashMap<>();
                    while (rows.next()) {
                        result.put(rows.getInt(1), rows.getLong(2));
                    }
                    return result;
                }, roleId);
    }

    /** 旧版本已有的竞技场结算按真实结算秒跨上海零点切分。 */
    long arenaChallenges(String roleId, long dayStart, long resetAt) {
        return jdbc.queryForObject("""
                SELECT COUNT(*) FROM game_arena_challenge WHERE role_id=? AND settled_at_seconds>=?
                AND settled_at_seconds<?
                """, Long.class, roleId, dayStart, resetAt);
    }

    /** 原日快速战斗成功回执已经冻结周期，重试不增加次数。 */
    long quickBattles(String roleId, long resetAt) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM game_quick_battle_receipt WHERE role_id=? AND reset_at=?",
                Long.class, roleId, resetAt);
    }

    /** 只统计捐献档位的回执，贡献宝箱不属于新捐献。 */
    long guildDonations(String roleId, long resetAt) {
        return jdbc.queryForObject("""
                SELECT COUNT(*) FROM game_guild_donation_receipt WHERE role_id=? AND reset_at_seconds=? AND reward_slot=0
                """, Long.class, roleId, resetAt);
    }

    /** 累计参与的所有日常副本结算，包含历史金币副本、失败挑战和扫荡。 */
    long dungeonChallenges(String roleId) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM game_daily_dungeon_request WHERE role_id=?", Long.class, roleId);
    }

    /** 当前公会或历史主动离会数据均可证明曾入会，不查询旧角色的私人日志。 */
    boolean hasJoinedGuild(String roleId) {
        return jdbc.queryForObject("""
                SELECT (SELECT COUNT(*) FROM game_guild_member WHERE role_id=?)
                     + (SELECT COUNT(*) FROM game_guild_leave WHERE role_id=?)
                """, Long.class, roleId, roleId) > 0;
    }

    /** 查询曾真实达到的成就，即使英雄数量或竞技场积分后来下降。 */
    Map<Integer, Long> completions(String roleId) {
        return jdbc.query("""
                SELECT quest_id, completed_progress FROM game_quest_achievement WHERE role_id=?
                """, rows -> {
                    Map<Integer, Long> result = new HashMap<>();
                    while (rows.next()) {
                        result.put(rows.getInt(1), rows.getLong(2));
                    }
                    return result;
                }, roleId);
    }

    /** 首次达到成就时冻结历史数值，调用方用角色锁持有一次性资格。 */
    void complete(String roleId, int id, long progress, long now) {
        jdbc.update("""
                INSERT INTO game_quest_achievement(role_id,quest_id,completed_at_seconds,completed_progress)
                VALUES (?, ?, ?, ?)
                """, roleId, id, now, progress);
    }

    /** 取得当前自然日已领取任务及累计成就，用于派生可领资格与活跃分。 */
    List<Claim> claims(String roleId, long period) {
        return jdbc.query("""
                SELECT kind,quest_id,activity_points FROM game_quest_claim
                WHERE role_id=? AND (period_end_seconds=0 OR period_end_seconds=?)
                """, (row, index) -> new Claim(row.getString(1), row.getInt(2), row.getInt(3)), roleId, period);
    }

    /** 查找业务请求的原回执，跨自然日原请求仍可确认历史到账。 */
    Receipt receipt(String roleId, String requestId) {
        return jdbc.query("""
                SELECT kind,quest_id,period_end_seconds,activity_points,notice_json,notice_hash
                FROM game_quest_claim WHERE role_id=? AND request_id=?
                """, (row, index) -> new Receipt(row.getString(1), row.getInt(2), row.getLong(3),
                        row.getInt(4), row.getString(5), row.getString(6)), roleId, requestId)
                .stream().findFirst().orElse(null);
    }

    /** 同一资产事务内保存严格匹配角色、请求、任务及周期的实际到账凭据。 */
    void saveReceipt(String roleId, String requestId, Receipt receipt) {
        jdbc.update("""
                INSERT INTO game_quest_claim(role_id,request_id,kind,quest_id,period_end_seconds,activity_points,
                                             notice_json,notice_hash)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, roleId, requestId, receipt.kind(), receipt.id(), receipt.period(), receipt.points(),
                receipt.noticeJson(), receipt.noticeHash());
    }
}
