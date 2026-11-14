/**
 * 活动控制维护的可信启动配置，由Spring配置文件或部署环境提供，不接受玩家请求。
 * 默认关闭；每个明确列出的区服必须提供带时区的真实开服时间，不能用应用启动时间兜底。
 * 本配置只驱动控制维护，不开放领取、兑换或活动界面。
 */
package com.funsgamex.mxzg.campaign;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * @param enabled true才应用可信配置并启用周期维护；默认false，启动不填控制行
 * @param intervalMillis 定时检查间隔，单位毫秒，默认2000沿用旧定时器
 * @param servers 明确维护的区服，未列出的区服不初始化或推进
 */
@ConfigurationProperties(prefix = "mxzg.idle-activity-maintenance", ignoreUnknownFields = false)
public record IdleActivityMaintenanceProperties(boolean enabled, @DefaultValue("2000") long intervalMillis,
                                                List<Server> servers) {
    /** 未配置列表保持为空并冻结；是否允许为空由显式启用时的入口校验。 */
    public IdleActivityMaintenanceProperties {
        servers = servers == null ? List.of() : List.copyOf(servers);
    }

    /** 单服可信配置，不承载角色或资产状态。
     * @param id game_server中已经存在的区服ID，不在维护中创建选服目录
     * @param openedAt 带UTC偏移的ISO时间，例如负责人确认后的真实开服时刻；无默认值
     * @param activity44 可选044发布意图，省略不撤销既有发布，也不填默认时间或空兑换配置
     */
    public record Server(String id, String openedAt, Release activity44) {}

    /** 044可信发布配置，实际使用前校验时间、版本及非空兑换内容。
     * @param version 本服044单调递增的配置版本，重复启动沿用原版本
     * @param startAt 带偏移的记录期开始ISO时间
     * @param endAt 带偏移的记录期结束ISO时间，结束秒仍可记录
     * @param clearAt 带偏移的清理期结束ISO时间，不延长掉落记录期
     * @param limitDays 最低开服天数，缺省0沿用旧控制默认值
     * @param exchanges 旧044兑换行，本批只存验配置，不开放兑换、消耗或发奖
     */
    public record Release(long version, String startAt, String endAt, String clearAt, int limitDays,
                          List<IdleActivityPublicationUtils.Exchange> exchanges) {
        /** 冻结配置行，缺失保持空列表并在启用前明确拒绝，不生成默认兑换项。 */
        public Release {
            exchanges = exchanges == null ? List.of() : List.copyOf(exchanges);
        }
    }
}
