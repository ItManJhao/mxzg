/**
 * 在单个角色锁事务内校验素材、扣除物品、返还培养消耗并提交旧版升星。
 * 统一快照提供最新英雄和库存；同一请求重放只读原持久收据。
 */
package com.funsgamex.mxzg.hero;

import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.lineup.MainFormationStateService;
import com.funsgamex.mxzg.network.AssetSyncService;
import com.funsgamex.mxzg.quest.QuestMetric;
import com.funsgamex.mxzg.quest.QuestProgressEvent;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.world.WorldLevelService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

@Service
public class HeroStarService {
    /** 客户端按原配方位置选择素材 UUID 或替代品，数量仍由服务端规则决定。 */
    public record Materials(int row, List<String> heroIds, boolean useReplacement) {}
    /** 请求标识持久幂等，角色归属由当前凭证查得。 */
    public record Request(String requestId, String heroId, int expectedStar, List<Materials> materials) {}
    /** 只保存实际返还的成长资源，卸下装备由统一库存快照同步。 */
    public record Receipt(String requestId, String heroId, int fromStar, int toStar,
            List<HeroStarRules.Amount> refunded, long assetRevision, String roleId) {}
    /** 请求指纹与原成功回执一起保存，用于拒绝同键异参。 */
    private record StoredReceipt(String fingerprint, Receipt receipt) {}

    /** 按旧物品编号区分金币钱包、英雄经验和进阶石。 */
    private static final int GOLD_ITEM_ID = 900001;
    /** 普通升级投入的英雄经验物品。 */
    private static final int EXPERIENCE_ITEM_ID = 900101;
    /** 强化投入的进阶石物品。 */
    private static final int STONE_ITEM_ID = 900102;
    /** 客户端物件和请求 ID 都采用 UUID 字符串。 */
    private static final Pattern UUID = Pattern.compile("[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}");
    /** 限制单包素材记录数，远高于旧配方涉及的最大数量。 */
    private static final int MATERIAL_LIMIT = 32;

    /** 从长连接凭证取得本次操作的唯一角色。 */
    private final SessionService sessions;
    /** 控制角色串行化及金币入账、读取角色等级和区服。 */
    private final RoleRepository roles;
    /** 当前角色唯一英雄名册以及图鉴进度。 */
    private final HeroRepository heroes;
    /** 发布同源策划使用的实际升星条件和配方。 */
    private final HeroStarRules rules;
    /** 根据旧等级、强化阶段规则精确返还投入。 */
    private final HeroGrowthRules growth;
    /** 从本区权威世界等级服务读取实际门槛。 */
    private final WorldLevelService worldLevels;
    /** 扣除共同消耗及返还材料英雄的成长资源。 */
    private final InventoryService inventory;
    /** 按已有穿戴关系卸装并删除实际素材英雄。 */
    private final HeroMaterialService heroMaterials;
    /** 检查升星是否达到阵法或助战的永久解锁条件。 */
    private final MainFormationStateService formations;
    /** 更新上阵英雄升星后的主阵容最高战力。 */
    private final HeroMainPowerService powers;
    /** 写入本次英雄变动及原成功回执。 */
    private final JdbcTemplate jdbc;
    /** 序列化本事务精确的成长返还清单，作为重放证据。 */
    private final ObjectMapper mapper;
    /** 资产事务只递增一次，成功提交后由统一入口推送。 */
    private final AssetSyncService sync;
    /** 升星成功且写入回执后，登记以目标星级计算的获得进度。 */
    private final ApplicationEventPublisher events;

    /** 注入角色、资产和成长规则入口，全部变更共用同一个持久事务。 */
    public HeroStarService(SessionService sessions, RoleRepository roles, HeroRepository heroes, HeroStarRules rules,
            HeroGrowthRules growth, WorldLevelService worldLevels, InventoryService inventory,
            HeroMaterialService heroMaterials,
            MainFormationStateService formations, HeroMainPowerService powers, JdbcTemplate jdbc,
            ObjectMapper mapper, AssetSyncService sync, ApplicationEventPublisher events) {
        this.sessions = sessions;
        this.roles = roles;
        this.heroes = heroes;
        this.rules = rules;
        this.growth = growth;
        this.worldLevels = worldLevels;
        this.inventory = inventory;
        this.heroMaterials = heroMaterials;
        this.formations = formations;
        this.powers = powers;
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.sync = sync;
        this.events = events;
    }

    /** 真实升星一次并记录目标星级；同键重放原收据，失败整笔回滚。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Receipt upgrade(String token, Request request) {
        var selections = readSelections(request);
        String fingerprint = fingerprint(selections);
        String roleId = sessions.requireRole(token);
        roles.lock(roleId);
        if (!roleId.equals(sessions.requireRole(token))) {
            throw error(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED");
        }
        var saved = findReceipt(roleId, request.requestId());
        if (saved != null) {
            Receipt receipt = saved.receipt();
            if (!receipt.heroId().equals(request.heroId()) || receipt.fromStar() != request.expectedStar()
                    || !saved.fingerprint().equals(fingerprint)) {
                throw error(HttpStatus.CONFLICT, "IDEMPOTENCY_CONFLICT");
            }
            return receipt;
        }
        var owned = heroes.list(roleId).stream().collect(Collectors.toMap(HeroProfile::id, Function.identity()));
        var target = owned.get(request.heroId());
        if (target == null) {
            throw error(HttpStatus.NOT_FOUND, "HERO_NOT_FOUND");
        }
        if (target.star() != request.expectedStar()) {
            throw error(HttpStatus.CONFLICT, "HERO_STAR_CHANGED");
        }
        var recipe = rules.find(target.templateId(), target.star());
        if (recipe == null) {
            throw error(HttpStatus.CONFLICT, "HERO_STAR_LIMIT");
        }
        verifyGate(roleId, recipe, owned);
        // 未上阵的目标也必须能生成下一星的完整快照，缺基础属性时整笔拒绝。
        growth.stats(target.templateId(), recipe.toStar(), target.level(), target.stage());
        var materials = new ArrayList<HeroProfile>();
        Map<Integer, Long> costs = new TreeMap<>();
        recipe.gate().costs().forEach(item -> costs.put(item.itemId(), item.quantity()));
        collectCosts(target, recipe, selections, owned, materials, costs);
        for (var entry : costs.entrySet()) {
            if (!inventory.debit(roleId, entry.getKey(), entry.getValue())) {
                throw error(HttpStatus.CONFLICT, "INSUFFICIENT_HERO_STAR_ITEMS");
            }
        }
        Map<Integer, Long> refunds = new TreeMap<>();
        for (var material : materials) {
            releaseMaterial(roleId, material, refunds);
        }
        if (jdbc.update("UPDATE game_hero SET star=? WHERE role_id=? AND id=? AND star=?",
                recipe.toStar(), roleId, target.id(), target.star()) != 1) {
            throw error(HttpStatus.CONFLICT, "HERO_STAR_CHANGED");
        }
        for (var entry : refunds.entrySet()) {
            if (entry.getKey() == GOLD_ITEM_ID) {
                roles.creditCurrency(roleId, entry.getValue(), 0);
            } else {
                inventory.credit(roleId, entry.getKey(), entry.getValue());
            }
        }
        heroes.recordIllustration(roleId, target.templateId(), recipe.toStar());
        formations.refresh(roleId);
        if (target.deployed()) {
            powers.observe(roleId);
        }
        sync.changed(roleId);
        var refunded = refunds.entrySet().stream()
                .map(item -> new HeroStarRules.Amount(item.getKey(), item.getValue())).toList();
        var receipt = new Receipt(request.requestId(), target.id(), target.star(), recipe.toStar(),
                refunded, roles.revision(roleId), roleId);
        jdbc.update("INSERT INTO game_hero_star_request(role_id,request_id,hero_id,from_star,to_star,"
                        + "material_fingerprint,refunded_json,asset_revision) VALUES (?,?,?,?,?,?,?,?)",
                roleId, request.requestId(), target.id(), target.star(), recipe.toStar(), fingerprint,
                mapper.writeValueAsString(refunded), receipt.assetRevision());
        int acquiredStar = recipe.toStar();
        events.publishEvent(new QuestProgressEvent(roleId, QuestMetric.GET_HERO, acquiredStar, acquiredStar == 5 ? 0 : 1));
        return receipt;
    }

    /** 验证素材身份、禁止重复和目标自吞，构建按行排序的原请求结构。 */
    private static Map<Integer, Materials> readSelections(Request request) {
        if (request == null || !validId(request.requestId()) || !validId(request.heroId())
                || request.expectedStar() < 4 || request.expectedStar() > 14
                || request.materials() == null || request.materials().size() > MATERIAL_LIMIT) {
            throw error(HttpStatus.BAD_REQUEST, "INVALID_HERO_STAR_REQUEST");
        }
        var uniqueHeroes = new HashSet<String>();
        uniqueHeroes.add(request.heroId());
        var selections = new TreeMap<Integer, Materials>();
        for (var row : request.materials()) {
            if (row == null || row.row() < 0 || row.row() >= MATERIAL_LIMIT || row.heroIds() == null
                    || row.heroIds().size() > MATERIAL_LIMIT
                    || selections.putIfAbsent(row.row(), row) != null) {
                throw error(HttpStatus.BAD_REQUEST, "INVALID_HERO_STAR_REQUEST");
            }
            for (String heroId : row.heroIds()) {
                if (!validId(heroId) || !uniqueHeroes.add(heroId)) {
                    throw error(HttpStatus.BAD_REQUEST, "INVALID_HERO_STAR_REQUEST");
                }
            }
        }
        if (uniqueHeroes.size() > MATERIAL_LIMIT + 1) {
            throw error(HttpStatus.BAD_REQUEST, "INVALID_HERO_STAR_REQUEST");
        }
        return selections;
    }

    /** 角色等级和本区世界等级满足其一，最后一段再按升星前名册计数。 */
    private void verifyGate(String roleId, HeroStarRules.Recipe recipe, Map<String, HeroProfile> owned) {
        var role = roles.findById(roleId).orElseThrow();
        if (role.level() < recipe.gate().roleLevel()
                && worldLevels.current(role.serverId()).level() < recipe.gate().worldLevel()) {
            throw error(HttpStatus.CONFLICT, "HERO_STAR_LEVEL");
        }
        if (recipe.minimumHeroes() > 0 && owned.values().stream()
                .filter(hero -> hero.star() >= recipe.minimumStar()).count() < recipe.minimumHeroes()) {
            throw error(HttpStatus.CONFLICT, "HERO_STAR_ROSTER");
        }
    }

    /** 按行复核准确星级、装备去向和替代资格，未完成本行或额外材料一律拒绝。 */
    private void collectCosts(HeroProfile target, HeroStarRules.Recipe recipe, Map<Integer, Materials> selections,
            Map<String, HeroProfile> owned, List<HeroProfile> materials, Map<Integer, Long> costs) {
        if (selections.size() != recipe.materials().size()) {
            throw error(HttpStatus.CONFLICT, "HERO_STAR_MATERIALS");
        }
        for (int index = 0; index < recipe.materials().size(); index++) {
            var rule = recipe.materials().get(index);
            var selection = selections.get(index);
            if (selection == null || selection.heroIds().size() + (selection.useReplacement() ? 1 : 0) != rule.count()
                    || (selection.useReplacement() && rule.replacementItem() <= 0)) {
                throw error(HttpStatus.CONFLICT, "HERO_STAR_MATERIALS");
            }
            if (selection.useReplacement()) {
                costs.merge(rule.replacementItem(), 1L, Math::addExact);
            }
            for (String heroId : selection.heroIds()) {
                var material = owned.get(heroId);
                if (material == null || material.deployed() || material.locked()) {
                    throw error(HttpStatus.CONFLICT, "HERO_STAR_MATERIAL_UNAVAILABLE");
                }
                if (!rules.matches(target.templateId(), rule, material)) {
                    throw error(HttpStatus.CONFLICT, "HERO_STAR_MATERIALS");
                }
                materials.add(material);
            }
        }
    }

    /** 素材完整卸装后删除，从实际等级和强化进度取完整旧消耗返还。 */
    private void releaseMaterial(String roleId, HeroProfile material, Map<Integer, Long> refunds) {
        var levels = growth.costBetween(1, material.level());
        addRefund(refunds, GOLD_ITEM_ID, levels.gold());
        addRefund(refunds, EXPERIENCE_ITEM_ID, levels.experience());
        for (int stage = 0; stage < material.stage(); stage++) {
            var cost = growth.stageRequirement(stage);
            addRefund(refunds, GOLD_ITEM_ID, cost.gold());
            addRefund(refunds, STONE_ITEM_ID, cost.stone());
        }
        if (!heroMaterials.remove(roleId, material)) {
            throw error(HttpStatus.CONFLICT, "HERO_STAR_MATERIAL_UNAVAILABLE");
        }
    }

    /** 合并正数的实际成长投入，一级零阶素材不会产生零到账项。 */
    private static void addRefund(Map<Integer, Long> refunds, int itemId, long quantity) {
        if (quantity > 0) {
            refunds.merge(itemId, quantity, Math::addExact);
        }
    }

    /** 按同一角色与持久请求编号读取原始结果，重放不依赖被消耗的英雄仍存在。 */
    private StoredReceipt findReceipt(String roleId, String requestId) {
        return jdbc.query("SELECT hero_id,from_star,to_star,material_fingerprint,refunded_json,asset_revision "
                        + "FROM game_hero_star_request WHERE role_id=? AND request_id=?",
                rs -> {
                    if (!rs.next()) {
                        return null;
                    }
                    List<HeroStarRules.Amount> refunded = mapper.readValue(rs.getString("refunded_json"),
                            new TypeReference<List<HeroStarRules.Amount>>() {});
                    var receipt = new Receipt(requestId, rs.getString("hero_id"), rs.getInt("from_star"),
                            rs.getInt("to_star"), List.copyOf(refunded), rs.getLong("asset_revision"), roleId);
                    return new StoredReceipt(rs.getString("material_fingerprint"), receipt);
                }, roleId, requestId);
    }

    /** 同行素材和各行先后顺序不影响实际结算，采用规范顺序比较重复请求。 */
    private static String fingerprint(Map<Integer, Materials> selections) {
        var canonical = new StringBuilder();
        for (var row : selections.values()) {
            canonical.append(row.row()).append(':').append(row.useReplacement()).append(':');
            row.heroIds().stream().sorted().forEach(id -> canonical.append(id).append(','));
            canonical.append(';');
        }
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(canonical.toString().getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException cause) {
            throw new IllegalStateException("无法计算升星请求指纹", cause);
        }
    }

    /** 严格校验字符串 UUID，不将模板编号当成英雄实例。 */
    private static boolean validId(String value) {
        return value != null && UUID.matcher(value).matches();
    }

    /** 返回统一长连接错误码，即使接入其他入口也遵守原事务回滚。 */
    private static ResponseStatusException error(HttpStatus status, String code) {
        return new ResponseStatusException(status, code);
    }
}
