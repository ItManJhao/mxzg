/**
 * 挂机活动权威控制的只读入口：一次查询冻结当前区服的开服时间及16/34/44三项发布状态。
 * 由持有角色锁的输入装配层在现有事务中调用，不读取角色活动记录、不缓存控制或推导开服天数。
 * 不创建活动、推进轮次、清理过期记录或发放资产；缺失控制与明确未发布分别处理。
 */
package com.funsgamex.mxzg.campaign;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.OptionalLong;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IdleActivityService {
    /** 当前挂机奖励链明确依赖的三项活动，顺序同时用于完整性校验与冻结输出。 */
    private static final List<Integer> ACTIVITY_IDS = List.of(16, 34, 44);

    /** 现有事务共享的数据库入口，只执行区服与活动控制的联合只读查询。 */
    private final JdbcTemplate jdbc;

    /** 一次读取的区服权威快照；开服时间未配置时明确为空，不用当前时间补齐。
     * @param serverId 当前角色持久归属的区服标识
     * @param openedAtSeconds 原始开服Unix秒；缺失保留为空，是否阻塞由调用规则决定
     * @param controls 按16、34、44排序的完整不可变控制列表，不接受缺行代替未发布
     */
    public record Snapshot(String serverId, OptionalLong openedAtSeconds, List<Control> controls) {
        /** 冻结控制集合，后续读取或后台维护不会修改本次快照。 */
        public Snapshot {
            controls = List.copyOf(controls);
        }
    }

    /** 一项活动的明确发布状态；未发布时不形成可用于计算的活动期。
     * @param activityId 旧活动类型16、34或44，不是掉落配置行ID
     * @param published true表示权威已发布；false表示持久记录明确未发布
     * @param period 已发布时完整存在，未发布时为空，不能用零值伪造就绪状态
     * @param revision 此控制记录的持久维护版本，至少为1，不是角色资产版本
     */
    public record Control(int activityId, boolean published, Optional<Period> period, long revision) {}

    /** 已发布活动的完整原始控制期，不在读取层判断当前是否开放。
     * @param startSeconds 记录期开始Unix秒，非负
     * @param endSeconds 记录期结束Unix秒，不能早于开始
     * @param clearSeconds 清理期结束Unix秒，不能早于记录期结束
     * @param turns 全局控制轮次；016/034从1开始，044运营控制可为0且不用于掉落选行
     * @param turnsTimeSeconds 当前轮次身份的Unix秒，非负，不由本次时间生成
     * @param limitDays 最低开服天数，非负，本服务不计算实际日数
     */
    public record Period(long startSeconds, long endSeconds, long clearSeconds,
                         int turns, long turnsTimeSeconds, int limitDays) {}

    /** 注入现有持久连接，不装配活动任务、兑换或资产写入服务。 */
    public IdleActivityService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * 在调用者事务内一次读取开服配置和三项控制，缺区服、缺活动行或坏字段时整体拒绝。
     * 不过滤过期或未发布记录，不把空表、缺表或查询失败解释成没有活动。
     * @param serverId 当前角色已验证的持久区服归属，不能由客户端另选区服
     * @return 不可变权威输入；未配置开服时刻保留OptionalLong.empty，不填默认时刻
     */
    @Transactional(propagation = Propagation.MANDATORY, readOnly = true)
    public Snapshot current(String serverId) {
        if (serverId == null || !serverId.matches("[a-z0-9_-]{1,32}")) {
            throw new IllegalArgumentException("挂机活动区服标识无效");
        }
        return jdbc.query("SELECT s.id AS server_id,s.opened_at_seconds,c.activity_id,c.publication_state,"
                        + "c.start_seconds,c.end_seconds,c.clear_seconds,c.turns,c.turns_time,c.limit_days,c.revision "
                        + "FROM game_server s LEFT JOIN game_idle_activity_control c ON c.server_id=s.id "
                        + "WHERE s.id=? ORDER BY c.activity_id",
                rows -> {
                    return readSnapshot(rows, serverId);
                }, serverId);
    }

    /** 解释同一SELECT返回的整组行；三项类型必须恰好齐全，不接纳未知或重复控制。 */
    private Snapshot readSnapshot(ResultSet rows, String serverId) throws SQLException {
        if (!rows.next()) {
            throw new IllegalStateException("挂机活动区服不存在：" + serverId);
        }
        Long openedAt = nullableNonNegative(rows, "opened_at_seconds");
        var controls = new ArrayList<Control>();
        do {
            long activity = rows.getLong("activity_id");
            if (rows.wasNull()) {
                throw new IllegalStateException("挂机活动权威控制缺失：" + serverId);
            }
            if (controls.size() >= ACTIVITY_IDS.size() || activity != ACTIVITY_IDS.get(controls.size())) {
                throw new IllegalStateException("挂机活动控制类型不完整或非法：" + serverId);
            }
            controls.add(readControl(rows, (int) activity));
        } while (rows.next());
        if (controls.size() != ACTIVITY_IDS.size()) {
            throw new IllegalStateException("挂机活动权威控制缺失：" + serverId);
        }
        return new Snapshot(serverId, openedAt == null ? OptionalLong.empty() : OptionalLong.of(openedAt), controls);
    }

    /** 校验原始发布状态及期限，未发布时也拒绝已写入的非法数值，不制造可计算活动期。 */
    private Control readControl(ResultSet rows, int activityId) throws SQLException {
        long state = rows.getLong("publication_state");
        boolean stateMissing = rows.wasNull();
        long revision = rows.getLong("revision");
        boolean revisionMissing = rows.wasNull();
        if (stateMissing || (state != 0 && state != 1) || revisionMissing || revision < 1) {
            throw new IllegalStateException("挂机活动发布状态或版本非法：" + activityId);
        }
        Long start = nullableNonNegative(rows, "start_seconds");
        Long end = nullableNonNegative(rows, "end_seconds");
        Long clear = nullableNonNegative(rows, "clear_seconds");
        Long turns = nullableNonNegative(rows, "turns");
        Long turnsTime = nullableNonNegative(rows, "turns_time");
        Long limitDays = nullableNonNegative(rows, "limit_days");
        if ((start != null && end != null && end < start)
                || (end != null && clear != null && clear < end)
                || (turns != null && turns > Integer.MAX_VALUE)
                || (limitDays != null && limitDays > Integer.MAX_VALUE)) {
            throw new IllegalStateException("挂机活动期限或轮次字段非法：" + activityId);
        }
        if (state == 0) {
            return new Control(activityId, false, Optional.empty(), revision);
        }
        if (start == null || end == null || clear == null || turns == null
                || (activityId != 44 && turns < 1)
                || turnsTime == null || limitDays == null) {
            throw new IllegalStateException("已发布挂机活动控制不完整：" + activityId);
        }
        var period = new Period(start, end, clear, turns.intValue(), turnsTime, limitDays.intValue());
        return new Control(activityId, true, Optional.of(period), revision);
    }

    /** 保留SQL null的缺失含义，并拒绝数据库约束被绕过后的负数；所有时间字段单位为秒。 */
    private Long nullableNonNegative(ResultSet rows, String column) throws SQLException {
        long value = rows.getLong(column);
        if (rows.wasNull()) {
            return null;
        }
        if (value < 0) {
            throw new IllegalStateException("挂机活动持久字段不能为负：" + column);
        }
        return value;
    }
}
