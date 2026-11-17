/**
 * 配置化主线持久闭环：鉴权挑战、不可变Protobuf战报、通关待领奖和事务幂等结算。
 * 供主线WebSocket协议调用，登录快照统一恢复通关及里程碑已领集合，不调用旧简化CampaignBattle。
 */
package com.funsgamex.mxzg.campaign;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.hero.*;
import com.funsgamex.mxzg.network.AssetSyncService;
import com.funsgamex.mxzg.protocol.GameProtocol;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.reward.RewardGrantResult;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
public class MainChapterService {
    /** 持久记录版本，未来格式改变须显式兼容，不能重算旧战报。 */
    private static final int STORAGE_VERSION = 1;
    /** 回执中交付给客户端的整数必须精确可表达，超限在发奖事务提交前拒绝。 */
    private static final long MAX_SAFE_INTEGER = 9_007_199_254_740_991L;
    /** 鉴权角色，锁内再次确认会话未撤销。 */
    private final SessionService sessions;
    /** 角色锁、等级与资产版本。 */
    private final RoleRepository roles;
    /** 首次挑战同事务创建累计起点；正常失败战斗保留，已通关缺行不自愈。 */
    private final MainChapterIdleStateRepository idleStates;
    /** 唯一主线持久化连接。 */
    private final JdbcTemplate jdbc;
    /** 同源关卡门槛及进度转换。 */
    private final MainChapterRules rules;
    /** 服务端持久队伍评分，缺失属性仍保留标记。 */
    private final HeroMainPowerService powers;
    /** 当前完整技能战斗执行链，不使用客户端胜负。 */
    private final HeroLineupBattleService battles;
    /** 事务内奖励分发，与清待领奖共同提交。 */
    private final MainChapterRewardService rewards;
    /** 进度和资产写入共用版本；提交后通知，回滚不通知。 */
    private final AssetSyncService sync;
    /** 仅序列化数据库元信息；战报本身为Protobuf二进制。 */
    private final ObjectMapper mapper;

    /**
     * 当前主线状态与同角色锁内读取的真实里程碑集合，不由通关数推断已领。
     * @param maxCleared 当前已通关关卡，没有主线记录时为0。
     * @param pendingBattleId 尚待首通结算的战报；为空不代表里程碑已领取。
     * @param assetRevision 最新统一资产版本，历史回执中的值不能覆盖当前版本。
     * @param milestoneProgress 真实已领集合；旧历史回执缺字段时保留null，不补造空集。
     * @param challengeLimit 当前服务端新挑战上限；旧回执未记录时为null，不限制历史恢复。
     */
    public record State(int maxCleared, String pendingBattleId, long assetRevision,
                        MilestoneProgress milestoneProgress, Integer challengeLimit) {
        /** 旧手工历史状态保留缺失，不从当前配置补造当时的开放范围。 */
        public State(int maxCleared, String pendingBattleId, long assetRevision, MilestoneProgress milestoneProgress) {
            this(maxCleared, pendingBattleId, assetRevision, milestoneProgress, null);
        }

        /** 当前范围必须为正数；已有通关可高于新范围，不因此抹除历史进度。 */
        public State {
            if (challengeLimit != null && challengeLimit < 1) {
                throw new IllegalArgumentException("主线新挑战范围无效");
            }
        }
    }

    /**
     * 原额外奖励配置idx的冻结已领集合；旧领取允许乱序，不能压缩为最大已领ID。
     * @param schemaVersion 当前格式固定为1；未知历史格式拒绝，不按空集解释。
     * @param claimedIds 角色锁内读取的真实正配置ID；空集合表示该领域已同步且尚无领取记录。
     */
    public record MilestoneProgress(int schemaVersion, List<Integer> claimedIds) {
        /** 冻结明确集合并拒绝坏ID/重复项，旧State缺字段不经过此构造而保持null。 */
        public MilestoneProgress {
            if (schemaVersion != 1 || claimedIds == null
                    || claimedIds.stream().anyMatch(id -> id == null || id <= 0)
                    || claimedIds.stream().distinct().count() != claimedIds.size()) {
                throw new IllegalArgumentException("主线里程碑已领集合格式或配置ID无效");
            }
            claimedIds = List.copyOf(claimedIds);
        }
    }
    /** 挑战返回战报，或沿旧规则只补领奖，不在同一次请求继续打下一关。 */
    public enum Action { BATTLE, SETTLED }
    /** 可重复交付的历史回执；actual冻结真实基础/附赠，只供展示，缺失的旧结果不重算或补发。 */
    public record Receipt(Action action, String battleId, State state, List<MainChapterRules.Reward> rewards,
                          Experience experience, RewardGrantResult actual) {
        /** 结果冻结，重复请求不重算奖励。 */
        public Receipt { rewards = List.copyOf(rewards); }
    }
    /** 发奖事务前后经验快照，历史回执允许缺失；只能用于动画，不作为当前角色余额。 */
    public record Experience(int beforeLevel, long beforeExp, long beforeThreshold,
                             int afterLevel, long afterExp, long afterThreshold) {}
    /** 可恢复的战报元信息；历史字段mission保存全局关卡idx，rewardPlan和pending随生成时冻结。 */
    public record Details(int schemaVersion, int mission, long inputRevision, long lineupVersion,
                          int formationId, int power, List<String> pending, MainChapterRewardService.Plan rewardPlan) {
        /** 保留缺口，不把未恢复属性隐藏为完整数据。 */
        public Details { pending = List.copyOf(pending); }
    }
    /** 领域战报返回值：完整Protobuf与冻结元信息，不绑定当前英雄属性。 */
    public record Battle(String id, Details details, GameProtocol.BattleReplay replay) {}

    /** 注入现有服务，持久化与资产修改共享同一个Spring事务。 */
    public MainChapterService(SessionService sessions, RoleRepository roles, JdbcTemplate jdbc,
            MainChapterRules rules, HeroMainPowerService powers, HeroLineupBattleService battles,
            MainChapterRewardService rewards, AssetSyncService sync, ObjectMapper mapper,
            MainChapterIdleStateRepository idleStates) {
        this.idleStates = idleStates;
        this.sessions = sessions;
        this.roles = roles;
        this.jdbc = jdbc;
        this.rules = rules;
        this.powers = powers;
        this.battles = battles;
        this.rewards = rewards;
        this.sync = sync;
        this.mapper = mapper;
    }

    /** 登录恢复调用此一致读；不补发奖励、不创建角色主线记录。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public State current(String token) {
        return state(authorizedRole(token));
    }

    /**
     * 同请求ID永久复用回执；新请求遇到待领奖时仅补领奖并记回执。
     * 否则未通关角色在锁内创建一次累计；已有通关必须具备原累计，不补建免费起点。
     * 随后读取队伍、门槛和真实战斗并冻结双方名称。
     * 失败战斗保留累计起点但不推进通关；任何受理异常均随事务整体回滚。
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Receipt challenge(String token, String requestId) {
        requireId(requestId);
        String role = authorizedRole(token);
        var previous = jdbc.query("SELECT result_json FROM game_main_chapter_command WHERE role_id=? AND request_id=?",
            (row, index) -> readReceipt(row.getString(1), role, null), role, requestId);
        if (!previous.isEmpty()) {
            return previous.getFirst();
        }
        var before = state(role);
        Receipt receipt;
        if (before.pendingBattleId() != null) {
            receipt = settle(role, before.pendingBattleId());
        } else {
            // 战力读取携带资产版本；首次累计的版本通知必须先登记，避免同场输入版本不一致。
            if (before.maxCleared() == 0) {
                if (idleStates.initializeForChallenge(role, java.time.Instant.now().getEpochSecond())) {
                    sync.changed(role);
                }
            } else {
                idleStates.require(role);
            }
            var power = powers.current(token);
            var roleData = roles.findById(role).orElseThrow();
            var decision = rules.decide(new MainChapterRules.Progress(before.maxCleared(), false), roleData.level(), power.total());
            int stageIndex = decision.stage().index();
            var preview = battles.preview(token, stageIndex, probability -> ThreadLocalRandom.current().nextDouble() < probability);
            if (preview.assetRevision() != power.assetRevision() || preview.lineupVersion() != power.lineupVersion()) {
                throw new IllegalStateException("主线输入版本在同一角色锁内发生变化");
            }
            var replay = HeroBattleReplayProtocolUtils.encode(preview.battle()).toBuilder()
                .setAttackerName(roleData.nickname())
                .setDefenderName(rules.opponentName(decision.stage().index()))
                .setScenario("chapter:lineup:" + stageIndex).build();
            boolean won = preview.battle().outcome() == HeroBattleRoundUtils.Outcome.ATTACKER_WIN;
            var after = rules.complete(new MainChapterRules.Progress(before.maxCleared(), false), stageIndex, won);
            var pending = new LinkedHashSet<>(preview.pending());
            pending.addAll(power.pending());
            pending.add("random_probability_pending_review");
            var details = new Details(STORAGE_VERSION, stageIndex, preview.assetRevision(), preview.lineupVersion(),
                preview.formationId(), power.total(), List.copyOf(pending),
                rewards.plan(new MainChapterRules.Progress(stageIndex, won)));
            String id = UUID.randomUUID().toString();
            byte[] bytes = replay.toByteArray();
            String metadata = mapper.writeValueAsString(details);
            jdbc.update("INSERT INTO game_main_chapter_battle(id,role_id,replay_bytes,details_json,payload_hash) VALUES (?,?,?,?,?)",
                id, role, bytes, metadata, digest(bytes, metadata));
            if (won) {
                if (jdbc.update("UPDATE game_main_chapter SET max_cleared=?,pending_battle_id=? WHERE role_id=?",
                        after.maxCleared(), id, role) == 0) {
                    jdbc.update("INSERT INTO game_main_chapter(role_id,max_cleared,pending_battle_id) VALUES (?,?,?)", role, after.maxCleared(), id);
                }
                sync.changed(role);
            }
            receipt = new Receipt(Action.BATTLE, id, state(role), List.of(), null, null);
        }
        jdbc.update("INSERT INTO game_main_chapter_command(role_id,request_id,result_json) VALUES (?,?,?)",
            role, requestId, mapper.writeValueAsString(receipt));
        return receipt;
    }

    /** 以战报ID作为结算幂等键；重复或并发领取返回原回执，不能领取其他角色战报。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Receipt claim(String token, String battleId) {
        requireId(battleId);
        return settle(authorizedRole(token), battleId);
    }

    /** 按归属恢复不可变战报；当前属性变化不重算历史战斗。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Battle replay(String token, String battleId) {
        requireId(battleId);
        return loadBattle(authorizedRole(token), battleId);
    }

    /** 同一事务中发奖、清待领奖、存结算回执；任何失败全部回滚。 */
    private Receipt settle(String role, String battleId) {
        var battle = loadBattle(role, battleId);
        var settled = jdbc.query("SELECT settlement_json FROM game_main_chapter_battle WHERE id=? AND role_id=?",
            (row, index) -> row.getString(1), battleId, role).getFirst();
        if (settled != null) {
            return readReceipt(settled, role, battleId);
        }
        var before = state(role);
        if (!battle.replay().getOutcome().equals("ATTACKER_WIN")) {
            return new Receipt(Action.SETTLED, battleId, before, List.of(), null, null);
        }
        if (!battleId.equals(before.pendingBattleId()) || before.maxCleared() != battle.details().mission()) {
            throw new IllegalStateException("待领奖关卡与战报不一致");
        }
        var beforeRole = roles.findById(role).orElseThrow();
        var actual = rewards.grantPlan(role, battle.details().rewardPlan());
        var processed = actual.items().stream().filter(item -> item.credited() > 0)
                .map(item -> new MainChapterRules.Reward(item.itemId(), item.credited())).toList();
        var afterRole = roles.findById(role).orElseThrow();
        if (jdbc.update("UPDATE game_main_chapter SET pending_battle_id=NULL WHERE role_id=? AND pending_battle_id=?",
                role, battleId) != 1) {
            throw new IllegalStateException("待领奖凭据已变化");
        }
        sync.changed(role);
        var experience = new Experience(beforeRole.level(), beforeRole.basics().experience(), beforeRole.basics().experienceToNextLevel(),
            afterRole.level(), afterRole.basics().experience(), afterRole.basics().experienceToNextLevel());
        var receipt = new Receipt(Action.SETTLED, battleId, state(role), processed, experience, actual);
        validateReceipt(receipt, role, battleId);
        jdbc.update("UPDATE game_main_chapter_battle SET settlement_json=? WHERE id=? AND role_id=?",
            mapper.writeValueAsString(receipt), battleId, role);
        return receipt;
    }

    /** 只读取原回执并校验自身归属/明细；旧actual缺失保留缺失，不再查询当前权益或补发。 */
    private Receipt readReceipt(String payload, String role, String battleId) {
        var receipt = mapper.readValue(payload, Receipt.class);
        validateReceipt(receipt, role, battleId);
        return receipt;
    }

    /** 拒绝损坏身份、超安全数及互相矛盾的历史明细，避免回包后才发现已提交结果无法显示。 */
    private void validateReceipt(Receipt receipt, String role, String battleId) {
        if (receipt == null || receipt.action() == null || receipt.state() == null
                || (battleId != null && !battleId.equals(receipt.battleId()))) {
            throw new IllegalStateException("主线历史回执身份或状态无效");
        }
        requireId(receipt.battleId());
        requireSafeNumbers(mapper.valueToTree(receipt));
        var actual = receipt.actual();
        if (actual == null) {
            return;
        }
        var projected = actual.items().stream().filter(item -> item.credited() > 0)
                .map(item -> new MainChapterRules.Reward(item.itemId(), item.credited())).toList();
        if (receipt.action() != Action.SETTLED || !role.equals(actual.roleId())
                || !projected.equals(receipt.rewards())
                || actual.items().stream().map(RewardGrantResult.Outcome::itemId).distinct().count() != actual.items().size()) {
            throw new IllegalStateException("主线实际奖励归属或基础明细不一致");
        }
        long directGold = 0;
        long directDiamonds = 0;
        for (var item : actual.items()) {
            if (item.itemId() == 900001) {
                directGold = Math.addExact(directGold, item.credited());
            } else if (item.itemId() == 900002) {
                directDiamonds = Math.addExact(directDiamonds, item.credited());
            }
        }
        long bonusDiamonds = 0;
        for (var bonus : actual.bonuses()) {
            if (bonus.source() != RewardGrantResult.BonusSource.ROLE_LEVEL_UP
                    || bonus.itemId() != 900002 || bonus.quantity() <= 0) {
                throw new IllegalStateException("主线升级附赠来源或数量无效");
            }
            bonusDiamonds = Math.addExact(bonusDiamonds, bonus.quantity());
        }
        long experienceDiamonds = 0;
        for (var gain : actual.experience()) {
            experienceDiamonds = Math.addExact(experienceDiamonds, gain.diamonds());
        }
        var wallet = actual.wallet();
        if (experienceDiamonds != bonusDiamonds
                || Math.subtractExact(wallet.goldAfter(), wallet.goldBefore()) != directGold
                || Math.subtractExact(wallet.diamondsAfter(), wallet.diamondsBefore())
                    != Math.addExact(directDiamonds, bonusDiamonds)) {
            throw new IllegalStateException("主线实际钱包、经验与附赠明细不一致");
        }
        if (!actual.experience().isEmpty()) {
            var gain = actual.experience().getFirst();
            var display = receipt.experience();
            if (actual.experience().size() != 1 || display == null
                    || display.beforeLevel() != gain.beforeLevel() || display.beforeExp() != gain.beforeExperience()
                    || display.afterLevel() != gain.level() || display.afterExp() != gain.experience()) {
                throw new IllegalStateException("主线历史经验展示与实际结果不一致");
            }
        }
    }

    /** 在事务内递归拒绝JS不能精确表达的非负整数，历史钱包只验数值，不覆盖当前角色。 */
    private static void requireSafeNumbers(tools.jackson.databind.JsonNode value) {
        if (value.isIntegralNumber()
                && (!value.canConvertToLong() || value.asLong() < 0 || value.asLong() > MAX_SAFE_INTEGER)) {
            throw new IllegalStateException("主线回执数值超出协议精确非负整数范围");
        }
        if (value.isObject() || value.isArray()) {
            for (var child : value) {
                requireSafeNumbers(child);
            }
        }
    }

    /** 角色锁后重新鉴权，避免等待锁期间会话已被撤销。 */
    private String authorizedRole(String token) {
        String role = sessions.requireRole(token);
        roles.lock(role);
        sessions.requireRole(token);
        return role;
    }

    /** 持锁读取主线与排序冻结的真实里程碑集合；空查询明确未领，不插行、不改版本或猜测通关领取。 */
    private State state(String role) {
        long revision = roles.revision(role);
        var claimedIds = jdbc.queryForList("SELECT reward_id FROM game_main_chapter_milestone WHERE role_id=? ORDER BY reward_id",
                Integer.class, role);
        var milestones = new MilestoneProgress(1, claimedIds);
        var states = jdbc.query("SELECT max_cleared,pending_battle_id FROM game_main_chapter WHERE role_id=?",
            (row, index) -> new State(row.getInt(1), row.getString(2), revision, milestones, rules.challengeLimit()), role);
        var result = states.isEmpty() ? new State(0, null, revision, milestones, rules.challengeLimit()) : states.getFirst();
        new MainChapterRules.Progress(result.maxCleared(), result.pendingBattleId() != null);
        return result;
    }

    /** 校验存储格式、归属和内容摘要，再解析二进制；损坏时拒绝发奖，不回退重算。 */
    private Battle loadBattle(String role, String id) {
        var records = jdbc.query("SELECT replay_bytes,details_json,payload_hash FROM game_main_chapter_battle WHERE id=? AND role_id=?",
            (row, index) -> {
                byte[] bytes = row.getBytes(1);
                String metadata = row.getString(2);
                if (!digest(bytes, metadata).equals(row.getString(3))) {
                    throw new IllegalStateException("持久战报摘要不一致");
                }
                var details = mapper.readValue(metadata, Details.class);
                if (details.schemaVersion() != STORAGE_VERSION) {
                    throw new IllegalStateException("不支持的主线存储版本");
                }
                try {
                    var replay = GameProtocol.BattleReplay.parseFrom(bytes);
                    if (replay.getSchemaVersion() != 1 || !replay.getScenario().equals("chapter:lineup:" + details.mission())) {
                        throw new IllegalStateException("持久战报与关卡不一致");
                    }
                    return new Battle(id, details, replay);
                } catch (com.google.protobuf.InvalidProtocolBufferException error) {
                    throw new IllegalStateException("持久战报二进制损坏", error);
                }
            }, id, role);
        if (records.size() != 1) {
            throw new IllegalArgumentException("战报不存在或不属于当前角色");
        }
        return records.getFirst();
    }

    /** 二进制及冻结奖励配置共同计算摘要，检测存储意外损坏；不是客户端签名。 */
    private static String digest(byte[] bytes, String metadata) {
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            digest.update(bytes);
            digest.update(metadata.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest.digest());
        } catch (java.security.NoSuchAlgorithmException error) {
            throw new IllegalStateException("SHA-256不可用", error);
        }
    }

    /** 请求与战报身份严格使用UUID字符串，不接受空值或任意长度键。 */
    private static void requireId(String id) {
        if (id == null || !id.matches("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")) {
            throw new IllegalArgumentException("主线请求或战报ID无效");
        }
    }
}
