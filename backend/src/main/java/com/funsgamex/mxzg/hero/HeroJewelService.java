/**
 * 在同一角色锁事务内完成宝石扣回、槽位更新、合成和持久回执。
 * 统一资产快照通过正常提交事件刷新英雄和背包，重发只返回原结果。
 */
package com.funsgamex.mxzg.hero;

import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.network.AssetSyncService;
import com.funsgamex.mxzg.reward.RewardGrantService;
import com.funsgamex.mxzg.role.RoleRepository;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

@Service
public class HeroJewelService {
    /** 旧宝石 4102～4107 的单槽、批量和合成操作。 */
    public enum Action { EQUIP, UNEQUIP, EQUIP_ALL, UNEQUIP_ALL, COMBINE, COMBINE_ALL }

    /** 目标物品是配置 ID。单镶/卸校验原模板，一键合成可绑定预览的持久资产版本。 */
    public record Request(String requestId, String heroId, Action action, int itemId, int slot,
                          int expectedItemId, int count, Long expectedRevision) {
        /** 构造无预览版本的既有英雄宝石请求。 */
        public Request(String requestId, String heroId, Action action, int itemId, int slot, int expectedItemId, int count) {
            this(requestId, heroId, action, itemId, slot, expectedItemId, count, null);
        }
    }

    /** 操作及原参数用于回包校验；合成只返回净新增物品，结果中不携带整份资产。 */
    public record Receipt(String requestId, String roleId, String heroId, Action action, int itemId, int slot,
                          int expectedItemId, int count, long assetRevision, boolean changed,
                          List<RewardGrantService.Reward> rewards, Long expectedRevision) {}

    /** 英雄和业务请求的持久身份始终是 UUID 字符串。 */
    private static final String UUID = "[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}";

    /** 认证入口，等角色锁后再次确认会话仍有效。 */
    private final SessionService sessions;
    /** 获取角色资产锁和版本。 */
    private final RoleRepository roles;
    /** 从角色名册验证英雄归属、星级和阵容状态。 */
    private final HeroRepository heroes;
    /** 真实堆叠库存，扣回同模板的实际数量。 */
    private final InventoryService inventory;
    /** 已镶嵌槽位读写。 */
    private final HeroJewelRepository equipped;
    /** 策划门槛、配方及配置槽。 */
    private final HeroJewelRules rules;
    /** 更新已出阵英雄的共享战力峰值。 */
    private final HeroMainPowerService powers;
    /** 确认外部回收调用处于角色资产事务。 */
    private final AssetSyncService sync;
    /** 同事务存储冻结回执。 */
    private final JdbcTemplate jdbc;
    /** 回执只在服务端持久化时使用 JSON，网络层另用 Protobuf。 */
    private final ObjectMapper mapper;

    /** 注入共用认证、角色锁、库存、槽位与规则。 */
    public HeroJewelService(SessionService sessions, RoleRepository roles, HeroRepository heroes,
                           InventoryService inventory, HeroJewelRepository equipped, HeroJewelRules rules,
                           HeroMainPowerService powers, AssetSyncService sync, JdbcTemplate jdbc, ObjectMapper mapper) {
        this.sessions = sessions;
        this.roles = roles;
        this.heroes = heroes;
        this.inventory = inventory;
        this.equipped = equipped;
        this.rules = rules;
        this.powers = powers;
        this.sync = sync;
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    /** 在角色锁内先重放原回执，再校验一键合成预览的持久版本；拒绝时无需回退客户端估算。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Receipt change(String token, Request request) {
        requireValid(request);
        String roleId = sessions.requireRole(token);
        roles.lock(roleId);
        if (!roleId.equals(sessions.requireRole(token))) {
            throw error(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED");
        }
        Receipt previous = previous(roleId, request.requestId());
        if (previous != null) {
            var oldRequest = new Request(previous.requestId(), previous.heroId(), previous.action(), previous.itemId(),
                previous.slot(), previous.expectedItemId(), previous.count(), previous.expectedRevision());
            if (!oldRequest.equals(request)) {
                throw error(HttpStatus.CONFLICT, "IDEMPOTENCY_CONFLICT");
            }
            return previous;
        }
        if (request.expectedRevision() != null && request.expectedRevision() != roles.revision(roleId)) {
            throw error(HttpStatus.CONFLICT, "HERO_JEWEL_PREVIEW_CHANGED");
        }
        boolean changed;
        List<RewardGrantService.Reward> rewards = List.of();
        if (request.heroId() == null) {
            rewards = request.action() == Action.COMBINE
                ? combine(roleId, request)
                : combineAll(roleId, request.slot());
            changed = !rewards.isEmpty();
        } else {
            var hero = heroes.find(roleId, request.heroId())
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "HERO_NOT_FOUND"));
            changed = changeSlots(roleId, hero, request);
            if (changed && hero.deployed()) {
                powers.observe(roleId);
            }
        }

        var receipt = new Receipt(request.requestId(), roleId, request.heroId(), request.action(), request.itemId(),
            request.slot(), request.expectedItemId(), request.count(), roles.revision(roleId), changed, rewards,
            request.expectedRevision());
        jdbc.update("INSERT INTO game_hero_jewel_request(role_id,request_id,receipt_json) VALUES (?,?,?)",
            roleId, request.requestId(), mapper.writeValueAsString(receipt));
        return receipt;
    }

    /** 升星消费素材英雄时由外层角色锁事务调用，退回每件真实宝石并删除归属关系。 */
    @Transactional(propagation = Propagation.MANDATORY)
    public void releaseForConsumedHero(String roleId, String heroId) {
        sync.requireTransaction();
        for (var item : equipped.forHero(roleId, heroId)) {
            unwear(roleId, heroId, item);
        }
    }

    /** 按动作改所选英雄的已镶嵌槽位，实际余额由库存层校验。 */
    private boolean changeSlots(String roleId, HeroProfile hero, Request request) {
        var slots = equipped.forHero(roleId, hero.id()).stream()
            .collect(Collectors.toMap(HeroJewelRepository.Item::slot, Function.identity()));
        var current = slots.get(request.slot());
        return switch (request.action()) {
            case EQUIP -> equipOne(roleId, hero, request, current);
            case UNEQUIP -> {
                requireExpected(current, request.expectedItemId());
                unwear(roleId, hero.id(), current);
                yield true;
            }
            case EQUIP_ALL -> equipAll(roleId, hero, slots);
            case UNEQUIP_ALL -> {
                for (var item : slots.values()) {
                    unwear(roleId, hero.id(), item);
                }
                yield !slots.isEmpty();
            }
            default -> throw new IllegalStateException("合成动作不能修改英雄槽");
        };
    }

    /** 验证宝石槽、英雄星级和选择时的原槽，替换后退回原宝石一枚。 */
    private boolean equipOne(String roleId, HeroProfile hero, Request request, HeroJewelRepository.Item current) {
        var jewel = rules.find(request.itemId());
        if (jewel == null || jewel.slot() != request.slot()) {
            throw error(HttpStatus.BAD_REQUEST, "HERO_JEWEL_INVALID");
        }
        if (hero.star() < rules.requiredStar(jewel.slot())) {
            throw error(HttpStatus.CONFLICT, "HERO_JEWEL_SLOT_LOCKED");
        }
        requireExpected(current, request.expectedItemId());
        if (current != null && current.templateId() == jewel.itemId()) {
            return false;
        }
        wear(roleId, hero.id(), jewel, current);
        return true;
    }

    /** 按旧界面同槽星级严格择优，不用请求里的候选覆盖当前实时库存。 */
    private boolean equipAll(String roleId, HeroProfile hero, Map<Integer, HeroJewelRepository.Item> slots) {
        var available = balances(roleId);
        boolean changed = false;
        for (int slot = 1; slot <= 3; slot++) {
            if (hero.star() < rules.requiredStar(slot)) {
                continue;
            }
            var current = slots.get(slot);
            var currentDefinition = current == null ? null : rules.find(current.templateId());
            int minimumStar = currentDefinition == null ? 0 : currentDefinition.star();
            var best = rules.forSlot(slot).stream()
                .filter(jewel -> jewel.star() > minimumStar && available.getOrDefault(jewel.itemId(), 0L) > 0)
                .reduce((earlier, later) -> later).orElse(null);
            if (best != null) {
                wear(roleId, hero.id(), best, current);
                changed = true;
            }
        }
        return changed;
    }

    /** 镶嵌消耗一件堆叠道具，替换时同事务归还旧道具。 */
    private void wear(String roleId, String heroId, HeroJewelRules.Jewel jewel, HeroJewelRepository.Item previous) {
        debit(roleId, jewel.itemId(), 1);
        equipped.wear(roleId, heroId, jewel.itemId(), jewel.slot(), previous);
        if (previous != null) {
            inventory.credit(roleId, previous.templateId(), 1);
        }
    }

    /** 卸下时先归还道具，再删除当前持久关系。 */
    private void unwear(String roleId, String heroId, HeroJewelRepository.Item jewel) {
        inventory.credit(roleId, jewel.templateId(), 1);
        equipped.remove(roleId, heroId, jewel);
    }

    /** 单合按目标宝石读取既有配方，不能合不存在或无配方的首档。 */
    private List<RewardGrantService.Reward> combine(String roleId, Request request) {
        var target = rules.find(request.itemId());
        if (target == null || target.recipe().isEmpty()) {
            throw error(HttpStatus.BAD_REQUEST, "HERO_JEWEL_RECIPE_INVALID");
        }
        applyRecipe(roleId, target, request.count());
        return List.of(new RewardGrantService.Reward(target.itemId(), request.count()));
    }

    /** 批量在指定槽中由低至高合成。回执净新增剔除同次继续消耗的中间产物。 */
    private List<RewardGrantService.Reward> combineAll(String roleId, int slot) {
        var balances = balances(roleId);
        var net = new TreeMap<Integer, Long>();
        for (var jewel : rules.forSlot(slot)) {
            if (jewel.recipe().isEmpty()) {
                continue;
            }
            long count = jewel.recipe().stream().mapToLong(material ->
                balances.getOrDefault(material.itemId(), 0L) / material.quantity()).min().orElseThrow();
            if (count == 0) {
                continue;
            }
            applyRecipe(roleId, jewel, count);
            for (var material : jewel.recipe()) {
                long cost = Math.multiplyExact(count, material.quantity());
                balances.merge(material.itemId(), -cost, Math::addExact);
                net.merge(material.itemId(), -cost, Math::addExact);
            }
            balances.merge(jewel.itemId(), count, Math::addExact);
            net.merge(jewel.itemId(), count, Math::addExact);
        }
        return net.entrySet().stream().filter(entry -> entry.getValue() > 0)
            .map(entry -> new RewardGrantService.Reward(entry.getKey(), entry.getValue())).toList();
    }

    /** 扣完配方所有材料后写实际成品，任一不足都会抛出并回滚整笔。 */
    private void applyRecipe(String roleId, HeroJewelRules.Jewel jewel, long count) {
        for (var material : jewel.recipe()) {
            debit(roleId, material.itemId(), Math.multiplyExact(count, material.quantity()));
        }
        inventory.credit(roleId, jewel.itemId(), count);
    }

    /** 取同一角色锁事务下的普通堆叠数量，暂计量只用于批量规划。 */
    private Map<Integer, Long> balances(String roleId) {
        return inventory.list(roleId).stream()
            .collect(Collectors.toMap(InventoryService.Item::itemId, InventoryService.Item::quantity));
    }

    /** 单槽修改时检查玩家所见原模板，避免旧窗口误卸刚换上的另一颗。 */
    private static void requireExpected(HeroJewelRepository.Item current, int expectedItemId) {
        int actual = current == null ? 0 : current.templateId();
        if (actual != expectedItemId) {
            throw error(HttpStatus.CONFLICT, "HERO_JEWEL_CHANGED");
        }
    }

    /** 余额不足使用稳定宝石错误，库存层不会部分扣除。 */
    private void debit(String roleId, int itemId, long quantity) {
        if (!inventory.debit(roleId, itemId, quantity)) {
            throw error(HttpStatus.CONFLICT, "HERO_JEWEL_NOT_AVAILABLE");
        }
    }

    /** 从当前角色读取原回执，当前资产状态不能改变历史结果。 */
    private Receipt previous(String roleId, String requestId) {
        return jdbc.query("SELECT receipt_json FROM game_hero_jewel_request WHERE role_id=? AND request_id=?",
            rows -> rows.next() ? mapper.readValue(rows.getString(1), Receipt.class) : null, roleId, requestId);
    }

    /** 校验每个动作的领域参数，预览版本只用于一键合成且须是客户端可精确表示的整数。 */
    private static void requireValid(Request request) {
        if (request == null || !validUuid(request.requestId()) || request.action() == null) {
            throw error(HttpStatus.BAD_REQUEST, "INVALID_HERO_JEWEL_REQUEST");
        }
        boolean hero = validUuid(request.heroId());
        boolean validSlot = request.slot() >= 1 && request.slot() <= 3;
        boolean valid = switch (request.action()) {
            case EQUIP -> hero && validSlot && request.itemId() > 0 && request.expectedItemId() >= 0 && request.count() == 0;
            case UNEQUIP -> hero && validSlot && request.itemId() == 0 && request.expectedItemId() > 0 && request.count() == 0;
            case EQUIP_ALL, UNEQUIP_ALL -> hero && request.slot() == 0 && request.itemId() == 0
                && request.expectedItemId() == 0 && request.count() == 0;
            case COMBINE -> request.heroId() == null && request.slot() == 0 && request.itemId() > 0
                && request.expectedItemId() == 0 && request.count() > 0;
            case COMBINE_ALL -> request.heroId() == null && validSlot && request.itemId() == 0
                && request.expectedItemId() == 0 && request.count() == 0;
        };
        Long expectedRevision = request.expectedRevision();
        if (!valid || (expectedRevision != null && (request.action() != Action.COMBINE_ALL
                || expectedRevision < 0 || expectedRevision > 9_007_199_254_740_991L))) {
            throw error(HttpStatus.BAD_REQUEST, "INVALID_HERO_JEWEL_REQUEST");
        }
    }

    /** 身份必须是规范小写 UUID，不将配置编号当实例。 */
    private static boolean validUuid(String value) {
        return value != null && value.matches(UUID);
    }

    /** 长连接错误映射复用项目统一业务码。 */
    private static ResponseStatusException error(HttpStatus status, String code) {
        return new ResponseStatusException(status, code);
    }
}
