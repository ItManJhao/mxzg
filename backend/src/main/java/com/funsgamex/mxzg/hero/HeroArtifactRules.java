/**
 * 圣器规则：同源配置决定槽位门槛、培养消耗、属性和套装。
 * 服务层负责持久交易，英雄面板和战斗组装用这里的规则贡献原始数值。
 */
package com.funsgamex.mxzg.hero;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.BiConsumer;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
public class HeroArtifactRules {
    /** 正数量的货币或普通道具。 */
    public record Amount(int itemId, long quantity) {}
    /** 原表基础、特殊与套装属性编号和值。 */
    public record Attribute(int type, long value) {}
    /** 材料英雄须满足原配方星级与可选的模板、元素要求。 */
    public record Material(int templateId, int element, int star, int count, int replacementItemId) {}
    /** 槽位激活校验英雄星级和等级，成功后立即装备赠送套件。 */
    public record Slot(int slot, int level, int star, List<Amount> costs, int rewardTemplateId) {}
    /** 目标模板持有培养的实际成本，本体模板持有允许的下一模板。 */
    public record Definition(int templateId, int slot, int rarity, int setId, List<Material> heroMaterials,
                             List<Amount> upgradeCosts, List<Integer> upgradeTargets, List<Amount> transformCosts,
                             int transformTarget, List<Attribute> attributes, List<Attribute> specialAttributes, int score) {}
    /** 套装只在有效件数达标时加属性；高阶还可追加实际技能。 */
    public record SetEffect(int setId, int count, List<Attribute> attributes, int skillId, int skillLevel, int name) {}
    /** 共用导出工具生成的服务端规则格式。 */
    private record Config(List<Slot> slots, List<Definition> items, List<SetEffect> sets) {}

    /** 按部位（1 戒指，2 项链）读取激活条件。 */
    private final Map<Integer, Slot> slots;
    /** 圣器配置 ID 取基础属性及培养关系。 */
    private final Map<Integer, Definition> definitions;
    /** 旧套装编号取生效条件与原始属性。 */
    private final Map<Integer, SetEffect> sets;

    /** 启动时验证激活赠品和所有培养目标仍在原部位。 */
    public HeroArtifactRules(ObjectMapper mapper) {
        try (var input = getClass().getResourceAsStream("/gameplay/hero-artifacts.json")) {
            if (input == null) {
                throw new IllegalStateException("缺少圣器配置");
            }
            var config = mapper.readValue(input, Config.class);
            slots = config.slots().stream().collect(Collectors.toUnmodifiableMap(Slot::slot, Function.identity()));
            definitions = config.items().stream().collect(Collectors.toUnmodifiableMap(Definition::templateId, Function.identity()));
            sets = config.sets().stream().collect(Collectors.toUnmodifiableMap(SetEffect::setId, Function.identity()));
            if (slots.size() != 2 || definitions.isEmpty() || sets.isEmpty()) {
                throw new IllegalStateException("圣器表缺少激活、模板或套装配置");
            }
            slots.values().forEach(slot -> requireSlotTemplate(slot.rewardTemplateId(), slot.slot()));
            for (var definition : definitions.values()) {
                if (slot(definition.slot()) == null || !sets.containsKey(definition.setId())) {
                    throw new IllegalStateException("圣器模板部位或套装无效：" + definition.templateId());
                }
                definition.upgradeTargets().forEach(target -> requireSlotTemplate(target, definition.slot()));
                if (definition.transformTarget() > 0) {
                    requireSlotTemplate(definition.transformTarget(), definition.slot());
                }
            }
        } catch (IOException failure) {
            throw new IllegalStateException("读取圣器规则失败", failure);
        }
    }

    /** 如果模板存在则读取部位和培养条件；未知配置返回 null。 */
    public Definition find(int id) {
        return definitions.get(id);
    }

    /** 如果存在则读取圣器槽激活门槛。 */
    public Slot slot(int number) {
        return slots.get(number);
    }

    /** 校验模板及槽位，持久装备数据和配置引用都使用同一检查。 */
    public Definition requireSlotTemplate(int id, int slot) {
        var item = find(id);
        if (item == null || item.slot() != slot) {
            throw new IllegalStateException("圣器模板与部位不一致：" + id + "/" + slot);
        }
        return item;
    }

    /** 累加基础、特殊和已激活套装的属性，同次返回套装授予的战斗技能。 */
    public List<HeroEvolutionRules.Skill> contribute(List<HeroArtifactRepository.Item> equipped,
                                                    BiConsumer<Integer, Long> add) {
        if (equipped.isEmpty()) {
            return List.of();
        }
        for (var item : equipped) {
            var definition = requireSlotTemplate(item.templateId(), item.slot());
            for (var attribute : definition.attributes()) {
                add.accept(attribute.type(), attribute.value());
            }
            for (var attribute : definition.specialAttributes()) {
                add.accept(attribute.type(), attribute.value());
            }
        }
        var skills = new ArrayList<HeroEvolutionRules.Skill>();
        for (var active : activeSets(equipped)) {
            for (var attribute : active.attributes()) {
                add.accept(attribute.type(), attribute.value());
            }
            if (active.skillId() > 0) {
                skills.add(new HeroEvolutionRules.Skill(active.skillId(), active.skillLevel()));
            }
        }
        return List.copyOf(skills);
    }

    /** 按旧 Receiver 品质升序累计，较高品质也计入已出现的较低套装。 */
    public List<SetEffect> activeSets(List<HeroArtifactRepository.Item> equipped) {
        var pieces = equipped.stream().map(item -> requireSlotTemplate(item.templateId(), item.slot()))
                .sorted(Comparator.comparingInt(Definition::rarity)).toList();
        var counts = new LinkedHashMap<Definition, Integer>();
        for (var piece : pieces) {
            boolean matched = false;
            for (var entry : counts.entrySet()) {
                var first = entry.getKey();
                if (first.setId() == piece.setId() || first.rarity() < piece.rarity()) {
                    entry.setValue(entry.getValue() + 1);
                    matched = true;
                }
            }
            if (!matched) {
                counts.put(piece, 1);
            }
        }
        return counts.entrySet().stream().map(entry -> sets.get(entry.getKey().setId()).count() <= entry.getValue()
                ? sets.get(entry.getKey().setId()) : null).filter(java.util.Objects::nonNull).toList();
    }
}
