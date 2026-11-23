/**
 * 英雄详情的圣器激活、穿换卸、升级和转换事务。
 * 收据以当前角色和请求编号保存，提交后通过统一快照同步英雄、圣器和消耗。
 */
package com.funsgamex.mxzg.hero;

import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.network.AssetSyncService;
import com.funsgamex.mxzg.role.RoleRepository;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

@Service
public class HeroArtifactService {
    /** 激活、穿/换、卸下、定向升级和按原表转换。 */
    public enum Action { ACTIVATE, EQUIP, UNEQUIP, UPGRADE, TRANSFORM }
    /** 普通操作无素材。升级传玩家选择的真实实例及替代物品编号，成本由服务端查表。 */
    public record Request(String requestId, String heroId, int slot, Action action, String instanceId,
                          String expectedInstanceId, int targetTemplateId, List<String> materialInstanceIds,
                          List<String> materialHeroIds, List<Integer> replacementItemIds) {}
    /** 同一请求重复时返回实在的原收据；卸下仍保留该件持久身份。 */
    public record Receipt(String requestId, String roleId, String heroId, int slot, Action action, String instanceId,
                          int templateId, long assetRevision) {}
    /** 统一快照包含独立圣器及英雄各自的持久激活格位。 */
    public record State(List<HeroArtifactRepository.Item> items, List<HeroArtifactRepository.ActivatedSlot> slots) {}

    /** 角色、装备和请求使用小写 UUID 字符串。 */
    private static final Pattern UUID = Pattern.compile("[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}");
    /** 单次允许的素材键上限，现有配方最多三个英雄。 */
    private static final int MATERIAL_LIMIT = 16;
    /** 老表的钻石物品编号，扣款走唯一角色钱包。 */
    private static final int DIAMONDS_ITEM = 900002;
    /** 从持久认证会话取得当前角色。 */
    private final SessionService sessions;
    /** 角色锁、钱包和资产版本的统一入口。 */
    private final RoleRepository roles;
    /** 校验当前英雄、等级和真实素材。 */
    private final HeroRepository heroes;
    /** 同源槽位、装备和消耗配置。 */
    private final HeroArtifactRules rules;
    /** 读写角色独立圣器和激活位置。 */
    private final HeroArtifactRepository artifacts;
    /** 普通道具扣款与唯一库存。 */
    private final InventoryService inventory;
    /** 删除素材英雄并返还其装备；圣器升星无英雄培养费返还。 */
    private final HeroMaterialService materials;
    /** 实际上阵英雄成长时重算主队战力。 */
    private final HeroMainPowerService powers;
    /** 英雄元素按原模板配置读取。 */
    private final HeroBattleElementRules elements;
    /** 事务成功提交后发布最新统一快照。 */
    private final AssetSyncService sync;
    /** 原收据随同资产事务持久保存。 */
    private final JdbcTemplate jdbc;
    /** 持久保存和读取请求指纹所需的序列化器。 */
    private final ObjectMapper mapper;

    /** 使用统一名册、钱包、数据库与资产推送。 */
    public HeroArtifactService(SessionService sessions, RoleRepository roles, HeroRepository heroes,
                               HeroArtifactRules rules, HeroArtifactRepository artifacts, InventoryService inventory,
                               HeroMaterialService materials, HeroMainPowerService powers, HeroBattleElementRules elements,
                               AssetSyncService sync, JdbcTemplate jdbc, ObjectMapper mapper) {
        this.sessions = sessions;
        this.roles = roles;
        this.heroes = heroes;
        this.rules = rules;
        this.artifacts = artifacts;
        this.inventory = inventory;
        this.materials = materials;
        this.powers = powers;
        this.elements = elements;
        this.sync = sync;
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    /** 调用方持有角色锁时读取同一版独立资产及已激活位置。 */
    public State state(String roleId) {
        return new State(artifacts.list(roleId), artifacts.activated(roleId));
    }

    /** 校验当前角色、配方与原佩戴关系后执行一次，失败回滚资产和收据。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Receipt change(String token, Request request) {
        validate(request);
        String roleId = sessions.requireRole(token);
        roles.lock(roleId);
        if (!roleId.equals(sessions.requireRole(token))) {
            throw failure(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED");
        }
        String fingerprint = fingerprint(request);
        var replay = findReceipt(roleId, request.requestId(), fingerprint);
        if (replay != null) {
            return replay;
        }
        var hero = heroes.find(roleId, request.heroId())
                .orElseThrow(() -> failure(HttpStatus.NOT_FOUND, "HERO_NOT_FOUND"));
        var slot = rules.slot(request.slot());
        var state = state(roleId);
        boolean active = state.slots().stream().anyMatch(row -> row.heroId().equals(hero.id()) && row.slot() == slot.slot());
        HeroArtifactRepository.Item item;
        if (request.action() == Action.ACTIVATE) {
            if (active || hero.level() < slot.level() || hero.star() < slot.star()) {
                throw failure(HttpStatus.CONFLICT, "ARTIFACT_SLOT_NOT_ACTIVATABLE");
            }
            pay(roleId, costs(slot.costs()));
            item = artifacts.activate(roleId, hero.id(), slot);
        } else {
            if (!active) {
                throw failure(HttpStatus.CONFLICT, "ARTIFACT_SLOT_NOT_ACTIVE");
            }
            item = changeEquipped(roleId, request, hero, state);
        }
        if (hero.deployed()) {
            powers.observe(roleId);
        }
        sync.changed(roleId);
        var receipt = new Receipt(request.requestId(), roleId, hero.id(), slot.slot(), request.action(),
                item.instanceId(), item.templateId(), roles.revision(roleId));
        jdbc.update("INSERT INTO game_hero_artifact_request(role_id,request_id,fingerprint,receipt) VALUES (?,?,?,?)",
                roleId, request.requestId(), fingerprint, mapper.writeValueAsString(receipt));
        return receipt;
    }

    /** 空槽、原件和换装目标都按实时角色快照验证，一次操作只改关联的一格。 */
    private HeroArtifactRepository.Item changeEquipped(String roleId, Request request, HeroProfile hero, State state) {
        var byId = state.items().stream()
                .collect(Collectors.toMap(HeroArtifactRepository.Item::instanceId, Function.identity()));
        var item = byId.get(request.instanceId());
        if (item == null || item.slot() != request.slot()) {
            throw failure(HttpStatus.NOT_FOUND, "ARTIFACT_NOT_FOUND");
        }
        var worn = state.items().stream().filter(row -> row.slot() == item.slot() && hero.id().equals(row.heroId()))
                .findFirst().orElse(null);
        if (request.action() == Action.EQUIP) {
            if (item.heroId() != null || !Objects.equals(request.expectedInstanceId(), worn == null ? null : worn.instanceId())) {
                throw failure(HttpStatus.CONFLICT, "ARTIFACT_SLOT_CHANGED");
            }
            if (worn != null) {
                artifacts.remove(roleId, worn);
            }
            return artifacts.wear(roleId, item, hero.id());
        }
        if (worn == null || !worn.instanceId().equals(item.instanceId())) {
            throw failure(HttpStatus.CONFLICT, "ARTIFACT_SLOT_CHANGED");
        }
        var template = rules.requireSlotTemplate(item.templateId(), item.slot());
        return switch (request.action()) {
            case UNEQUIP -> artifacts.remove(roleId, item);
            case UPGRADE -> upgrade(roleId, item, template, request, byId);
            case TRANSFORM -> transform(roleId, item, template, request);
            default -> throw failure(HttpStatus.BAD_REQUEST, "INVALID_HERO_ARTIFACT_REQUEST");
        };
    }

    /** 按旧目标配方核对独立圣器、英雄和消耗，保留本体实例编号。 */
    private HeroArtifactRepository.Item upgrade(String roleId, HeroArtifactRepository.Item item,
                                                 HeroArtifactRules.Definition before, Request request,
                                                 Map<String, HeroArtifactRepository.Item> owned) {
        if (!before.upgradeTargets().contains(request.targetTemplateId())) {
            throw failure(HttpStatus.CONFLICT, "ARTIFACT_UPGRADE_TARGET_CHANGED");
        }
        var target = rules.requireSlotTemplate(request.targetTemplateId(), before.slot());
        var ordinaryCosts = new TreeMap<Integer, Long>();
        var requiredInstances = new TreeMap<Integer, Long>();
        for (var cost : target.upgradeCosts()) {
            var destination = rules.find(cost.itemId()) == null ? ordinaryCosts : requiredInstances;
            destination.merge(cost.itemId(), cost.quantity(), Math::addExact);
        }
        var instanceMaterials = new ArrayList<HeroArtifactRepository.Item>();
        for (var id : request.materialInstanceIds()) {
            var material = owned.get(id);
            if (material == null || material.heroId() != null || material.instanceId().equals(item.instanceId())
                    || requiredInstances.getOrDefault(material.templateId(), 0L) <= 0) {
                throw failure(HttpStatus.CONFLICT, "ARTIFACT_UPGRADE_MATERIALS");
            }
            requiredInstances.computeIfPresent(material.templateId(), (ignored, count) -> count - 1);
            instanceMaterials.add(material);
        }
        if (requiredInstances.values().stream().anyMatch(count -> count != 0)) {
            throw failure(HttpStatus.CONFLICT, "ARTIFACT_UPGRADE_MATERIALS");
        }
        var heroesUsed = heroCosts(roleId, target, request, ordinaryCosts);
        pay(roleId, ordinaryCosts);
        for (var material : instanceMaterials) {
            artifacts.consume(roleId, material);
        }
        for (var material : heroesUsed) {
            if (!materials.remove(roleId, material)) {
                throw failure(HttpStatus.CONFLICT, "ARTIFACT_UPGRADE_HERO_UNAVAILABLE");
            }
        }
        return artifacts.replaceTemplate(roleId, item, target.templateId());
    }

    /** 星级严格匹配，先匹配指定模板和元素；傀儡只能用配方明确指定的道具。 */
    private List<HeroProfile> heroCosts(String roleId, HeroArtifactRules.Definition target, Request request,
                                        Map<Integer, Long> ordinaryCosts) {
        var selected = new ArrayList<HeroProfile>();
        for (var id : request.materialHeroIds()) {
            var hero = heroes.find(roleId, id).orElseThrow(() -> failure(HttpStatus.NOT_FOUND, "HERO_NOT_FOUND"));
            if (hero.locked() || hero.deployed() || hero.id().equals(request.heroId())) {
                throw failure(HttpStatus.CONFLICT, "ARTIFACT_UPGRADE_HERO_UNAVAILABLE");
            }
            selected.add(hero);
        }
        var remaining = new ArrayList<>(selected);
        var replacements = new ArrayList<>(request.replacementItemIds());
        var rows = target.heroMaterials().stream().sorted(Comparator.comparingInt(HeroArtifactRules.Material::templateId)
                .thenComparingInt(HeroArtifactRules.Material::element).reversed()).toList();
        for (var row : rows) {
            var matched = remaining.stream().filter(hero -> matches(row, hero)).limit(row.count()).toList();
            remaining.removeAll(matched);
            for (int missing = row.count() - matched.size(); missing > 0; missing--) {
                if (row.replacementItemId() <= 0 || !replacements.remove(Integer.valueOf(row.replacementItemId()))) {
                    throw failure(HttpStatus.CONFLICT, "ARTIFACT_UPGRADE_MATERIALS");
                }
                ordinaryCosts.merge(row.replacementItemId(), 1L, Math::addExact);
            }
        }
        if (!remaining.isEmpty() || !replacements.isEmpty()) {
            throw failure(HttpStatus.CONFLICT, "ARTIFACT_UPGRADE_MATERIALS");
        }
        return selected;
    }

    /** 只接受真实星级和策划允许的模板、元素。 */
    private boolean matches(HeroArtifactRules.Material row, HeroProfile hero) {
        return row.star() == hero.star() && (row.templateId() == 0 || row.templateId() == hero.templateId())
                && (row.element() == 0 || row.element() == elements.element(hero.templateId()));
    }

    /** 完美转换按配置的固定目标和成本执行，不重办激活或另建实例。 */
    private HeroArtifactRepository.Item transform(String roleId, HeroArtifactRepository.Item item,
                                                   HeroArtifactRules.Definition definition, Request request) {
        if (definition.transformTarget() <= 0 || definition.transformTarget() != request.targetTemplateId()) {
            throw failure(HttpStatus.CONFLICT, "ARTIFACT_TRANSFORM_TARGET_CHANGED");
        }
        pay(roleId, costs(definition.transformCosts()));
        return artifacts.replaceTemplate(roleId, item, definition.transformTarget());
    }

    /** 合并重复成本，使同一物品只扣除一次总和。 */
    private static Map<Integer, Long> costs(List<HeroArtifactRules.Amount> source) {
        var result = new TreeMap<Integer, Long>();
        for (var entry : source) {
            result.merge(entry.itemId(), entry.quantity(), Math::addExact);
        }
        return result;
    }

    /** 钻石从权威钱包扣除，其余消耗走普通道具事务。 */
    private void pay(String roleId, Map<Integer, Long> costs) {
        for (var cost : costs.entrySet()) {
            boolean paid = cost.getKey() == DIAMONDS_ITEM ? roles.debitDiamonds(roleId, cost.getValue())
                    : inventory.debit(roleId, cost.getKey(), cost.getValue());
            if (!paid) {
                throw failure(HttpStatus.CONFLICT, "INSUFFICIENT_ARTIFACT_ITEMS");
            }
        }
    }

    /** 同角色同键返回原结果；重用旧键提交其他内容会拒绝。 */
    private Receipt findReceipt(String roleId, String requestId, String fingerprint) {
        return jdbc.query("SELECT fingerprint,receipt FROM game_hero_artifact_request WHERE role_id=? AND request_id=?",
                row -> {
                    if (!row.next()) {
                        return null;
                    }
                    if (!row.getString("fingerprint").equals(fingerprint)) {
                        throw failure(HttpStatus.CONFLICT, "IDEMPOTENCY_CONFLICT");
                    }
                    return mapper.readValue(row.getString("receipt"), Receipt.class);
                }, roleId, requestId);
    }

    /** 对任务请求的完整内容做指纹，同一请求键不会接受不同素材或新目标。 */
    private String fingerprint(Request request) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(mapper.writeValueAsBytes(request)));
        } catch (NoSuchAlgorithmException failure) {
            throw new IllegalStateException("缺少 SHA-256", failure);
        }
    }

    /** 按动作拒绝多余字段和超限材料；实例列表禁止重复，替代品允许同模板重复。 */
    private void validate(Request request) {
        if (request == null || !uuid(request.requestId()) || !uuid(request.heroId()) || request.action() == null
                || rules.slot(request.slot()) == null || !validIds(request.materialInstanceIds())
                || !validIds(request.materialHeroIds()) || request.replacementItemIds() == null
                || request.replacementItemIds().size() > MATERIAL_LIMIT
                || request.replacementItemIds().stream().anyMatch(id -> id == null || id <= 0)) {
            throw failure(HttpStatus.BAD_REQUEST, "INVALID_HERO_ARTIFACT_REQUEST");
        }
        var action = request.action();
        boolean hasMaterials = !request.materialInstanceIds().isEmpty() || !request.materialHeroIds().isEmpty()
                || !request.replacementItemIds().isEmpty();
        boolean needsTarget = action == Action.UPGRADE || action == Action.TRANSFORM;
        if ((action == Action.ACTIVATE ? request.instanceId() != null : !uuid(request.instanceId()))
                || (needsTarget ? request.targetTemplateId() <= 0 : request.targetTemplateId() != 0)
                || (action != Action.UPGRADE && hasMaterials)
                || (request.expectedInstanceId() != null && (action != Action.EQUIP || !uuid(request.expectedInstanceId())))) {
            throw failure(HttpStatus.BAD_REQUEST, "INVALID_HERO_ARTIFACT_REQUEST");
        }
    }

    /** 合法的素材实例列表长度有界且 UUID 不重复。 */
    private static boolean validIds(List<String> ids) {
        return ids != null && ids.size() <= MATERIAL_LIMIT && new HashSet<>(ids).size() == ids.size()
                && ids.stream().allMatch(HeroArtifactService::uuid);
    }

    /** 协议只接受 UUID，禁止用背包配置编号代替角色或圣器实例。 */
    private static boolean uuid(String value) {
        return value != null && UUID.matcher(value).matches();
    }

    /** 统一业务错误交给 WebSocket 调用入口编码。 */
    private static ResponseStatusException failure(HttpStatus status, String reason) {
        return new ResponseStatusException(status, reason);
    }
}
