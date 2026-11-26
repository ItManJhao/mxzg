/**
 * 公会科技的原策划表投影，提供职业路径、点亮费用、加成、重置报价和返还金额。
 * 仅计算配置和服务端持久进度的结果，角色扣费、入会资格与进度归科技服务。
 */
package com.funsgamex.mxzg.guild;

import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
public final class GuildTechnologyRules {
    /** 旧版留下的战士、法师、牧师、坦克职业编号，按界面标签排列。 */
    private static final List<Integer> PROFESSIONS = List.of(1, 2, 3, 4);
    /** 每阶顺时针点亮六格。 */
    private static final int SLOTS = 6;
    /** 由英雄属性池消费的科技字段，速度为固定值，其他为万分比。 */
    private static final Set<Integer> ATTRIBUTES = Set.of(101, 102, 201, 207, 208, 212, 219, 222, 270, 291);
    /** 各职业初次进入时一阶尚未点亮。 */
    private static final Progress INITIAL = new Progress(1, 0);
    /** 初始进度没有历史投资。 */
    private static final Cost ZERO = new Cost(0, 0);

    /** 本职业的当前阶段及当前阶段已点亮格数，初始状态为一阶零格。 */
    public record Progress(int stage, int step) {}

    /** 单次扣费或累计返还的金币与公会贡献道具数量。 */
    public record Cost(long gold, long medals) {}

    /** 该职业格号、英雄属性编号及点亮一级的原始增量。 */
    public record Ability(int slot, int attributeId, int perLevel) {}

    /** 原费用行沿阶段升序、格号升序。 */
    private record StageCost(int stage, int step, long gold, long medals) {}

    /** 各职业的六个可分别累计点亮的属性。 */
    private record Profession(int profession, List<Ability> abilities) {}

    /** 从四张原策划表生成的发行数据结构。 */
    private record Config(int stageGap, List<StageCost> costs, List<Profession> professions, List<Long> resetDiamonds) {}

    /** 迈入下一阶时允许相对最低职业阶段的差值。 */
    private final int stageGap;
    /** 精确到每一格的升级扣费。 */
    private final List<StageCost> costs;
    /** 对应每种已点亮格数的历史总投资，用于重置返还。 */
    private final List<Cost> totalInvestments;
    /** 按原职业编号索引的只读属性列表。 */
    private final Map<Integer, List<Ability>> abilitiesByProfession;
    /** 第一次到最高档的钻石报价，更多次重置继续沿用最高档。 */
    private final List<Long> resetPrices;

    /** 启动加载时校验配置连续性和属性支持，避免缺表影响真实资产扣费。 */
    public GuildTechnologyRules(ObjectMapper mapper) {
        var config = load(mapper);
        stageGap = config.stageGap();
        costs = List.copyOf(config.costs());
        resetPrices = List.copyOf(config.resetDiamonds());
        if (stageGap < 0 || costs.isEmpty() || costs.size() % SLOTS != 0 || resetPrices.isEmpty()
                || resetPrices.stream().anyMatch(price -> price <= 0)) {
            throw new IllegalStateException("公会科技阶段费用或重置价格无效");
        }
        totalInvestments = indexCosts(costs);
        abilitiesByProfession = indexAbilities(config.professions());
    }

    /** 查询科技页可操作的四个职业。 */
    public List<Integer> professions() {
        return PROFESSIONS;
    }

    /** 检查请求的职业是否存在，0 和旧游侠编号不属于当前规则。 */
    public boolean validProfession(int profession) {
        return abilitiesByProfession.containsKey(profession);
    }

    /** 按界面节点顺序返回该职业属性，调用方需先校验输入职业。 */
    public List<Ability> abilities(int profession) {
        var abilities = abilitiesByProfession.get(profession);
        if (abilities == null) {
            throw new IllegalArgumentException("公会科技职业无效：" + profession);
        }
        return abilities;
    }

    /** 返回未点亮的新账号或某职业完成重置后的进度。 */
    public Progress initialProgress() {
        return INITIAL;
    }

    /** 返回原表有完整六格费用的最高阶段。 */
    public int maxStage() {
        return costs.size() / SLOTS;
    }

    /** 迈入下一阶时至多允许超过最落后职业的阶段数。 */
    public int stageGap() {
        return stageGap;
    }

    /** 找到下一次点亮后的进度，满级时返回 null；不在此判定其他职业的阶段差。 */
    public Progress next(Progress progress) {
        int index = investmentIndex(progress);
        if (index == costs.size()) {
            return null;
        }
        var next = costs.get(index);
        return new Progress(next.stage(), next.step());
    }

    /** 根据点亮后的阶段和格号读取该次金币、贡献花费。 */
    public Cost cost(Progress target) {
        int index = investmentIndex(target);
        if (index == 0) {
            throw new IllegalArgumentException("未点亮的初始进度不存在升级成本");
        }
        var cost = costs.get(index - 1);
        return new Cost(cost.gold(), cost.medals());
    }

    /** 计算重置该职业返还的全部原金币和公会贡献，初始进度返回零。 */
    public Cost refund(Progress progress) {
        return totalInvestments.get(investmentIndex(progress));
    }

    /** 从角色已完成的全职业共享重置次数计算下一次价格，封顶后保持最高档。 */
    public long resetDiamonds(int resetsCompleted) {
        if (resetsCompleted < 0) {
            throw new IllegalArgumentException("公会科技累计重置次数无效");
        }
        return resetPrices.get(Math.min(resetsCompleted, resetPrices.size() - 1));
    }

    /** 汇总该职业已点亮格子的实际属性，未点亮的属性不写入属性池。 */
    public Map<Integer, Long> attributes(int profession, Progress progress) {
        investmentIndex(progress);
        var result = new LinkedHashMap<Integer, Long>();
        for (var ability : abilities(profession)) {
            int level = progress.stage() - (ability.slot() <= progress.step() ? 0 : 1);
            if (level > 0) {
                result.put(ability.attributeId(), (long) level * ability.perLevel());
            }
        }
        return Map.copyOf(result);
    }

    /** 校验已保存进度并将其转换为累计点亮次数，越界状态不能参与扣费或战斗。 */
    private int investmentIndex(Progress progress) {
        if (progress == null || progress.stage() < 1 || progress.stage() > maxStage() || progress.step() < 0
                || progress.step() > SLOTS || (progress.step() == 0 && progress.stage() != 1)) {
            throw new IllegalArgumentException("公会科技进度无效：" + progress);
        }
        return (progress.stage() - 1) * SLOTS + progress.step();
    }

    /** 校验费用行的阶段和格不能缺失或重复，预先累计重置时要返还的投资。 */
    private static List<Cost> indexCosts(List<StageCost> costs) {
        var investments = new ArrayList<Cost>(costs.size() + 1);
        investments.add(ZERO);
        for (int index = 0; index < costs.size(); index++) {
            var cost = costs.get(index);
            if (cost.stage() != index / SLOTS + 1 || cost.step() != index % SLOTS + 1
                    || cost.gold() <= 0 || cost.medals() <= 0) {
                throw new IllegalStateException("公会科技等级费用缺行或无效：" + cost);
            }
            var previous = investments.getLast();
            investments.add(new Cost(Math.addExact(previous.gold(), cost.gold()), Math.addExact(previous.medals(), cost.medals())));
        }
        return List.copyOf(investments);
    }

    /** 校验四个职业各自六格，并拒绝重复属性或英雄属性池尚未支持的字段。 */
    private static Map<Integer, List<Ability>> indexAbilities(List<Profession> professions) {
        if (!professions.stream().map(Profession::profession).toList().equals(PROFESSIONS)) {
            throw new IllegalStateException("公会科技缺少或错排职业");
        }
        var result = new LinkedHashMap<Integer, List<Ability>>();
        for (var profession : professions) {
            var abilities = List.copyOf(profession.abilities());
            if (abilities.size() != SLOTS || abilities.stream().map(Ability::attributeId).distinct().count() != SLOTS) {
                throw new IllegalStateException("公会科技职业属性缺失或重复：" + profession.profession());
            }
            for (int index = 0; index < SLOTS; index++) {
                var ability = abilities.get(index);
                if (ability.slot() != index + 1 || !ATTRIBUTES.contains(ability.attributeId()) || ability.perLevel() <= 0) {
                    throw new IllegalStateException("公会科技职业属性无效：" + ability);
                }
            }
            result.put(profession.profession(), abilities);
        }
        return Map.copyOf(result);
    }

    /** 仅从后端所发行的原表投影读取配置，任何缺失都终止错误装配。 */
    private static Config load(ObjectMapper mapper) {
        try (var stream = GuildTechnologyRules.class.getResourceAsStream("/gameplay/guild-technology-rules.json")) {
            if (stream == null) {
                throw new IllegalStateException("缺少公会科技配置");
            }
            return mapper.readValue(stream, Config.class);
        } catch (IOException failure) {
            throw new IllegalStateException("公会科技配置读取失败", failure);
        }
    }
}
