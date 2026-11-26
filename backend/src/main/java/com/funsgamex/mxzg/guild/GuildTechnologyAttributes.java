/**
 * 按职业读取角色当前生效的公会科技，供英雄面板、战力及战斗输入共用。
 * 科技等级归角色持久保存，会员身份只决定生效与否，本类不写入任何状态。
 */
package com.funsgamex.mxzg.guild;

import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class GuildTechnologyAttributes {
    /** 当前会员身份的权威记录，退出后停止返回科技加成。 */
    private final GuildRepository guilds;
    /** 跨公会保留的个人科技进度，批量读取全部已培养职业。 */
    private final GuildTechnologyRepository technology;
    /** 按原职业和节点配置将持久进度折算为未合并的属性编号及数值。 */
    private final GuildTechnologyRules rules;

    /** 装配只读依赖，让英雄名册可以独立读取属性且不依赖科技写服务。 */
    GuildTechnologyAttributes(GuildRepository guilds, GuildTechnologyRepository technology, GuildTechnologyRules rules) {
        this.guilds = guilds;
        this.technology = technology;
        this.rules = rules;
    }

    /** 返回此角色各已生效职业的原始属性，退会或从未培养时为空。 */
    public Map<Integer, Map<Integer, Long>> current(String roleId) {
        if (guilds.memberGuild(roleId) == null) {
            return Map.of();
        }
        var attributes = new HashMap<Integer, Map<Integer, Long>>();
        technology.progress(roleId).forEach((profession, progress) -> {
            var active = rules.attributes(profession, progress);
            if (!active.isEmpty()) {
                attributes.put(profession, Map.copyOf(active));
            }
        });
        return Map.copyOf(attributes);
    }
}
