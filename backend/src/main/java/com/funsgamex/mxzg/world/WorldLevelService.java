/**
 * 各区服世界等级的只读快照：从已提交角色等级选取前若干名平均，首次使用及每五分钟刷新。
 * 后续挂机输入装配读取本服务的一份不可变快照，不从客户端接收世界等级，不写角色或发奖。
 * 数据库读取使用独立事务，成功提交后才发布缓存，避免外层奖励事务回滚后留下未提交等级。
 */
package com.funsgamex.mxzg.world;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

@Service
public class WorldLevelService {
    /** 世界等级模块日志；后台刷新失败携带区服与原因，不能静默当作空服。 */
    private static final Logger LOG = LoggerFactory.getLogger(WorldLevelService.class);

    /** 旧世界等级刷新间隔，单位毫秒；初始延迟相同，首次实际读取仍会立即计算。 */
    private static final long REFRESH_MILLIS = 300_000;

    /** 当前角色表的唯一数据源，只执行带区服条件的查询，不维护另一份角色数据。 */
    private final JdbcTemplate jdbc;

    /** 每次统计使用独立的只读已提交事务，外层角色事务会暂时挂起。 */
    private final TransactionTemplate readTransaction;

    /** system.world_level_people配置的前列人数，启动校验为正数，当前原表为50。 */
    private final int sampleLimit;

    /** 区服到最后成功快照；null表示刷新失败已失效，保留键供定时重试，所有访问由本实例同步。 */
    private final Map<String, Snapshot> snapshots = new HashMap<>();

    /** 本进程成功发布快照的代次，刷新失败不递增；不是资产持久revision，也不跨进程或重启唯一。 */
    private long generation;

    /** 一次完整统计的不可变结果，读取后不会随着后台刷新改变。
     * @param serverId 已确认的独立区服标识，合服共享范围尚未接入
     * @param level 前列角色平均等级截断后的整数，只有真实空集合返回1
     * @param sampledRoles 实际参与平均的人数，不足配置人数时不补分母
     * @param computedAtSeconds 数据库读取成功提交后的服务器Unix秒
     * @param generation 本服务进程内的成功发布代次，不是持久资产版本
     */
    public record Snapshot(String serverId, int level, int sampledRoles, long computedAtSeconds, long generation) {}

    /** 注入共享持久连接与事务管理，读取唯一system配置；缺失或非法配置拒绝启动。 */
    public WorldLevelService(JdbcTemplate jdbc, PlatformTransactionManager transactions, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.readTransaction = new TransactionTemplate(transactions);
        this.readTransaction.setName("world-level-snapshot");
        this.readTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        this.readTransaction.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        this.readTransaction.setReadOnly(true);
        this.sampleLimit = readSampleLimit(mapper);
    }

    /**
     * 返回本区当前快照；首次或已失效时立即重算，失败直接抛出，不能返回默认等级或旧代次假成功。
     * 本次调用拿到的对象保持不变，后续计算须复用该对象，不逐奖励项重新读取。
     */
    public synchronized Snapshot current(String serverId) {
        if (serverId == null || !serverId.matches("[a-z0-9_-]{1,32}")) {
            throw new IllegalArgumentException("世界等级区服标识无效");
        }
        var current = snapshots.get(serverId);
        if (current != null) {
            return current;
        }
        // 保留已请求区服，即使首次读取失败，后台仍会继续尝试，null不代表空服。
        snapshots.put(serverId, null);
        var calculated = calculate(serverId);
        snapshots.put(serverId, calculated);
        return calculated;
    }

    /**
     * 每五分钟刷新已使用过的区服；某区失败时仅失效该区并记录原因，其余区继续刷新。
     * 不因角色写入立即清缓存，不向客户端推送，也不增加资产revision。
     */
    @Scheduled(fixedDelay = REFRESH_MILLIS, initialDelay = REFRESH_MILLIS)
    public synchronized void refreshKnownServers() {
        for (var serverId : new ArrayList<>(snapshots.keySet())) {
            try {
                snapshots.put(serverId, calculate(serverId));
            } catch (RuntimeException error) {
                snapshots.put(serverId, null);
                LOG.warn("世界等级快照刷新失败，区服={}；快照已失效，下次读取将重试", serverId, error);
            }
        }
    }

    /** 在独立事务读取已提交等级，成功提交后才形成可发布快照；无行与查询失败严格区分。 */
    private Snapshot calculate(String serverId) {
        List<Integer> levels = readTransaction.execute(status -> {
            var selected = jdbc.query(
                    "SELECT role_level FROM game_role WHERE server_id=? ORDER BY role_level DESC LIMIT ?",
                    (row, index) -> row.getInt(1), serverId, sampleLimit);
            for (int level : selected) {
                if (level <= 0) {
                    throw new IllegalStateException("世界等级统计存在非法角色等级，区服=" + serverId);
                }
            }
            return selected;
        });
        if (levels == null) {
            throw new IllegalStateException("世界等级统计事务没有返回结果");
        }
        long total = 0;
        for (int level : levels) {
            total = Math.addExact(total, level);
        }
        int level = levels.isEmpty() ? 1 : Math.toIntExact(total / levels.size());
        generation = Math.incrementExact(generation);
        return new Snapshot(serverId, level, levels.size(), Instant.now().getEpochSecond(), generation);
    }

    /** 只读取前列人数这一项正整数；不重复导出配置，也不使用未经确认的缺省50。 */
    private static int readSampleLimit(ObjectMapper mapper) {
        try (var input = WorldLevelService.class.getResourceAsStream("/gameplay/system.json")) {
            if (input == null) {
                throw new IllegalStateException("世界等级system配置缺失");
            }
            var rows = mapper.readTree(input).path("rows");
            if (!rows.isArray() || rows.isEmpty()) {
                throw new IllegalStateException("世界等级system配置为空或结构非法");
            }
            Integer result = null;
            for (var row : rows) {
                if (!row.path("key").asString().equals("world_level_people")) {
                    continue;
                }
                var value = row.path("value");
                if (result != null || !value.isIntegralNumber() || !value.canConvertToInt() || value.asInt() <= 0) {
                    throw new IllegalStateException("世界等级前列人数配置非法或重复");
                }
                result = value.asInt();
            }
            if (result == null) {
                throw new IllegalStateException("世界等级前列人数配置缺失");
            }
            return result;
        } catch (java.io.IOException error) {
            throw new IllegalStateException("世界等级配置读取失败", error);
        }
    }
}
