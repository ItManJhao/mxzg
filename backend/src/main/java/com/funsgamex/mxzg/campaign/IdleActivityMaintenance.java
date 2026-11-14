/**
 * 活动控制的实际启动与定时入口：仅在显式启用后应用可信配置，并维护明确列出的区服。
 * 使用已有Spring启动/调度，不增加玩家协议或HTTP管理接口；事务与行锁归MaintenanceService。
 * 缺真实开服时间或非法配置阻止启用，不在收益查询中补控制，也不执行角色或资产钩子。
 */
package com.funsgamex.mxzg.campaign;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@EnableConfigurationProperties(IdleActivityMaintenanceProperties.class)
public class IdleActivityMaintenance implements ApplicationRunner {
    /** 后端模块日志，维护失败在此边界记录，底层保留异常原因，不重复打印。 */
    private static final Logger LOG = LoggerFactory.getLogger(IdleActivityMaintenance.class);
    /** 受事务代理保护的控制写服务；本入口不直接访问数据库。 */
    private final IdleActivityMaintenanceService service;
    /** Spring绑定的可信配置，不来自游戏客户端。 */
    private final IdleActivityMaintenanceProperties properties;
    /** 每次维护统一取一次服务器时刻；测试可提供固定时钟，不依赖休眠或真实日期。 */
    private final Clock clock;
    /** 已完成启用的配置区服；启动失败前为空，不维护其他已存在区服。 */
    private volatile List<PreparedServer> readyServers = List.of();
    /** 区服到上次已记录的失败原因，仅用于同因去重，成功后清除，不影响维护重试。 */
    private final Map<String, String> reportedFailures = new ConcurrentHashMap<>();

    /** 解析后的启动参数，不缓存玩家或活动期次。
     * @param id 已验证格式的配置区服ID
     * @param openedAtSeconds 明确开服Unix秒，不能由本次时钟替代
     * @param publication 可选的完整044发布意图，没有时保留已有发布原样
     */
    private record PreparedServer(String id, long openedAtSeconds,
                                   Optional<IdleActivityPublicationUtils.Publication> publication) {}

    /** 正常应用使用服务器UTC时钟；区服自然日规则仍由ControlRules使用上海时区。 */
    @Autowired
    public IdleActivityMaintenance(IdleActivityMaintenanceService service,
                                    IdleActivityMaintenanceProperties properties) {
        this(service, properties, Clock.systemUTC());
    }

    /** 隔离测试可注入固定时钟，执行与正常入口完全相同的配置和定时逻辑。 */
    IdleActivityMaintenance(IdleActivityMaintenanceService service,
                            IdleActivityMaintenanceProperties properties, Clock clock) {
        this.service = service;
        this.properties = properties;
        this.clock = clock;
    }

    /** 显式启用时先校验全部配置，再按区服逐事务初始化及发布；重复启动不重置已有期次。 */
    @Override
    public void run(ApplicationArguments arguments) {
        if (!properties.enabled()) {
            return;
        }
        var prepared = prepare();
        long nowSeconds = clock.instant().getEpochSecond();
        for (var server : prepared) {
            service.configure(server.id(), server.openedAtSeconds(), server.publication(), nowSeconds);
        }
        readyServers = List.copyOf(prepared);
        LOG.info("挂机活动控制维护已启用，区服数={}，检查间隔={}毫秒", prepared.size(), properties.intervalMillis());
    }

    /**
     * 按旧默认2秒粒度调用各服单步维护，共用本轮捕获的服务器秒；失败服回滚，其他服继续。
     * 同因只记录一次，后续仍重试；成功后清除去重标记，日志不会改变业务结果。
     */
    @Scheduled(fixedDelayString = "${mxzg.idle-activity-maintenance.interval-millis:2000}",
            initialDelayString = "${mxzg.idle-activity-maintenance.interval-millis:2000}")
    public void tick() {
        if (!properties.enabled()) {
            return;
        }
        long nowSeconds = clock.instant().getEpochSecond();
        for (var server : readyServers) {
            try {
                service.maintain(server.id(), nowSeconds);
                reportedFailures.remove(server.id());
            } catch (RuntimeException error) {
                String key = error.getClass().getName() + ":" + error.getMessage();
                String previous = reportedFailures.put(server.id(), key);
                if (!key.equals(previous)) {
                    LOG.error("挂机活动控制维护失败，区服={}；本服事务已回滚，后续继续重试", server.id(), error);
                }
            }
        }
    }

    /** 检查显式配置并解析开服时刻；全部格式校验完成前不调用任何写服务。 */
    private List<PreparedServer> prepare() {
        if (properties.intervalMillis() < 1 || properties.servers().isEmpty()) {
            throw new IllegalArgumentException("启用活动控制维护时必须配置区服及正数检查间隔");
        }
        var ids = new HashSet<String>();
        var prepared = new ArrayList<PreparedServer>();
        for (var server : properties.servers()) {
            if (server.id() == null || !server.id().matches("[a-z0-9_-]{1,32}") || !ids.add(server.id())) {
                throw new IllegalArgumentException("活动控制维护区服ID缺失、重复或非法");
            }
            long openedAt = timestamp(server.openedAt());
            Optional<IdleActivityPublicationUtils.Publication> publication = Optional.empty();
            if (server.activity44() != null) {
                var release = server.activity44();
                var command = new IdleActivityPublicationUtils.Publication(release.version(), timestamp(release.startAt()),
                        timestamp(release.endAt()), timestamp(release.clearAt()), release.limitDays(), release.exchanges());
                // 所有发布行先完成JSON规范校验，避免后一个区服的坏文本在前服已写入后才发现。
                IdleActivityPublicationUtils.encode(new tools.jackson.databind.ObjectMapper(), command);
                publication = Optional.of(command);
            }
            prepared.add(new PreparedServer(server.id(), openedAt, publication));
        }
        prepared.sort(Comparator.comparing(PreparedServer::id));
        return List.copyOf(prepared);
    }

    /** 将开服或发布的带明确偏移时间转为非负Unix秒，不按本机时区猜测缺失日期。 */
    private static long timestamp(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("活动控制维护缺少明确的开服或发布时刻");
        }
        try {
            long seconds = OffsetDateTime.parse(value).toEpochSecond();
            if (seconds < 0) {
                throw new IllegalArgumentException("活动控制维护时间不能早于Unix纪元");
            }
            return seconds;
        } catch (DateTimeParseException error) {
            throw new IllegalArgumentException("活动控制维护时间必须是带时区的ISO格式", error);
        }
    }
}
