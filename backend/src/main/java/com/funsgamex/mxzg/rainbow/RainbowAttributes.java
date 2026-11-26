/**
 * 根据彩虹圣殿的有效占位查询战斗和英雄面板共用的属性加成。
 * 只读持久神位，在到期时即停止贡献属性，邮件和事务变更归圣殿服务。
 */
package com.funsgamex.mxzg.rainbow;

import com.funsgamex.mxzg.time.GameClock;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class RainbowAttributes {
    /** 唯一占位存储，查询当前角色同一时刻的实际占领。 */
    private final RainbowRepository repository;
    /** 用于把稳定神位编号映射到旧版的攻击与生命百分比。 */
    private final RainbowRules rules;
    /** 与神位到期服务共用游戏时间，单位由 Instant 保持一致。 */
    private final GameClock clock;

    /** 纯读取依赖，无角色写入、战斗组装或推送回调。 */
    RainbowAttributes(RainbowRepository repository, RainbowRules rules, GameClock clock) {
        this.repository = repository;
        this.rules = rules;
        this.clock = clock;
    }

    /** 按原万分比返回有效神位的攻击与生命加成，空表代表当前无加成。 */
    public Map<Integer, Long> current(String roleId) {
        var now = clock.instant();
        return repository.occupiedBy(roleId)
                .filter(occupation -> occupation.expiresAt().isAfter(now))
                .map(occupation -> rules.seat(occupation.seatId()).attributes())
                .orElseGet(Map::of);
    }
}
