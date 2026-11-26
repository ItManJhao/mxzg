/**
 * 公会科技的权威读写入口。按角色保存四职业的个人进度，
 * 点亮、扣费、重置返还、战力和幂等回执一起提交。
 */
package com.funsgamex.mxzg.guild;

import com.funsgamex.mxzg.guild.GuildTechnologyRepository.Header;
import com.funsgamex.mxzg.guild.GuildTechnologyRepository.Stored;
import com.funsgamex.mxzg.guild.GuildTechnologyRules.Progress;
import com.funsgamex.mxzg.hero.HeroMainPowerService;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.network.AssetSyncService;
import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
import com.funsgamex.mxzg.role.RoleRepository;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class GuildTechnologyService {
    /** 回执保留原操作类型，点亮和重置不能共用同一个请求号。 */
    private static final String UPGRADE = "upgrade";
    /** 清除一个职业格并返还其实际累积材料的操作类型。 */
    private static final String RESET = "reset";

    /** 角色确认的操作编号、职业及当时的科技树版本。 */
    public record Command(String requestId, int profession, long expectedVersion) {}

    /** 该槽实际点亮等级、每次提升和当前累计值。百分比属性为万分数，速度为原数值。 */
    public record Node(int slot, int attributeId, int level, int increment, long total) {}

    /** 旧表下一格的准确价格；blocked 表示跨阶时职业等级差过大。 */
    public record Next(int stage, int slot, long gold, long medals, boolean blocked) {}

    /** 单职业进度，满级时 next 为空，返还为重置此职业的原表成本。 */
    public record Branch(int profession, int stage, int step, List<Node> nodes, Next next,
                         long refundGold, long refundMedals) {}

    /** 整棵树的当前状态。member 决定入会资格，并决定已学属性当前是否生效。 */
    public record State(long version, boolean member, int maxStage, int stageGap, long resetDiamonds,
                        List<Branch> branches) {}

    /** 原操作和其资产版本不变，state 返回当前快照，避免旧回执覆盖更新后的树。 */
    public record Receipt(String requestId, String action, int profession, long version, long assetRevision,
                          State state) {}

    /** 公会等级开放判定与成员读口。 */
    private final GuildService guildAccess;
    /** 角色当前所属公会。点亮期间与公会业务共享角色锁。 */
    private final GuildRepository guilds;
    /** 科技版本、各职业进度及持久回执。 */
    private final GuildTechnologyRepository technology;
    /** 原资料中的四职业、各格升级成本和重置报价。 */
    private final GuildTechnologyRules rules;
    /** 唯一角色资产锁与钱包。 */
    private final RoleRepository roles;
    /** 真实公会贡献所在的普通背包堆叠。 */
    private final InventoryService inventory;
    /** 读取更新后的英雄面板，维护当前主阵容战力和历史峰值。 */
    private final HeroMainPowerService power;
    /** 事务提交后下发同版钱包、贡献、面板和战力。 */
    private final AssetSyncService assets;

    /** 注入同角色事务依赖并复用实际资产和战力来源。 */
    GuildTechnologyService(GuildService guildAccess, GuildRepository guilds, GuildTechnologyRepository technology,
                           GuildTechnologyRules rules, RoleRepository roles, InventoryService inventory,
                           HeroMainPowerService power, AssetSyncService assets) {
        this.guildAccess = guildAccess;
        this.guilds = guilds;
        this.technology = technology;
        this.rules = rules;
        this.roles = roles;
        this.inventory = inventory;
        this.power = power;
        this.assets = assets;
    }

    /** 从服务端已鉴权角色读取个人科技。离会后仍可同步保留的进度及暂停状态。 */
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public State info(String roleId) {
        guildAccess.requireAccess(roleId);
        return state(roleId);
    }

    /** 点亮当前职业的下一原始格。实际扣费和入会资格都在同一角色锁内核对。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Receipt upgrade(String roleId, Command input) {
        return apply(roleId, input, UPGRADE);
    }

    /** 重置已点亮的一个职业，使用全职业累计的钻石报价并退回这一分支的材料。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Receipt reset(String roleId, Command input) {
        return apply(roleId, input, RESET);
    }

    /** 同一事务先核对复用请求或期望版本，再消费、保存、重算并冻结成功回执。 */
    private Receipt apply(String roleId, Command input, String action) {
        if (input == null || !RewardReceiptPayloads.validId(input.requestId()) || input.expectedVersion() < 0
                || !rules.validProfession(input.profession())) {
            throw GuildService.invalid("GUILD_TECHNOLOGY_REQUEST_INVALID");
        }
        roles.lock(roleId);
        guildAccess.requireAccess(roleId);
        var previous = technology.receipt(roleId, input.requestId());
        if (previous != null) {
            if (!previous.action().equals(action) || previous.profession() != input.profession()
                    || previous.previousVersion() != input.expectedVersion()) {
                throw reject("GUILD_TECHNOLOGY_REQUEST_CONFLICT");
            }
            return receipt(roleId, input.requestId(), previous);
        }

        var header = technology.header(roleId);
        if (header.version() != input.expectedVersion()) {
            throw reject("GUILD_TECHNOLOGY_CHANGED");
        }
        var trained = technology.progress(roleId);
        var current = trained.getOrDefault(input.profession(), rules.initialProgress());
        int resets = header.resetsCompleted();
        Progress updated;
        if (UPGRADE.equals(action)) {
            updated = unlock(roleId, current, minimumStage(trained));
        } else {
            updated = refund(roleId, current, resets);
            resets = Math.incrementExact(resets);
        }
        long version = Math.incrementExact(header.version());
        technology.saveProgress(roleId, input.profession(), updated);
        technology.saveHeader(roleId, new Header(version, resets));
        power.observe(roleId);
        assets.changed(roleId);
        var stored = new Stored(action, input.profession(), header.version(), version, roles.revision(roleId));
        technology.saveReceipt(roleId, input.requestId(), stored);
        return receipt(roleId, input.requestId(), stored);
    }

    /** 扣除原格的两种资产。任一余额不足抛业务失败，之前的扣费也随事务回滚。 */
    private Progress unlock(String roleId, Progress current, int minimumStage) {
        if (guilds.memberGuild(roleId) == null) {
            throw reject("GUILD_NOT_MEMBER");
        }
        var target = rules.next(current);
        if (target == null) {
            throw reject("GUILD_TECHNOLOGY_MAX");
        }
        if (blocked(current, target, minimumStage)) {
            throw reject("GUILD_TECHNOLOGY_STAGE_GAP");
        }
        var cost = rules.cost(target);
        if (!roles.debitGold(roleId, cost.gold()) || !inventory.debit(roleId, GuildDonationRules.MEDALS_ITEM_ID, cost.medals())) {
            throw reject("GUILD_TECHNOLOGY_COST_INSUFFICIENT");
        }
        return target;
    }

    /** 验证已点亮后才扣钻石，并用真实钱包与库存分别返还材料。 */
    private Progress refund(String roleId, Progress current, int resets) {
        if (current.step() == 0) {
            throw reject("GUILD_TECHNOLOGY_NOT_TRAINED");
        }
        if (!roles.debitDiamonds(roleId, rules.resetDiamonds(resets))) {
            throw reject("GUILD_TECHNOLOGY_DIAMONDS_INSUFFICIENT");
        }
        var returned = rules.refund(current);
        roles.creditCurrency(roleId, returned.gold(), 0);
        inventory.credit(roleId, GuildDonationRules.MEDALS_ITEM_ID, returned.medals());
        return rules.initialProgress();
    }

    /** 使用相同规则投影所有分支和当前报价。资产余额来自统一登录及变化快照。 */
    private State state(String roleId) {
        var header = technology.header(roleId);
        var trained = technology.progress(roleId);
        int minimumStage = minimumStage(trained);
        return new State(header.version(), guilds.memberGuild(roleId) != null, rules.maxStage(), rules.stageGap(),
                rules.resetDiamonds(header.resetsCompleted()), rules.professions().stream()
                .map(profession -> branch(profession, trained.getOrDefault(profession, rules.initialProgress()), minimumStage))
                .toList());
    }

    /** 科技节点显示已点亮的实际等级，当前阶未点亮的格沿用前一阶。 */
    private Branch branch(int profession, Progress current, int minimumStage) {
        var nodes = rules.abilities(profession).stream().map(ability -> {
            int level = current.stage() - (ability.slot() <= current.step() ? 0 : 1);
            return new Node(ability.slot(), ability.attributeId(), level, ability.perLevel(), (long) level * ability.perLevel());
        }).toList();
        var target = rules.next(current);
        Next next = null;
        if (target != null) {
            var cost = rules.cost(target);
            next = new Next(target.stage(), target.step(), cost.gold(), cost.medals(), blocked(current, target, minimumStage));
        }
        var returned = rules.refund(current);
        return new Branch(profession, current.stage(), current.step(), nodes, next, returned.gold(), returned.medals());
    }

    /** 初始分支也计入当前四职业最低阶数。 */
    private int minimumStage(Map<Integer, Progress> trained) {
        return rules.professions().stream().mapToInt(id -> trained.getOrDefault(id, rules.initialProgress()).stage())
                .min().orElseThrow();
    }

    /** 原规则仅在跨阶点亮第一格时检查所有职业间的阶数差。 */
    private boolean blocked(Progress current, Progress target, int minimumStage) {
        return target.stage() > current.stage() && target.stage() - minimumStage > rules.stageGap();
    }

    /** 重试保留原提交版本，同时附带当前树与成员状态。 */
    private Receipt receipt(String roleId, String requestId, Stored stored) {
        return new Receipt(requestId, stored.action(), stored.profession(), stored.version(), stored.assetRevision(), state(roleId));
    }

    /** 映射为可预期业务拒绝，统一显示错误飘字。 */
    private static ResponseStatusException reject(String code) {
        return new ResponseStatusException(HttpStatus.CONFLICT, code);
    }
}
