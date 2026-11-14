/**
 * 最小精灵实例持久入口：为2000002逐件生成真实随机属性和独立UUID，恢复当前角色完整持有状态。
 * 由可信奖励/开发GM事务与统一快照调用，加入调用方事务并锁角色；幂等回执由外层业务保存。
 * GM仅为当前测试角色准备已恢复的2000002；不开放领取、穿戴、升级、洗练或重置。
 * 持久状态损坏时明确拒绝，不降格为堆叠库存或空列表。
 */
package com.funsgamex.mxzg.spirit;

import com.funsgamex.mxzg.network.AssetSyncService;
import com.funsgamex.mxzg.role.RoleRepository;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.random.RandomGenerator;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.SerializationFeature;

@Service
public class SpiritInventoryService {
    /** 本批状态格式，后续技能结构变化必须显式迁移或升级，不以默认值猜旧格式。 */
    public static final int SCHEMA_VERSION = 1;
    /** 当前唯一已授权的精灵物品配置ID，不是实例ID或英雄模板ID。 */
    private static final int SUPPORTED_ITEM = 2_000_002;
    /**
     * 单次可信内部调用的技术批量上限，避免非法大数导致无界抽样/内存分配。
     * 不是玩家持有容量或玩法发放封顶；超限整次拒绝，不能裁剪，未来合法配置扩大时须显式复核。
     */
    private static final int MAX_GRANT_QUANTITY = 1_000;
    /** 持久技能JSON格式1恰含这三项，不忽略陌生字段或让缺失数字默认为0。 */
    private static final Set<String> SKILL_FIELDS = Set.of("sort", "skillId", "level");
    /** 与外层奖励/回执共享的持久连接，不自行创建独立事务。 */
    private final JdbcTemplate jdbc;
    /** 唯一角色行锁入口，重复获得同一事务的角色锁不会创建第二份状态。 */
    private final RoleRepository roles;
    /** 真实随机生成及原配置成员校验，不持有玩家属性或实例ID。 */
    private final SpiritRules rules;
    /** 同事务资产版本及提交后统一通知，读取不递增版本。 */
    private final AssetSyncService sync;
    /** 技能持久文本编解码器，由应用注入，不修改它的共享选项。 */
    private final ObjectMapper json;

    /**
     * 一件真实精灵实例；未开放的穿戴/经验/洗练状态只保存在固定默认值，不进入此只读展示。
     * @param instanceId 持久独立UUID字符串，同属性实例也不得合并
     * @param itemId 当前只支持2000002
     * @param abilityId 已按真实规则生成或校验的能力ID
     * @param skills 原始技能次序及等级，保持独立实例属性
     */
    public record Item(String instanceId, int itemId, int abilityId, List<SpiritRules.Skill> skills) {
        /** 校验实例基本身份并冻结技能集合，调用方不能改写历史发放结果。 */
        public Item {
            if (!canonicalUuid(instanceId) || itemId != SUPPORTED_ITEM || abilityId <= 0
                    || skills == null || skills.isEmpty()) {
                throw new IllegalArgumentException("精灵实例身份或属性非法");
            }
            skills = List.copyOf(skills);
        }
    }

    /** 当前角色持有的完整精灵实例快照，不是增量或普通背包数量。
     * @param schemaVersion 明确状态格式1，不能以0或缺失表示已加载
     * @param items 成功查询后的不可变全量持有，空列表只表示该角色确实没有实例
     */
    public record State(int schemaVersion, List<Item> items) {
        /** 冻结完整持有列表，未知格式拒绝，不转换成默认空状态。 */
        public State {
            if (schemaVersion != SCHEMA_VERSION || items == null) {
                throw new IllegalArgumentException("精灵实例状态格式非法");
            }
            items = List.copyOf(items);
        }
    }

    /** 注入同库连接、真实角色锁和规则，不创建玩家写接口或第二份资产缓存。 */
    public SpiritInventoryService(JdbcTemplate jdbc, RoleRepository roles, SpiritRules rules,
                                  AssetSyncService sync, ObjectMapper json) {
        this.jdbc = jdbc;
        this.roles = roles;
        this.rules = rules;
        this.sync = sync;
        this.json = json;
    }

    /**
     * 在调用方角色奖励事务中逐件创建实例；所有随机候选先生成成功，再保存并登记一次资产变更。
     * @param role 已鉴权的真实角色，不创建角色或更改归属
     * @param itemId 本批必须为2000002，其他物品不走本领域
     * @param quantity 正整数且至多1000，为技术批量保护，超限拒绝而非截取奖励
     * @param random 由外层可信奖励流程提供的随机源，不从玩家接收种子或属性
     * @return 本次真实创建的不可变实例列表，外层须与奖励回执一同提交，重放不得再次调用
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public List<Item> grant(String role, int itemId, int quantity, RandomGenerator random) {
        requireSupportedGrant(itemId, quantity);
        if (random == null) {
            throw new IllegalArgumentException("精灵发放随机源缺失");
        }
        sync.requireTransaction();
        lockRole(role);
        var created = new ArrayList<Item>(quantity);
        for (int index = 0; index < quantity; index++) {
            var generation = rules.create(itemId, random);
            rules.validate(generation);
            if (generation.itemId() != itemId) {
                throw new IllegalStateException("精灵生成物品与发放意图不一致");
            }
            created.add(new Item(UUID.randomUUID().toString(), itemId, generation.abilityId(), generation.skills()));
        }
        for (var item : created) {
            int inserted = jdbc.update("INSERT INTO game_spirit(instance_id,role_id,item_id,ability_id,"
                            + "skills_json,hero_id,place,exp,wash_ability_id,wash_skills_json) "
                            + "VALUES (?,?,?,?,?,NULL,0,0,0,'[]')",
                    item.instanceId(), role, item.itemId(), item.abilityId(), skillsJson(item.skills()));
            if (inserted != 1) {
                throw new IllegalStateException("精灵实例写入数量异常");
            }
        }
        sync.changed(role);
        return List.copyOf(created);
    }

    /** 在任何随机消费前校验合并后的发放量；1000是技术批量保护，不是持有容量或截奖规则。 */
    public static void requireSupportedGrant(int itemId, long quantity) {
        if (itemId != SUPPORTED_ITEM || quantity < 1 || quantity > MAX_GRANT_QUANTITY) {
            throw new IllegalArgumentException("精灵发放物品或数量非法");
        }
    }

    /**
     * 在现有角色锁事务中恢复完整持有；缺表、坏JSON、未知原属性或非默认未开放状态使整包拒绝。
     * 只读取本角色实例，不抽样、不补默认实例、不修改资产版本；成功空列表与查询失败严格区分。
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public State current(String role) {
        sync.requireTransaction();
        lockRole(role);
        var items = jdbc.query("SELECT instance_id,item_id,ability_id,skills_json,hero_id,place,exp,"
                        + "wash_ability_id,wash_skills_json FROM game_spirit "
                        + "WHERE role_id=? ORDER BY instance_id", this::readItem, role);
        return new State(SCHEMA_VERSION, items);
    }

    /** 加真实角色行锁，空身份或不存在的角色不能被解释成没有持有。 */
    private void lockRole(String role) {
        if (role == null || role.isBlank()) {
            throw new IllegalArgumentException("精灵实例角色身份缺失");
        }
        roles.lock(role);
    }

    /** 校验一件完整持久实例；本批未开放字段必须保持新建默认值，不忽略旧脏状态。 */
    private Item readItem(ResultSet row, int index) throws SQLException {
        String instanceId = row.getString("instance_id");
        if (row.getString("hero_id") != null || nonNegative(row, "place") != 0 || nonNegative(row, "exp") != 0
                || nonNegative(row, "wash_ability_id") != 0 || !"[]".equals(row.getString("wash_skills_json"))) {
            throw new IllegalStateException("精灵实例包含尚未开放的持久状态：" + instanceId);
        }
        try {
            int itemId = Math.toIntExact(nonNegative(row, "item_id"));
            int abilityId = Math.toIntExact(nonNegative(row, "ability_id"));
            var skills = readSkills(row.getString("skills_json"));
            var generation = new SpiritRules.Generation(itemId, abilityId, skills);
            rules.validate(generation);
            return new Item(instanceId, itemId, abilityId, skills);
        } catch (RuntimeException error) {
            throw new IllegalStateException("精灵实例持久属性非法：" + instanceId, error);
        }
    }

    /** 严格读取格式1技能列表，拒绝缺字段、陌生字段、重复JSON键及尾随文本，再由规则核对成员。 */
    private List<SpiritRules.Skill> readSkills(String text) {
        if (text == null || text.isBlank()) {
            throw new IllegalStateException("精灵持久技能缺失");
        }
        var values = json.reader().with(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
                .with(DeserializationFeature.FAIL_ON_READING_DUP_TREE_KEY).readTree(text);
        if (values == null || !values.isArray() || values.isEmpty()) {
            throw new IllegalStateException("精灵持久技能必须为非空列表");
        }
        var skills = new ArrayList<SpiritRules.Skill>();
        for (var value : values) {
            if (!value.isObject() || value.size() != SKILL_FIELDS.size()) {
                throw new IllegalStateException("精灵持久技能字段不完整");
            }
            for (var field : value.propertyNames()) {
                if (!SKILL_FIELDS.contains(field)) {
                    throw new IllegalStateException("精灵持久技能存在未知字段：" + field);
                }
            }
            skills.add(new SpiritRules.Skill(positiveInt(value, "sort"), positiveInt(value, "skillId"),
                    positiveInt(value, "level")));
        }
        return List.copyOf(skills);
    }

    /** 保存固定格式1的三个显式键，不受共享mapper的命名策略或缩进设置改变。 */
    private String skillsJson(List<SpiritRules.Skill> skills) {
        var values = skills.stream().map(skill -> Map.of("sort", skill.sort(),
                "skillId", skill.skillId(), "level", skill.level())).toList();
        return json.writer().without(SerializationFeature.INDENT_OUTPUT).writeValueAsString(values);
    }

    /** 读取必须显式存在的正int技能字段，字符串、小数、布尔和默认0均拒绝。 */
    private static int positiveInt(JsonNode row, String field) {
        var value = row.path(field);
        if (!value.isIntegralNumber() || !value.canConvertToInt() || value.asInt() <= 0) {
            throw new IllegalStateException("精灵持久技能字段非法：" + field);
        }
        return value.asInt();
    }

    /** 保留数据库NULL与合法0的区别，非法负值不转换成未开放字段默认值。 */
    private static long nonNegative(ResultSet row, String column) throws SQLException {
        long value = row.getLong(column);
        if (row.wasNull() || value < 0) {
            throw new IllegalStateException("精灵实例持久字段缺失或为负：" + column);
        }
        return value;
    }

    /** 只接纳UUID标准字符串，避免数字化、短UUID解析或格式回绕掩盖实例身份损坏。 */
    private static boolean canonicalUuid(String value) {
        if (value == null) {
            return false;
        }
        try {
            return UUID.fromString(value).toString().equals(value);
        } catch (IllegalArgumentException error) {
            return false;
        }
    }
}
