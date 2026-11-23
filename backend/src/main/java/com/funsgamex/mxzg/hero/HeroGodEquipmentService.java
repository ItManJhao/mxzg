/**
 * 神装穿戴、换装、卸下和旧版探宝的资产事务。
 * 通过认证和角色锁保护真实实例，保存原操作回执并通过统一快照交付。
 */
package com.funsgamex.mxzg.hero;

import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.network.AssetSyncService;
import com.funsgamex.mxzg.role.RoleProfile;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.time.GameClock;
import com.funsgamex.mxzg.world.WorldLevelService;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.ThreadLocalRandom;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class HeroGodEquipmentService {
    /** 穿戴会替换原同槽实例；卸下只清除请求指定的当前实例关系。 */
    public enum Action { EQUIP, UNEQUIP }
    /** 请求携带实际 UUID 及已见槽位实例，未穿的槽位和卸下都省略 expectedInstanceId。 */
    public record Request(String requestId, String heroId, int slot, Action action, String instanceId,
                          String expectedInstanceId) {}
    /** 已提交原操作的身份与持久资产版本。 */
    public record Receipt(String requestId, String roleId, String heroId, int slot, Action action, String instanceId,
                          String expectedInstanceId, long assetRevision) {}
    /** 单抽或十连，maxDiamonds 是玩家本次接受的最高扣钻金额，零表示只接受免费或券。 */
    public record DrawRequest(String requestId, int count, long maxDiamonds) {}
    /** 一次原结果的同模板数量，神装各实例详情仍从统一快照读取。 */
    public record DrawReward(int templateId, int quantity) {}
    /** 本次真实扣钻金额、业务版本与结果，重复操作不会重抽。 */
    public record DrawReceipt(String requestId, String roleId, int count, long diamondsPaid, long assetRevision,
                              List<DrawReward> rewards) {}
    /** 同一次快照的解锁门槛、独立库存、探宝和商店状态。 */
    public record State(int requiredRoleLevel, int requiredWorldLevel, int requiredHeroStar, int worldLevel,
                        List<GodEquipmentRepository.Item> items, int drawCount, boolean freeDraw,
                        HeroGodEquipmentShopService.State shop) {}
    /** 持久保底计数与领取免费机会的上海自然日，null 表示尚未领取。 */
    private record Lottery(int drawCount, Long lastFreeDay) {}
    /** 探宝回执内部额外记录原最大扣钻陈述，用于区分重放和不同意图。 */
    private record StoredDraw(int count, long maxDiamonds, long diamondsPaid, long revision) {}

    /** 请求、装备和英雄都是持久小写 UUID。 */
    private static final Pattern UUID = Pattern.compile("[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}");
    /** 每日免费按服务器自然日重置。 */
    private static final ZoneId SERVER_ZONE = ZoneId.of("Asia/Shanghai");
    /** 神装使用专属独立实例库存，附加属性不从普通堆叠推断。 */
    private final GodEquipmentRepository equipment;
    /** 神装和探宝的可信配置源。 */
    private final GodEquipmentRules rules;
    /** 持久会话身份，在等待角色锁后再次确认。 */
    private final SessionService sessions;
    /** 角色等级、金币钱包和资产版本提供方。 */
    private final RoleRepository roles;
    /** 当前角色的实时英雄列表供校验归属、星级和阵容。 */
    private final HeroRepository heroes;
    /** 同世界等级维护服务读取本角色所属区服的等级。 */
    private final WorldLevelService worldLevels;
    /** 本玩法抽奖券和其它普通奖励材料使用唯一堆叠库存。 */
    private final InventoryService inventory;
    /** 同一次事务递增资产版本，提交后通知当前连接。 */
    private final AssetSyncService sync;
    /** 当前上阵英雄换装后重新观察阵容战力峰值。 */
    private final HeroMainPowerService powers;
    /** 统一运营游戏时间供每日免费边界判断。 */
    private final GameClock clock;
    /** 存储探宝计数与持久命令回执。 */
    private final JdbcTemplate jdbc;
    /** 从同一事务观察商城周期与当前购买次数。 */
    private final HeroGodEquipmentShopService shop;

    /** 注入角色、神装、钱包及快照依赖。服务自身不缓存角色状态。 */
    public HeroGodEquipmentService(GodEquipmentRepository equipment, GodEquipmentRules rules, SessionService sessions,
                                   RoleRepository roles, HeroRepository heroes, WorldLevelService worldLevels,
                                   InventoryService inventory, AssetSyncService sync, HeroMainPowerService powers,
                                   GameClock clock, JdbcTemplate jdbc, HeroGodEquipmentShopService shop) {
        this.equipment = equipment;
        this.rules = rules;
        this.sessions = sessions;
        this.roles = roles;
        this.heroes = heroes;
        this.worldLevels = worldLevels;
        this.inventory = inventory;
        this.sync = sync;
        this.powers = powers;
        this.clock = clock;
        this.jdbc = jdbc;
        this.shop = shop;
    }

    /** 统一快照读取当前神装、探宝和商城状态，调用方已持有角色锁。 */
    public State state(String roleId) {
        var role = roles.findById(roleId).orElseThrow();
        var lottery = lottery(roleId);
        return new State(rules.requiredRoleLevel(), rules.requiredWorldLevel(), rules.requiredHeroStar(),
                worldLevels.current(role.serverId()).level(), equipment.list(roleId), lottery.drawCount(),
                free(lottery, currentDay()), shop.state(roleId));
    }

    /** 在同一事务校验资产和位置并提交穿卸。重复编号同参返回原回执，异参拒绝。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Receipt change(String token, Request request) {
        validate(request);
        var role = lockRole(token);
        var previous = findChange(role.id(), request.requestId());
        if (previous != null) {
            if (!previous.heroId().equals(request.heroId()) || previous.slot() != request.slot()
                    || previous.action() != request.action() || !previous.instanceId().equals(request.instanceId())
                    || !Objects.equals(previous.expectedInstanceId(), request.expectedInstanceId())) {
                throw failure(HttpStatus.CONFLICT, "IDEMPOTENCY_CONFLICT");
            }
            return previous;
        }
        var hero = heroes.find(role.id(), request.heroId()).orElseThrow(() -> failure(HttpStatus.NOT_FOUND, "HERO_NOT_FOUND"));
        var list = equipment.list(role.id());
        var item = list.stream().filter(row -> row.instanceId().equals(request.instanceId()) && row.slot() == request.slot())
                .findFirst().orElseThrow(() -> failure(HttpStatus.NOT_FOUND, "GOD_EQUIPMENT_NOT_FOUND"));
        if (request.action() == Action.EQUIP) {
            wear(role, hero, item, list, request.expectedInstanceId());
        } else {
            if (!hero.id().equals(item.heroId())) {
                throw failure(HttpStatus.CONFLICT, "GOD_EQUIPMENT_CHANGED");
            }
            equipment.remove(role.id(), item.instanceId(), hero.id());
        }
        sync.changed(role.id());
        if (hero.deployed()) {
            powers.observe(role.id());
        }
        var receipt = new Receipt(request.requestId(), role.id(), hero.id(), item.slot(), request.action(),
                item.instanceId(), request.expectedInstanceId(), roles.revision(role.id()));
        jdbc.update("""
                INSERT INTO game_god_equipment_change(role_id,request_id,hero_id,slot,action,instance_id,expected_instance_id,asset_revision)
                VALUES (?,?,?,?,?,?,?,?)
                """, receipt.roleId(), receipt.requestId(), receipt.heroId(), receipt.slot(), receipt.action().name(),
                receipt.instanceId(), receipt.expectedInstanceId(), receipt.assetRevision());
        return receipt;
    }

    /** 验证旧穿戴门槛、背包归属和已见同槽，原件返回后才绑定新件。 */
    private void wear(RoleProfile role, HeroProfile hero, GodEquipmentRepository.Item item,
                      List<GodEquipmentRepository.Item> items, String expected) {
        requireRoleGate(role);
        if (hero.star() < rules.requiredHeroStar()) {
            throw failure(HttpStatus.CONFLICT, "GOD_EQUIPMENT_HERO_STAR");
        }
        if (item.heroId() != null) {
            throw failure(HttpStatus.CONFLICT, "GOD_EQUIPMENT_ALREADY_WORN");
        }
        var original = items.stream().filter(row -> row.slot() == item.slot() && hero.id().equals(row.heroId()))
                .findFirst().orElse(null);
        if (!Objects.equals(expected, original == null ? null : original.instanceId())) {
            throw failure(HttpStatus.CONFLICT, "GOD_EQUIPMENT_CHANGED");
        }
        if (original != null) {
            equipment.remove(role.id(), original.instanceId(), hero.id());
        }
        equipment.wear(role.id(), item.instanceId(), hero.id());
    }

    /** 旧版探宝单抽/十连。扣费、保底计数、开出实例、奖励和回执共用一次提交。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public DrawReceipt draw(String token, DrawRequest request) {
        if (request == null || !uuid(request.requestId()) || request.count() != 1 && request.count() != 10
                || request.maxDiamonds() < 0 || request.maxDiamonds() > rules.drawCost().diamondsTen()) {
            throw failure(HttpStatus.BAD_REQUEST, "GOD_EQUIPMENT_DRAW_INVALID");
        }
        var role = lockRole(token);
        var stored = findDraw(role.id(), request);
        if (stored != null) {
            return stored;
        }
        requireRoleGate(role);
        var current = lottery(role.id());
        long day = currentDay();
        boolean useFree = request.count() == 1 && free(current, day);
        long diamonds = useFree ? 0 : chargeDraw(role.id(), request);
        int drawCount = current.drawCount();
        var claimed = new LinkedHashMap<Integer, Integer>();
        var random = ThreadLocalRandom.current();
        for (int index = 0; index < request.count(); index++) {
            boolean guarantee = ++drawCount >= rules.drawCost().guarantee();
            var reward = rules.draw(guarantee, random);
            if (guarantee) {
                drawCount = 0;
            }
            var definition = rules.find(reward.templateId());
            if (definition == null) {
                inventory.credit(role.id(), reward.templateId(), reward.quantity());
            } else {
                for (int instance = 0; instance < reward.quantity(); instance++) {
                    equipment.create(role.id(), definition, rules.rollModifiers(definition, random));
                }
            }
            claimed.merge(reward.templateId(), reward.quantity(), Math::addExact);
        }
        Long freeDay = useFree ? Long.valueOf(day) : current.lastFreeDay();
        if (jdbc.update("UPDATE game_god_equipment_lottery SET draw_count=?,last_free_day=? WHERE role_id=?",
                drawCount, freeDay, role.id()) == 0) {
            jdbc.update("INSERT INTO game_god_equipment_lottery(role_id,draw_count,last_free_day) VALUES (?,?,?)",
                    role.id(), drawCount, freeDay);
        }
        sync.changed(role.id());
        var rewards = claimed.entrySet().stream().map(entry -> new DrawReward(entry.getKey(), entry.getValue())).toList();
        long revision = roles.revision(role.id());
        saveDraw(role.id(), request, diamonds, revision, rewards);
        return new DrawReceipt(request.requestId(), role.id(), request.count(), diamonds, revision, rewards);
    }

    /** 按原版一次性使用足额券，缺券才整笔扣钻。不得超出确认金额。 */
    private long chargeDraw(String roleId, DrawRequest request) {
        var cost = rules.drawCost();
        int tokens = request.count() == 1 ? cost.ticketsOne() : cost.ticketsTen();
        if (inventory.debit(roleId, cost.ticket(), tokens)) {
            return 0;
        }
        long diamonds = request.count() == 1 ? cost.diamondsOne() : cost.diamondsTen();
        if (diamonds > request.maxDiamonds()) {
            throw failure(HttpStatus.CONFLICT, "GOD_EQUIPMENT_DRAW_PRICE_CHANGED");
        }
        if (!roles.debitDiamonds(roleId, diamonds)) {
            throw failure(HttpStatus.CONFLICT, "NOT_ENOUGH_DIAMONDS");
        }
        return diamonds;
    }

    /** 角色与世界等级按旧装备/探宝门槛读取，卸下操作不受后续门槛变化影响。 */
    private void requireRoleGate(RoleProfile role) {
        if (role.level() < rules.requiredRoleLevel()) {
            throw failure(HttpStatus.CONFLICT, "GOD_EQUIPMENT_ROLE_LEVEL");
        }
        if (worldLevels.current(role.serverId()).level() < rules.requiredWorldLevel()) {
            throw failure(HttpStatus.CONFLICT, "GOD_EQUIPMENT_WORLD_LEVEL");
        }
    }

    /** 在角色锁内重新鉴权，防止过期连接提交刚排队的资产变更。 */
    private RoleProfile lockRole(String token) {
        String roleId = sessions.requireRole(token);
        roles.lock(roleId);
        if (!roleId.equals(sessions.requireRole(token))) {
            throw failure(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED");
        }
        return roles.findById(roleId).orElseThrow();
    }

    /** 查询已提交的穿卸回执，旧物品被换下后仍按原参数交付。 */
    private Receipt findChange(String roleId, String requestId) {
        return jdbc.query("""
                SELECT hero_id,slot,action,instance_id,expected_instance_id,asset_revision
                FROM game_god_equipment_change WHERE role_id=? AND request_id=?
                """, row -> row.next() ? new Receipt(requestId, roleId, row.getString("hero_id"), row.getInt("slot"),
                Action.valueOf(row.getString("action")), row.getString("instance_id"), row.getString("expected_instance_id"),
                row.getLong("asset_revision")) : null, roleId, requestId);
    }

    /** 读原抽奖参数和持久结果，确认同号请求没有改变此单。 */
    private DrawReceipt findDraw(String roleId, DrawRequest request) {
        var row = jdbc.query("""
                SELECT draw_quantity,max_diamonds,diamonds_paid,asset_revision
                FROM game_god_equipment_lottery_request WHERE role_id=? AND request_id=?
                """, value -> value.next() ? new StoredDraw(value.getInt(1), value.getLong(2), value.getLong(3),
                value.getLong(4)) : null, roleId, request.requestId());
        if (row == null) {
            return null;
        }
        if (row.count() != request.count() || row.maxDiamonds() != request.maxDiamonds()) {
            throw failure(HttpStatus.CONFLICT, "IDEMPOTENCY_CONFLICT");
        }
        var rewards = jdbc.query("""
                SELECT template_id,quantity FROM game_god_equipment_lottery_reward
                WHERE role_id=? AND request_id=? ORDER BY position
                """, (value, index) -> new DrawReward(value.getInt(1), value.getInt(2)), roleId, request.requestId());
        return new DrawReceipt(request.requestId(), roleId, row.count(), row.diamondsPaid(), row.revision(), List.copyOf(rewards));
    }

    /** 按首次获得顺序持久化本次奖励摘要，断线重放不会重新随机。 */
    private void saveDraw(String roleId, DrawRequest request, long diamonds, long revision, List<DrawReward> rewards) {
        jdbc.update("""
                INSERT INTO game_god_equipment_lottery_request(role_id,request_id,draw_quantity,max_diamonds,diamonds_paid,asset_revision)
                VALUES (?,?,?,?,?,?)
                """, roleId, request.requestId(), request.count(), request.maxDiamonds(), diamonds, revision);
        for (int index = 0; index < rewards.size(); index++) {
            var award = rewards.get(index);
            jdbc.update("""
                    INSERT INTO game_god_equipment_lottery_reward(role_id,request_id,position,template_id,quantity)
                    VALUES (?,?,?,?,?)
                    """, roleId, request.requestId(), index + 1, award.templateId(), award.quantity());
        }
    }

    /** 读取探宝历史数据，角色尚未探宝时直接投影真实初值。 */
    private Lottery lottery(String roleId) {
        return jdbc.query("SELECT draw_count,last_free_day FROM game_god_equipment_lottery WHERE role_id=?", rows -> {
            if (!rows.next()) {
                return new Lottery(0, null);
            }
            int count = rows.getInt(1);
            long day = rows.getLong(2);
            if (count < 0 || count >= rules.drawCost().guarantee()) {
                throw new IllegalStateException("持久神装保底计数无效");
            }
            return new Lottery(count, rows.wasNull() ? null : day);
        }, roleId);
    }

    /** 同一上海自然日内最多使用一次免费机会。 */
    private static boolean free(Lottery lottery, long day) {
        return lottery.lastFreeDay() == null || lottery.lastFreeDay() < day;
    }

    /** 返回游戏服当前上海自然日，避免依赖主机时区。 */
    private long currentDay() {
        return clock.instant().atZone(SERVER_ZONE).toLocalDate().toEpochDay();
    }

    /** 严格核对客户端意图形状，业务门槛只信任事务内状态。 */
    private static void validate(Request request) {
        if (request == null || !uuid(request.requestId()) || !uuid(request.heroId()) || !uuid(request.instanceId())
                || request.slot() < 1 || request.slot() > 4 || request.action() == null
                || request.expectedInstanceId() != null && (!uuid(request.expectedInstanceId())
                || request.action() != Action.EQUIP)) {
            throw failure(HttpStatus.BAD_REQUEST, "GOD_EQUIPMENT_CHANGE_INVALID");
        }
    }

    /** 所有领域身份都使用仓库已有的小写 UUID 表示。 */
    private static boolean uuid(String value) {
        return value != null && UUID.matcher(value).matches();
    }

    /** 业务拒绝以稳定错误码返回长连接错误映射。 */
    private static ResponseStatusException failure(HttpStatus status, String code) {
        return new ResponseStatusException(status, code);
    }
}
