/**
 * 正式服神装的部位、初始词条、套装和探宝规则。
 * 配置来自同源表，只计算属性和随机结果，资产事务由 HeroGodEquipmentService 持有。
 */
package com.funsgamex.mxzg.hero;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.function.BiConsumer;
import java.util.function.ToIntFunction;
import java.util.random.RandomGenerator;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
public class GodEquipmentRules {
    /** 属性编号与数值，百分比保留原表的万分单位。 */
    public record Attribute(int type, long value) {}
    /** 神装模板、穿戴部位、星级、品质、套装和基础属性。 */
    public record Definition(int templateId, int slot, int star, int quality, int setType, List<Attribute> attributes) {}
    /** 精确套装规则，佩戴同套装的最低星必须等于规则星级。 */
    public record SetRule(int setType, int star, int count, List<Attribute> attributes, int skillId) {}
    /** 套装激活附带的旧技能，等级为同套装备最低星。 */
    public record SetSkill(int skillId, int level) {}
    /** 探宝内层权重条目，保底条目同时参与其原普通池。 */
    public record DrawEntry(int type, int templateId, int quantity, int weight, boolean guarantee) {}
    /** 探宝的券模板、单次和十次费用及保底步数。 */
    public record DrawCost(int ticket, int ticketsOne, int ticketsTen, int diamondsOne, int diamondsTen, int guarantee) {}
    /** 初始随机词条使用的部位与权重。 */
    private record ModifierType(int slot, int type, int weight) {}
    /** 原配置随机词条编号及等级的真实数值。 */
    private record ModifierRule(int slot, int star, int type, int level, List<Attribute> attributes) {}
    /** 用唯一部位、星级、词条和等级查找原属性配置。 */
    private record ModifierKey(int slot, int star, int type, int level) {}
    /** 品质决定初始词条条数和等级。 */
    private record Quality(int quality, int count, int startLevel) {}
    /** 外层奖池编号和抽中几率。 */
    private record DrawType(int type, int weight) {}
    /** 同一套装的最小星级与件数，用于命中旧套装阈值。 */
    private record SetKey(int minStar, int count) {}
    /** 离线生成的唯一规则输入。 */
    private record Configuration(int requiredRoleLevel, int requiredWorldLevel, int requiredHeroStar,
                                 List<Definition> definitions, List<SetRule> sets, List<ModifierRule> modifiers,
                                 List<ModifierType> modifierTypes, List<Quality> qualities, List<DrawType> drawTypes,
                                 List<DrawEntry> drawRewards, DrawCost drawCost) {}

    /** 服务端可信展示和动作门槛，世界等级使用用户确认的日服门槛。 */
    private final Configuration configuration;
    /** 以模板编号查单件神装唯一规则。 */
    private final Map<Integer, Definition> definitions;
    /** 以部位、星级、编号和等级唯一查词条。 */
    private final Map<ModifierKey, ModifierRule> modifiers;
    /** 以部位和编号查询生成候选的权重。 */
    private final Map<Integer, List<ModifierType>> modifierTypes;
    /** 以品质查询初始条数与等级。 */
    private final Map<Integer, Quality> qualities;
    /** 探宝按抽中类型取普通候选。 */
    private final Map<Integer, List<DrawEntry>> drawPools;
    /** 达到保底次数后直接抽取的候选。 */
    private final List<DrawEntry> guaranteed;

    /** 启动时建立原表索引并校验实际可抽取、可装配的配置。 */
    public GodEquipmentRules(ObjectMapper mapper) {
        configuration = readConfiguration(mapper);
        definitions = configuration.definitions().stream().collect(Collectors.toUnmodifiableMap(
                Definition::templateId, value -> value));
        modifiers = configuration.modifiers().stream().collect(Collectors.toUnmodifiableMap(
                row -> new ModifierKey(row.slot(), row.star(), row.type(), row.level()), row -> row));
        modifierTypes = configuration.modifierTypes().stream().collect(Collectors.groupingBy(ModifierType::slot));
        qualities = configuration.qualities().stream().collect(Collectors.toUnmodifiableMap(Quality::quality, value -> value));
        drawPools = configuration.drawRewards().stream().collect(Collectors.groupingBy(DrawEntry::type));
        guaranteed = configuration.drawRewards().stream().filter(DrawEntry::guarantee).toList();
        validate();
    }

    /** 返回穿戴和探宝共用的最小角色等级。 */
    public int requiredRoleLevel() {
        return configuration.requiredRoleLevel();
    }

    /** 返回穿戴和探宝共用的最小世界等级。 */
    public int requiredWorldLevel() {
        return configuration.requiredWorldLevel();
    }

    /** 返回当前英雄穿戴的最小星级。 */
    public int requiredHeroStar() {
        return configuration.requiredHeroStar();
    }

    /** 返回策划表中的付费和保底配置。 */
    public DrawCost drawCost() {
        return configuration.drawCost();
    }

    /** 仅已知神装模板可作为独立实例创建。 */
    public Definition find(int templateId) {
        return definitions.get(templateId);
    }

    /** 持久神装配置缺失时拒绝整个快照，避免悄悄丢失属性。 */
    public Definition require(int templateId) {
        var definition = find(templateId);
        if (definition == null) {
            throw new IllegalStateException("神装配置不存在：" + templateId);
        }
        return definition;
    }

    /** 按旧部位权重无放回抽取初始词条，品质给出条数和初始等级。 */
    public List<GodEquipmentRepository.Modifier> rollModifiers(Definition definition, RandomGenerator random) {
        var quality = qualities.get(definition.quality());
        var candidates = new ArrayList<>(modifierTypes.get(definition.slot()));
        var result = new ArrayList<GodEquipmentRepository.Modifier>();
        for (int index = 0; index < quality.count(); index++) {
            var selected = choose(candidates, ModifierType::weight, random);
            candidates.remove(selected);
            result.add(new GodEquipmentRepository.Modifier(selected.type(), quality.startLevel()));
        }
        return List.copyOf(result);
    }

    /** 合并单件基础值和实例词条各行，保留攻击、暴击等真实属性编号。 */
    public List<Attribute> itemAttributes(Definition definition, List<GodEquipmentRepository.Modifier> rolled) {
        if (rolled.size() != qualities.get(definition.quality()).count()) {
            throw new IllegalStateException("神装实例词条数量无效：" + definition.templateId());
        }
        var types = new HashSet<Integer>();
        var result = new ArrayList<Attribute>(definition.attributes());
        for (var modifier : rolled) {
            var rule = modifiers.get(new ModifierKey(definition.slot(), definition.star(), modifier.type(), modifier.level()));
            if (rule == null || !types.add(modifier.type())) {
                throw new IllegalStateException("神装实例词条配置无效：" + definition.templateId());
            }
            result.addAll(rule.attributes());
        }
        return List.copyOf(result);
    }

    /** 叠加四件神装各自的属性和所有已达成的套装阈值，供面板与战斗共用。 */
    public void contribute(List<GodEquipmentRepository.Item> equipped, BiConsumer<Integer, Long> add) {
        for (var item : equipped) {
            item.attributes().forEach(value -> add.accept(value.type(), value.value()));
        }
        for (var set : activeSets(equipped)) {
            set.attributes().forEach(value -> add.accept(value.type(), value.value()));
        }
    }

    /** 按旧规则返回套装技能配置编号及等级，具体战斗能力由对应战斗入口决定。 */
    public List<SetSkill> setSkills(List<GodEquipmentRepository.Item> equipped) {
        return activeSets(equipped).stream().filter(set -> set.skillId() != 0)
                .map(set -> new SetSkill(set.skillId(), set.star())).toList();
    }

    /** 统计同套不同部位的最低星，精确匹配套装星级并累加达成的件数档位。 */
    private List<SetRule> activeSets(List<GodEquipmentRepository.Item> equipped) {
        var seenSlots = new HashSet<Integer>();
        var sets = new HashMap<Integer, SetKey>();
        for (var item : equipped) {
            if (!seenSlots.add(item.slot())) {
                throw new IllegalStateException("英雄同一神装部位有多个实例");
            }
            int type = require(item.templateId()).setType();
            sets.merge(type, new SetKey(item.star(), 1),
                    (current, added) -> new SetKey(Math.min(current.minStar(), added.minStar()), current.count() + 1));
        }
        return configuration.sets().stream().filter(rule -> {
            var set = sets.get(rule.setType());
            return set != null && set.minStar() == rule.star() && set.count() >= rule.count();
        }).toList();
    }

    /** 按旧两级权重抽取一项，达到保底次数则跳过普通类型选择。 */
    public DrawEntry draw(boolean guarantee, RandomGenerator random) {
        if (guarantee) {
            return choose(guaranteed, DrawEntry::weight, random);
        }
        var kind = choose(configuration.drawTypes(), DrawType::weight, random);
        return choose(drawPools.get(kind.type()), DrawEntry::weight, random);
    }

    /** 在权重总分布中选取一个候选，零权重条目不会中奖。 */
    private static <T> T choose(List<T> candidates, ToIntFunction<T> weight, RandomGenerator random) {
        long ticket = random.nextLong(candidates.stream().mapToLong(weight::applyAsInt).sum());
        for (var candidate : candidates) {
            ticket -= weight.applyAsInt(candidate);
            if (ticket < 0) {
                return candidate;
            }
        }
        throw new IllegalStateException("神装随机候选权重不一致");
    }

    /** 校验所有初始词条、抽奖入口和保底池在实际配置中可用。 */
    private void validate() {
        if (definitions.isEmpty() || configuration.sets().isEmpty() || configuration.drawTypes().isEmpty()
                || requiredRoleLevel() <= 0 || requiredWorldLevel() <= 0 || requiredHeroStar() <= 0
                || drawCost().ticket() <= 0 || drawCost().ticketsOne() <= 0 || drawCost().ticketsTen() <= 0
                || drawCost().diamondsOne() <= 0 || drawCost().diamondsTen() <= 0 || drawCost().guarantee() <= 0
                || guaranteed.stream().mapToLong(DrawEntry::weight).sum() <= 0) {
            throw new IllegalStateException("神装基础配置无效");
        }
        for (var definition : definitions.values()) {
            var quality = qualities.get(definition.quality());
            var options = modifierTypes.get(definition.slot());
            if (definition.slot() < 1 || definition.slot() > 4 || definition.star() <= 0
                    || quality == null || options == null || quality.count() < 0 || quality.startLevel() <= 0
                    || options.stream().filter(option -> option.weight() > 0).count() < quality.count()) {
                throw new IllegalStateException("神装词条生成规则无效：" + definition.templateId());
            }
            for (var option : options) {
                if (option.weight() < 0 || !modifiers.containsKey(
                        new ModifierKey(definition.slot(), definition.star(), option.type(), quality.startLevel()))) {
                    throw new IllegalStateException("神装缺少词条定义：" + definition.templateId());
                }
            }
        }
        for (var type : configuration.drawTypes()) {
            if (type.weight() <= 0 || drawPools.getOrDefault(type.type(), List.of()).stream().mapToLong(DrawEntry::weight).sum() <= 0) {
                throw new IllegalStateException("神装奖池为空：" + type.type());
            }
        }
        for (var entry : configuration.drawRewards()) {
            if (entry.weight() < 0 || entry.quantity() <= 0
                    || find(entry.templateId()) == null && !List.of(901812, 901813, 901814).contains(entry.templateId())) {
                throw new IllegalStateException("神装探宝奖励不受支持：" + entry.templateId());
            }
        }
    }

    /** 从包内读取生成规则，缺失或结构不合法时拒绝应用装配。 */
    private static Configuration readConfiguration(ObjectMapper mapper) {
        try (var input = GodEquipmentRules.class.getResourceAsStream("/gameplay/god-equipment-rules.json")) {
            if (input == null) {
                throw new IllegalStateException("神装配置资源缺失");
            }
            return mapper.readValue(input, Configuration.class);
        } catch (IOException error) {
            throw new IllegalStateException("神装配置读取失败", error);
        }
    }
}
