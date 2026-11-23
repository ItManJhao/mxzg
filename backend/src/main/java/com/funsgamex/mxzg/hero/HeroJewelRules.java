/**
 * 读取同源宝石策划投影，提供槽位解锁、配方和固有属性。
 * 英雄面板与战斗输入共享镶嵌属性计算，三个槽都镶嵌后按最低星级加入套装。
 */
package com.funsgamex.mxzg.hero;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.BiConsumer;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
public class HeroJewelRules {
    /** 配置槽位和需要达到的英雄星级。 */
    public record SlotStar(int slot, int star) {}

    /** 属性编号和配置值保留原单位，百分比是万分数。 */
    public record Attribute(int attr, long value) {}

    /** 合成一份目标需要扣除的库存物品及数量。 */
    public record Ingredient(int itemId, long quantity) {}

    /** 宝石自身星级、镶嵌槽、配方、属性和额外战力。 */
    public record Jewel(int itemId, int slot, int star, int rarity, List<Ingredient> recipe,
                        List<Attribute> attributes, List<Attribute> fighting) {}

    /** 三个槽共同达成的最低星级套装。 */
    public record SetTier(int star, List<Attribute> attributes) {}

    /** 构建输出的原始表，仅在规则装配时读取一次。 */
    public record Config(List<SlotStar> slotStars, List<Jewel> jewels, List<SetTier> sets) {}

    /** 按槽位索引真实门槛，键为 1 至 3。 */
    private final Map<Integer, Integer> slotStars;

    /** 按库存物品 ID 索引唯一宝石规则。 */
    private final Map<Integer, Jewel> jewels;

    /** 按槽位保存升星顺序，供合成与批量穿戴使用。 */
    private final Map<Integer, List<Jewel>> bySlot;

    /** 按套装最低星级索引加成配置。 */
    private final Map<Integer, SetTier> sets;

    /** 从构建产物装配完整规则；缺表或槽位错误拒绝启动。 */
    public HeroJewelRules(ObjectMapper mapper) {
        var data = readConfig(mapper);
        var slots = new HashMap<Integer, Integer>();
        for (var gate : data.slotStars()) {
            if (gate.slot() < 1 || gate.slot() > 3 || gate.star() <= 0 || slots.put(gate.slot(), gate.star()) != null) {
                throw new IllegalStateException("宝石槽门槛配置无效");
            }
        }
        if (slots.size() != 3) {
            throw new IllegalStateException("缺少宝石槽门槛");
        }
        slotStars = Map.copyOf(slots);

        var definitions = new HashMap<Integer, Jewel>();
        var recipes = new HashMap<Integer, List<Jewel>>();
        for (var row : data.jewels()) {
            var jewel = new Jewel(row.itemId(), row.slot(), row.star(), row.rarity(),
                List.copyOf(row.recipe()), List.copyOf(row.attributes()), List.copyOf(row.fighting()));
            if (!slots.containsKey(jewel.slot()) || jewel.itemId() <= 0 || jewel.star() <= 0
                    || definitions.put(jewel.itemId(), jewel) != null) {
                throw new IllegalStateException("宝石配置行无效");
            }
        }
        jewels = Map.copyOf(definitions);
        for (int slot : slots.keySet()) {
            List<Jewel> slotJewels = definitions.values().stream()
                .filter(jewel -> jewel.slot() == slot)
                .sorted(java.util.Comparator.comparingInt(Jewel::star))
                .toList();
            validateRecipes(slotJewels);
            recipes.put(slot, slotJewels);
        }
        bySlot = Map.copyOf(recipes);

        var tiers = new HashMap<Integer, SetTier>();
        for (var tier : data.sets()) {
            if (tier.star() <= 0 || tiers.put(tier.star(), new SetTier(tier.star(), List.copyOf(tier.attributes()))) != null) {
                throw new IllegalStateException("宝石套装配置无效");
            }
        }
        sets = Map.copyOf(tiers);
    }

    /** 返回当前物品的宝石配置；普通物品和未开放类型返回 null。 */
    public Jewel find(int itemId) {
        return jewels.get(itemId);
    }

    /** 返回指定槽的配置星级门槛；非法槽拒绝调用。 */
    public int requiredStar(int slot) {
        var star = slotStars.get(slot);
        if (star == null) {
            throw new IllegalArgumentException("宝石槽位无效");
        }
        return star;
    }

    /** 返回一个槽位按星级递增的全部配置，便于从低到高连锁合成。 */
    public List<Jewel> forSlot(int slot) {
        return bySlot.getOrDefault(slot, List.of());
    }

    /** 按旧原始属性编号加入单石属性、额外战力，以及已激活的套装。 */
    public void addAttributes(List<HeroJewelRepository.Item> items, BiConsumer<Integer, Long> add) {
        for (var item : items) {
            var jewel = requireEquipped(item);
            addAll(jewel.attributes(), add);
            addAll(jewel.fighting(), add);
        }
        var tier = activeSet(items);
        if (tier != null) {
            addAll(tier.attributes(), add);
        }
    }

    /** 三个不同槽均有宝石才选择最低星级对应套装，其他情况无套装加成。 */
    public SetTier activeSet(List<HeroJewelRepository.Item> items) {
        if (items.size() != slotStars.size() || items.stream().map(HeroJewelRepository.Item::slot).distinct().count() != slotStars.size()) {
            return null;
        }
        int minimum = items.stream().mapToInt(item -> requireEquipped(item).star()).min().orElseThrow();
        return sets.get(minimum);
    }

    /** 已持久的镶嵌数据无对应配置或槽不符时拒绝错误属性输入。 */
    private Jewel requireEquipped(HeroJewelRepository.Item item) {
        var definition = find(item.templateId());
        if (definition == null || definition.slot() != item.slot()) {
            throw new IllegalStateException("已镶嵌宝石配置无效，物品 " + item.templateId());
        }
        return definition;
    }

    /** 逐条交原属性入口处理，避免在本层折算百分比。 */
    private static void addAll(List<Attribute> attributes, BiConsumer<Integer, Long> add) {
        for (var attr : attributes) {
            add.accept(attr.attr(), attr.value());
        }
    }

    /** 校验同槽递增配方，防止连锁合成跨槽或引用循环。 */
    private static void validateRecipes(List<Jewel> jewels) {
        if (jewels.isEmpty()) {
            throw new IllegalStateException("宝石槽缺少配置");
        }
        for (int index = 0; index < jewels.size(); index++) {
            var jewel = jewels.get(index);
            var expected = index == 0
                ? List.<Ingredient>of()
                : List.of(new Ingredient(jewels.get(index - 1).itemId(), 3));
            if (jewel.star() != index + 1 || !jewel.recipe().equals(expected)) {
                throw new IllegalStateException("宝石配方链不连续");
            }
        }
    }

    /** 读取构建期导出的相同策划投影。 */
    private static Config readConfig(ObjectMapper mapper) {
        try (var input = HeroJewelRules.class.getResourceAsStream("/gameplay/hero-jewels.json")) {
            if (input == null) {
                throw new IllegalStateException("宝石配置缺失");
            }
            return mapper.readValue(input, Config.class);
        } catch (IOException error) {
            throw new IllegalStateException("宝石配置不可读取", error);
        }
    }
}
