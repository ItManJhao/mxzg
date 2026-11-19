/**
 * 普通四槽装备的穿脱和一键选装，由认证长连接调用。
 * 在同一角色锁事务中扣回真实堆叠库存，更新槽位、资产版本和原回执。装备来源与归属由服务端确认。
 */
package com.funsgamex.mxzg.hero;

import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.role.RoleRepository;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class HeroEquipmentService {
    /** 影响普通装备四个槽位的业务操作。 */
    public enum Action { EQUIP, UNEQUIP, EQUIP_ALL, UNEQUIP_ALL }

    /** 双方提交同一个请求标识。单穿用背包堆叠 ID，单脱用穿戴槽位 ID、位置和所见装备模板。 */
    public record Request(String requestId, String heroId, Action action, String equipmentId, int slot,
                          int expectedTemplateId) {}

    /** 原操作和提交时的统一资产版本。changed=false 表示原请求当时已没有需要改变的内容。 */
    public record Receipt(String requestId, String roleId, String heroId, Action action, String equipmentId, int slot,
                          int expectedTemplateId, long assetRevision, boolean changed) {}

    /** 英雄实例和请求编号持久化为小写 UUID。 */
    private static final String UUID_PATTERN = "[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}";
    /** 认证决定角色归属，等待角色锁结束后重新校验。 */
    private final SessionService sessions;
    /** 角色行锁与版本入口。 */
    private final RoleRepository roles;
    /** 当前角色的真实英雄入口，不接纳其他角色可见实例。 */
    private final HeroRepository heroes;
    /** 背包持有普通装备堆叠，扣回时使用统一资产版本及提交后通知。 */
    private final InventoryService inventory;
    /** 普通装备槽位持久入口，换装不覆盖槽位附魂。 */
    private final HeroEquipmentRepository equipment;
    /** 从装备配置和评分表读取槽位和一键择优顺序。 */
    private final HeroEquipmentRules rules;
    /** 同角色的固定请求结果持久化入口。 */
    private final JdbcTemplate jdbc;
    /** 已在主阵容中的英雄换装后刷新历史阵容战力。 */
    private final HeroMainPowerService powers;

    /** 注入唯一资产入口，装备服务不持有资源副本。 */
    public HeroEquipmentService(SessionService sessions, RoleRepository roles, HeroRepository heroes,
                                InventoryService inventory, HeroEquipmentRepository equipment,
                                HeroEquipmentRules rules, JdbcTemplate jdbc, HeroMainPowerService powers) {
        this.sessions = sessions;
        this.roles = roles;
        this.heroes = heroes;
        this.inventory = inventory;
        this.equipment = equipment;
        this.rules = rules;
        this.jdbc = jdbc;
        this.powers = powers;
    }

    /** 认证执行一次装备操作并记录上阵战力峰值；重复同参返回原结果，冲突拒绝整笔。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Receipt change(String token, Request request) {
        requireValid(request);
        String roleId = sessions.requireRole(token);
        roles.lock(roleId);
        if (!roleId.equals(sessions.requireRole(token))) {
            throw error(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED");
        }
        Receipt previous = findReceipt(roleId, request.requestId());
        if (previous != null) {
            if (!previous.heroId().equals(request.heroId()) || previous.action() != request.action()
                    || !Objects.equals(previous.equipmentId(), request.equipmentId()) || previous.slot() != request.slot()
                    || previous.expectedTemplateId() != request.expectedTemplateId()) {
                throw error(HttpStatus.CONFLICT, "IDEMPOTENCY_CONFLICT");
            }
            return previous;
        }
        String heroId = request.heroId();
        var hero = heroes.find(roleId, heroId).orElseThrow(() -> error(HttpStatus.NOT_FOUND, "HERO_NOT_FOUND"));
        var slots = new TreeMap<Integer, HeroEquipmentRepository.Slot>();
        for (var slot : equipment.slots(roleId, heroId)) {
            slots.put(slot.slot(), slot);
        }
        boolean changed = switch (request.action()) {
            case EQUIP -> equipOne(roleId, heroId, request.equipmentId(), slots);
            case EQUIP_ALL -> equipAll(roleId, heroId, slots);
            case UNEQUIP -> unequipOne(roleId, heroId, request, slots.get(request.slot()));
            case UNEQUIP_ALL -> unequipAll(roleId, heroId, slots.values().stream().toList());
        };
        if (changed && hero.deployed()) {
            powers.observe(roleId);
        }
        var receipt = new Receipt(request.requestId(), roleId, heroId, request.action(), request.equipmentId(),
                request.slot(), request.expectedTemplateId(), roles.revision(roleId), changed);
        saveReceipt(receipt);
        return receipt;
    }

    /** 从自己背包的真实堆叠选取一件，人工换装允许选择低分的装备。 */
    private boolean equipOne(String roleId, String heroId, String stackId, Map<Integer, HeroEquipmentRepository.Slot> slots) {
        InventoryService.Item bagItem = inventory.list(roleId).stream()
                .filter(item -> stackId.equals(item.instanceId())).findFirst()
                .orElseThrow(() -> error(HttpStatus.CONFLICT, "EQUIPMENT_NOT_AVAILABLE"));
        var definition = rules.find(bagItem.itemId());
        if (definition == null) {
            throw error(HttpStatus.CONFLICT, "EQUIPMENT_NOT_AVAILABLE");
        }
        var previous = slots.get(definition.slot());
        if (previous != null && previous.equipped() && previous.templateId() == definition.templateId()) {
            return false;
        }
        wear(roleId, heroId, definition, previous);
        return true;
    }

    /** 一键操作按旧版只选同槽严格增分装备，当前槽空时以零分起算。 */
    private boolean equipAll(String roleId, String heroId, Map<Integer, HeroEquipmentRepository.Slot> slots) {
        var best = new TreeMap<Integer, HeroEquipmentRules.Definition>();
        for (var item : inventory.list(roleId)) {
            var candidate = rules.find(item.itemId());
            if (candidate == null) {
                continue;
            }
            var currentBest = best.get(candidate.slot());
            long minimum = currentBest == null ? wornScore(slots.get(candidate.slot())) : currentBest.score();
            if (candidate.score() > minimum) {
                best.put(candidate.slot(), candidate);
            }
        }
        for (var definition : best.values()) {
            wear(roleId, heroId, definition, slots.get(definition.slot()));
        }
        return !best.isEmpty();
    }

    /** 单脱同时比对槽位 ID 和原模板，换装后迟到的操作不能摘掉新装备。 */
    private boolean unequipOne(String roleId, String heroId, Request request, HeroEquipmentRepository.Slot slot) {
        if (slot == null || !slot.equipped() || !slot.instanceId().equals(request.equipmentId())
                || slot.templateId() != request.expectedTemplateId()) {
            throw error(HttpStatus.CONFLICT, "HERO_EQUIPMENT_CHANGED");
        }
        unequip(roleId, heroId, slot);
        return true;
    }

    /** 一键卸下当前真实普通装备，已经为空的槽位不参与变更。 */
    private boolean unequipAll(String roleId, String heroId, List<HeroEquipmentRepository.Slot> slots) {
        boolean changed = false;
        for (var slot : slots) {
            if (slot.equipped()) {
                unequip(roleId, heroId, slot);
                changed = true;
            }
        }
        return changed;
    }

    /** 扣除本次装备后更新槽位，原装备以同模板数量一件归还，不新建附魂实例。 */
    private void wear(String roleId, String heroId, HeroEquipmentRules.Definition definition,
                      HeroEquipmentRepository.Slot previous) {
        if (!inventory.debit(roleId, definition.templateId(), 1)) {
            throw error(HttpStatus.CONFLICT, "EQUIPMENT_NOT_AVAILABLE");
        }
        equipment.wear(roleId, heroId, definition, previous);
        if (previous != null && previous.equipped()) {
            inventory.credit(roleId, previous.templateId(), 1);
        }
    }

    /** 归还一件并清空穿戴状态，留存原槽位及附魂。 */
    private void unequip(String roleId, String heroId, HeroEquipmentRepository.Slot slot) {
        inventory.credit(roleId, slot.templateId(), 1);
        equipment.remove(roleId, heroId, slot);
    }

    /** 按旧版使用单件评分比较，只读已穿戴的普通装备。 */
    private long wornScore(HeroEquipmentRepository.Slot slot) {
        return slot == null || !slot.equipped() ? 0 : rules.require(slot.templateId(), slot.slot()).score();
    }

    /** 从同一角色命令表读取冻结的原参数和原版本。 */
    private Receipt findReceipt(String roleId, String requestId) {
        return jdbc.query("SELECT hero_id,action,equipment_id,slot,expected_template_id,asset_revision,changed "
                + "FROM game_hero_equipment_request WHERE role_id=? AND request_id=?", rows -> {
            if (!rows.next()) {
                return null;
            }
            return new Receipt(requestId, roleId, rows.getString("hero_id"), Action.valueOf(rows.getString("action")),
                    rows.getString("equipment_id"), rows.getInt("slot"), rows.getInt("expected_template_id"),
                    rows.getLong("asset_revision"), rows.getBoolean("changed"));
        }, roleId, requestId);
    }

    /** 冻结成功回执，穿脱与回执在同一事务提交。 */
    private void saveReceipt(Receipt receipt) {
        jdbc.update("INSERT INTO game_hero_equipment_request(role_id,request_id,hero_id,action,equipment_id,slot,"
                        + "expected_template_id,asset_revision,changed) VALUES (?,?,?,?,?,?,?,?,?)",
                receipt.roleId(), receipt.requestId(), receipt.heroId(), receipt.action().name(), receipt.equipmentId(),
                receipt.slot(), receipt.expectedTemplateId(), receipt.assetRevision(), receipt.changed());
    }

    /** 只接收动作要求的字段；装备和背包 ID 保留原字符串格式。 */
    private static void requireValid(Request request) {
        if (request == null || !validUuid(request.requestId()) || !validUuid(request.heroId()) || request.action() == null) {
            throw error(HttpStatus.BAD_REQUEST, "INVALID_EQUIPMENT_REQUEST");
        }
        boolean valid = switch (request.action()) {
            case EQUIP -> validEquipmentId(request.equipmentId()) && request.slot() == 0 && request.expectedTemplateId() == 0;
            case UNEQUIP -> validEquipmentId(request.equipmentId()) && request.slot() >= 1 && request.slot() <= 4
                    && request.expectedTemplateId() > 0;
            case EQUIP_ALL, UNEQUIP_ALL -> request.equipmentId() == null && request.slot() == 0 && request.expectedTemplateId() == 0;
        };
        if (!valid) {
            throw error(HttpStatus.BAD_REQUEST, "INVALID_EQUIPMENT_REQUEST");
        }
    }

    /** 校验英雄和业务请求使用的标准持久 UUID。 */
    private static boolean validUuid(String id) {
        return id != null && id.matches(UUID_PATTERN);
    }

    /** 背包历史 stack: 标识及旧槽位长数字字符串均按原值传输。 */
    private static boolean validEquipmentId(String id) {
        return id != null && !id.isBlank() && id.length() <= 96 && id.chars().noneMatch(Character::isISOControl);
    }

    /** 提供稳定的业务失败码，回包不携带其他角色资料。 */
    private static ResponseStatusException error(HttpStatus status, String code) {
        return new ResponseStatusException(status, code);
    }
}
