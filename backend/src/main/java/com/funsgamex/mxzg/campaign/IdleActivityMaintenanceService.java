/**
 * 挂机活动区服控制维护：显式初始化真实开服时间，并按旧边界单步推进持久周期。
 * 每次先锁区服行，再维护三控制；与只读IdleActivityService共享唯一持久数据，不缓存状态。
 * 不调角色活动重置、任务或资产清理，不开放兑换、领取、快速战斗或其他活动页面。
 */
package com.funsgamex.mxzg.campaign;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.OptionalLong;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
public class IdleActivityMaintenanceService {
    /** 区服控制固定写入顺序，与只读快照一致，避免并发维护采用不同锁顺序。 */
    private static final List<Integer> ACTIVITY_IDS = List.of(16, 34, 44);
    /** 现有数据库入口；所有维护在调用方法的同一事务中完成。 */
    private final JdbcTemplate jdbc;
    /** 唯一只读控制映射，用于维护前校验及维护后返回不可变快照。 */
    private final IdleActivityService reader;
    /** 已核实的初始化和单步周期计算，不包含角色或控制持久状态。 */
    private final IdleActivityControlRules schedules;
    /** 活动掉落规则；新期开启前要求该真实轮次可用，不以空奖励覆盖配置缺口。 */
    private final IdleActivityRules drops;
    /** 仅用于可信运营配置规范化及摘要，不解析玩家提交或在本服务发送协议。 */
    private final ObjectMapper json;

    /** 044可信发布意图的持久元数据，不用控制revision代替配置版本。
     * @param version 单调递增的运营配置版本，0表示尚未应用发布配置
     * @param fingerprint 同版本内容校验摘要，版本0为空
     * @param configJson 已验证的规范兑换配置，版本0为空；不是角色兑换进度
     */
    private record PublicationState(long version, String fingerprint, String configJson) {}

    /** 注入唯一持久连接、只读映射及两类纯规则，不装配资产和角色活动服务。 */
    public IdleActivityMaintenanceService(JdbcTemplate jdbc, IdleActivityService reader,
                                           IdleActivityControlRules schedules, IdleActivityRules drops,
                                           ObjectMapper json) {
        this.jdbc = jdbc;
        this.reader = reader;
        this.schedules = schedules;
        this.drops = drops;
        this.json = json;
    }

    /**
     * 同一服的开服初始化与可选044发布在一个事务中应用；发布失败不留下半份初始化。
     * 未配置044只保留既有发布，不把省略配置解释为撤销活动；重启不会重置已推进的期次。
     */
    @Transactional
    public IdleActivityService.Snapshot configure(String serverId, long openedAtSeconds,
                                                   Optional<IdleActivityPublicationUtils.Publication> publication,
                                                   long nowSeconds) {
        if (publication == null || nowSeconds < 0) {
            throw new IllegalArgumentException("活动维护配置或服务器时间缺失");
        }
        initialize(serverId, openedAtSeconds);
        if (publication.isPresent()) {
            return publish044(serverId, publication.orElseThrow(), nowSeconds);
        }
        return reader.current(serverId);
    }

    /**
     * 发布或修订044控制，保存非空兑换配置但不开放兑换、回收或领取。
     * 版本属于运营配置意图：同版本同内容幂等、同版本异内容及旧版本拒绝；它不是控制revision。
     * @param nowSeconds 可信入口本次统一捕获的Unix秒，用于旧活动进行中的开始时间限制
     */
    @Transactional
    public IdleActivityService.Snapshot publish044(String serverId,
                                                   IdleActivityPublicationUtils.Publication publication,
                                                   long nowSeconds) {
        if (nowSeconds < 0) {
            throw new IllegalArgumentException("活动发布服务器时间不能为负");
        }
        var encoded = IdleActivityPublicationUtils.encode(json, publication);
        var openedAt = lockServer(serverId);
        if (openedAt.isEmpty()) {
            throw new IllegalStateException("活动发布缺少真实开服时间");
        }
        if (IdleActivityPublicationUtils.publicationOpenDay(publication.startSeconds(), openedAt.getAsLong()) > 99_999) {
            throw new IllegalArgumentException("044发布日期不在旧兑换配置的开服日范围内");
        }
        var current = reader.current(serverId);
        validateNextStarts(current, nextStarts(serverId));
        var control = current.controls().get(2);
        var metadata = publicationState(serverId);
        long version = metadata.version();
        String fingerprint = metadata.fingerprint();
        if (publication.version() < version) {
            throw new IllegalStateException("044发布配置版本过期");
        }
        if (publication.version() == version) {
            if (!encoded.fingerprint().equals(fingerprint)
                    || !encoded.configJson().equals(metadata.configJson())) {
                throw new IllegalStateException("044同版本发布内容不一致");
            }
            return current;
        }
        if (control.published()) {
            var previous = control.period().orElseThrow();
            if (nowSeconds >= previous.startSeconds() && nowSeconds <= previous.clearSeconds()
                    && publication.startSeconds() > previous.startSeconds()) {
                throw new IllegalStateException("044仍在进行中，不能将开始时间向后移动");
            }
            boolean samePayload = encoded.fingerprint().equals(fingerprint);
            if (samePayload) {
                // 只确认新配置版本；控制与已消费的next标记原样保留，不把同内容当成新期。
                int updated = jdbc.update("UPDATE game_idle_activity_control SET publication_version=? "
                                + "WHERE server_id=? AND activity_id=44 AND publication_version=? AND revision=?",
                        publication.version(), serverId, version, control.revision());
                requireUpdated(updated);
                return current;
            }
        }
        drops.selectedDrop(44, 0);
        long revision = Math.addExact(control.revision(), 1);
        long turnsTime = control.period().map(IdleActivityService.Period::turnsTimeSeconds).orElse(0L);
        int turns = control.period().map(IdleActivityService.Period::turns).orElse(0);
        int updated = jdbc.update("UPDATE game_idle_activity_control SET publication_state=1,start_seconds=?,"
                        + "end_seconds=?,clear_seconds=?,limit_days=?,turns=?,turns_time=?,next_start_seconds=?,"
                        + "publication_version=?,publication_fingerprint=?,publication_config=?,revision=? "
                        + "WHERE server_id=? AND activity_id=44 AND revision=? AND publication_version=?",
                publication.startSeconds(), publication.endSeconds(), publication.clearSeconds(),
                publication.limitDays(), turns, turnsTime, publication.startSeconds(), publication.version(),
                encoded.fingerprint(), encoded.configJson(), revision, serverId, control.revision(), version);
        requireUpdated(updated);
        return reader.current(serverId);
    }

    /** 以字符串读取TEXT配置并检查元数据齐全，缺失或损坏不能误判为已幂等发布。 */
    private PublicationState publicationState(String serverId) {
        return jdbc.queryForObject("SELECT publication_version,publication_fingerprint,publication_config "
                        + "FROM game_idle_activity_control WHERE server_id=? AND activity_id=44", (row, index) -> {
                    long version = row.getLong("publication_version");
                    boolean missingVersion = row.wasNull();
                    String fingerprint = row.getString("publication_fingerprint");
                    String config = row.getString("publication_config");
                    if (missingVersion || version < 0
                            || (version == 0 && (fingerprint != null || config != null))
                            || (version > 0 && (fingerprint == null || fingerprint.length() != 64
                                    || config == null || config.isBlank()))) {
                        throw new IllegalStateException("044发布版本或规范配置损坏");
                    }
                    return new PublicationState(version, fingerprint, config);
                }, serverId);
    }

    /**
     * 显式保存真实开服Unix秒，并只为缺失的16/34创建首期、44创建明确未发布记录。
     * 相同时间重试不重置旧期，不同已保存时间拒绝；任何缺配置或坏旧记录使全部写入回滚。
     * @param serverId 已存在的独立区服，不在本入口创建区服或改变角色归属
     * @param openedAtSeconds 负责人或受控维护入口明确传入的真实开服Unix秒，不能默认当前时间
     */
    @Transactional
    public IdleActivityService.Snapshot initialize(String serverId, long openedAtSeconds) {
        if (openedAtSeconds < 0) {
            throw new IllegalArgumentException("活动初始化开服时间不能为负");
        }
        var opened = lockServer(serverId);
        if (opened.isPresent() && opened.getAsLong() != openedAtSeconds) {
            throw new IllegalStateException("区服开服时间已配置，不能通过活动初始化重置");
        }
        if (opened.isEmpty()) {
            jdbc.update("UPDATE game_server SET opened_at_seconds=? WHERE id=?", openedAtSeconds, serverId);
        }
        var nextStarts = nextStarts(serverId);
        for (int activityId : ACTIVITY_IDS) {
            if (nextStarts.containsKey(activityId)) {
                continue;
            }
            if (activityId == 44) {
                jdbc.update("INSERT INTO game_idle_activity_control(server_id,activity_id,publication_state,revision) "
                        + "VALUES (?,44,0,1)", serverId);
                nextStarts.put(44, OptionalLong.empty());
            } else {
                var timing = schedules.initial(activityId, openedAtSeconds);
                drops.selectedDrop(activityId, timing.period().turns());
                insertPeriod(serverId, activityId, timing);
                nextStarts.put(activityId, OptionalLong.of(timing.nextStartSeconds()));
            }
        }
        var result = reader.current(serverId);
        validateNextStarts(result, nextStarts);
        return result;
    }

    /**
     * 锁定当前区服并维护完整现存控制；每项循环活动每次最多推进一期，不补缺行或开服时刻。
     * 044只消费已发布开始标记，严格now大于start才更新；不更改其运营轮次或执行清理。
     * @param nowSeconds 本次维护统一捕获的服务器Unix秒，不在各活动中重新读取时钟
     */
    @Transactional
    public IdleActivityService.Snapshot maintain(String serverId, long nowSeconds) {
        if (nowSeconds < 0) {
            throw new IllegalArgumentException("活动维护服务器时间不能为负");
        }
        if (lockServer(serverId).isEmpty()) {
            throw new IllegalStateException("活动维护缺少真实开服时间，不能推断当前时间");
        }
        var current = reader.current(serverId);
        var nextStarts = nextStarts(serverId);
        validateNextStarts(current, nextStarts);
        for (var control : current.controls()) {
            if (!control.published()) {
                continue;
            }
            var period = control.period().orElseThrow();
            var next = nextStarts.get(control.activityId());
            if (control.activityId() == 44) {
                if (next.isPresent() && nowSeconds > next.getAsLong()) {
                    long revision = Math.addExact(control.revision(), 1);
                    int updated = jdbc.update("UPDATE game_idle_activity_control SET turns_time=start_seconds,"
                                    + "next_start_seconds=NULL,revision=? WHERE server_id=? AND activity_id=44 "
                                    + "AND revision=? AND publication_state=1",
                            revision, serverId, control.revision());
                    requireUpdated(updated);
                }
                continue;
            }
            var advanced = schedules.advance(control.activityId(), period, next.orElseThrow(), nowSeconds);
            if (advanced.isPresent()) {
                var timing = advanced.orElseThrow();
                drops.selectedDrop(control.activityId(), timing.period().turns());
                updatePeriod(serverId, control, timing);
            }
        }
        return reader.current(serverId);
    }

    /** 锁定真实区服行，串行保护缺行初始化、周期维护及后续同服发布，不依赖进程内锁。 */
    private OptionalLong lockServer(String serverId) {
        if (serverId == null || !serverId.matches("[a-z0-9_-]{1,32}")) {
            throw new IllegalArgumentException("活动维护区服标识无效");
        }
        var rows = jdbc.query("SELECT opened_at_seconds FROM game_server WHERE id=? FOR UPDATE", (row, index) -> {
            long openedAt = row.getLong("opened_at_seconds");
            if (row.wasNull()) {
                return OptionalLong.empty();
            }
            if (openedAt < 0) {
                throw new IllegalStateException("区服持久开服时间不能为负");
            }
            return OptionalLong.of(openedAt);
        }, serverId);
        if (rows.isEmpty()) {
            throw new IllegalStateException("活动维护区服不存在：" + serverId);
        }
        return rows.getFirst();
    }

    /** 在区服锁内按固定顺序读取并锁定当前调度点，保留NULL含义，不能猜测旧期次时间。 */
    private Map<Integer, OptionalLong> nextStarts(String serverId) {
        var result = new HashMap<Integer, OptionalLong>();
        jdbc.query("SELECT activity_id,next_start_seconds FROM game_idle_activity_control "
                        + "WHERE server_id=? ORDER BY activity_id FOR UPDATE", row -> {
                    int activityId = row.getInt("activity_id");
                    long next = row.getLong("next_start_seconds");
                    boolean missing = row.wasNull();
                    if (!ACTIVITY_IDS.contains(activityId) || result.containsKey(activityId) || (!missing && next < 0)) {
                        throw new IllegalStateException("活动持久调度点非法");
                    }
                    result.put(activityId, missing ? OptionalLong.empty() : OptionalLong.of(next));
                }, serverId);
        return result;
    }

    /** 只校验完整已发布控制的调度边界，未发布记录保留原样，不自动重开。 */
    private void validateNextStarts(IdleActivityService.Snapshot snapshot, Map<Integer, OptionalLong> nextStarts) {
        for (var control : snapshot.controls()) {
            if (!control.published()) {
                continue;
            }
            var next = nextStarts.get(control.activityId());
            var period = control.period().orElseThrow();
            if (next == null || (control.activityId() != 44 && next.isEmpty())
                    || (control.activityId() != 44 && next.isPresent() && next.getAsLong() < period.clearSeconds())
                    || (control.activityId() == 44 && next.isPresent() && next.getAsLong() != period.startSeconds())) {
                throw new IllegalStateException("已发布活动缺少可信调度点或开始标记非法");
            }
        }
    }

    /** 将已核实首期和调度点一起插入，revision从1开始，不调用角色初始化或清理钩子。 */
    private void insertPeriod(String serverId, int activityId, IdleActivityControlRules.Timing timing) {
        var period = timing.period();
        jdbc.update("INSERT INTO game_idle_activity_control(server_id,activity_id,publication_state,start_seconds,"
                        + "end_seconds,clear_seconds,turns,turns_time,limit_days,revision,next_start_seconds) "
                        + "VALUES (?,?,1,?,?,?,?,?,?,1,?)",
                serverId, activityId, period.startSeconds(), period.endSeconds(), period.clearSeconds(),
                period.turns(), period.turnsTimeSeconds(), period.limitDays(), timing.nextStartSeconds());
    }

    /** 原子保存单步推进后的所有控制字段；并发版本改变或数量异常时拒绝整次事务。 */
    private void updatePeriod(String serverId, IdleActivityService.Control previous, IdleActivityControlRules.Timing timing) {
        var period = timing.period();
        long revision = Math.addExact(previous.revision(), 1);
        int updated = jdbc.update("UPDATE game_idle_activity_control SET start_seconds=?,end_seconds=?,clear_seconds=?,"
                        + "turns=?,turns_time=?,limit_days=?,next_start_seconds=?,revision=? "
                        + "WHERE server_id=? AND activity_id=? AND revision=? AND publication_state=1",
                period.startSeconds(), period.endSeconds(), period.clearSeconds(), period.turns(),
                period.turnsTimeSeconds(), period.limitDays(), timing.nextStartSeconds(), revision,
                serverId, previous.activityId(), previous.revision());
        requireUpdated(updated);
    }

    /** 写入必须恰好命中一项已锁控制；不把竞争更新或缺行当作维护成功。 */
    private void requireUpdated(int updated) {
        if (updated != 1) {
            throw new IllegalStateException("活动控制版本已变化，维护未提交");
        }
    }
}
