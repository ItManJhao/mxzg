/**
 * 主阵容战力读取及历史峰值，分别供主线和金币副本入场条件使用。
 * 复用同一英雄快照中的个人战力，不把阵型或元素光环重复计入评分。
 */
package com.funsgamex.mxzg.hero;

import com.funsgamex.mxzg.role.RoleRepository;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HeroMainPowerService {
    /** 鉴权并锁定当前角色，读取同一版本的持久阵容。 */
    private final HeroBattleInputService inputs;
    /** 当前主阵容的个人面板分值，修改后走已有角色锁读取。 */
    private final HeroRepository heroes;
    /** 历史主阵容峰值的角色持久化入口。 */
    private final RoleRepository roles;

    /** 队伍总分、逐英雄分值与输入版本；pending非空时不能声称完整还原旧服战力。 */
    public record State(long assetRevision, long lineupVersion, int total,
                        Map<String, Integer> heroes, List<String> pending) {
        /** 评分是只读投影，调用者不能修改持久状态或覆盖缺口。 */
        public State {
            heroes = Map.copyOf(heroes);
            pending = List.copyOf(pending);
        }
    }

    /** 当前阵容战力和历史峰值分别用于当前是否有阵容及旧金币副本门槛。 */
    public record Measured(int current, int maximum) {}

    /** 注入当前阵容及同角色事务内组装的英雄数据。 */
    public HeroMainPowerService(HeroBattleInputService inputs, HeroRepository heroes, RoleRepository roles) {
        this.inputs = inputs;
        this.heroes = heroes;
        this.roles = roles;
    }

    /** 在角色锁内按阵容英雄的同源面板评分记录峰值，阵容或装备走低时保留原最高值。 */
    @Transactional(propagation = Propagation.MANDATORY)
    public Measured observe(String roleId) {
        int current = 0;
        for (var hero : heroes.list(roleId)) {
            if (hero.deployed()) {
                current = Math.addExact(current, hero.panelStats().power());
            }
        }
        return new Measured(current, roles.observeMainPower(roleId, current));
    }

    /**
     * 在同一角色事务内读取已保存队伍并逐英雄取整求和，空队伍返回0。
     * 当前仅含已恢复属性来源；后续挑战必须保留范围校验，不能只看战力达到门槛。
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public State current(String token) {
        var input = inputs.current(token);
        var scores = new LinkedHashMap<String, Integer>();
        int total = 0;
        var pending = new LinkedHashSet<String>();
        for (var unit : input.units()) {
            var hero = unit.hero();
            int score = hero.panelStats().power();
            if (scores.put(hero.id(), score) != null) {
                throw new IllegalStateException("主线队伍英雄重复");
            }
            total = Math.addExact(total, score);
            pending.addAll(hero.panelStats().pendingSources());
        }
        return new State(input.assetRevision(), input.lineupVersion(), total, scores, List.copyOf(pending));
    }
}
