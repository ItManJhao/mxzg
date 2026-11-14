/**
 * 原主线前三关持久闭环：鉴权挑战、不可变Protobuf战报、通关待领奖和事务幂等结算。
 * 供主线WebSocket协议调用，登录快照统一恢复进度，不调用旧简化CampaignBattle。
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
public class MainChapterService {
    /** 持久记录版本，未来格式改变须显式兼容，不能重算旧战报。 */
    private static final int STORAGE_VERSION = 1;
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

    /** 当前已通关、待领奖战报及最新资产版本；没有记录时返回0/空。 */
    public record State(int maxCleared, String pendingBattleId, long assetRevision) {}
    /** 挑战返回战报，或沿旧规则只补领奖，不在同一次请求继续打下一关。 */
    public enum Action { BATTLE, SETTLED }
    /** 可重复交付的历史操作回执；state是操作完成当时状态，最新状态通过current读取。 */
    public record Receipt(Action action, String battleId, State state, List<MainChapterRules.Reward> rewards,
                          Experience experience) {
        /** 结果冻结，重复请求不重算奖励。 */
        public Receipt { rewards = List.copyOf(rewards); }
    }
    /** 发奖事务前后经验快照，历史回执允许缺失；只能用于动画，不作为当前角色余额。 */
    public record Experience(int beforeLevel, long beforeExp, long beforeThreshold,
                             int afterLevel, long afterExp, long afterThreshold) {}
    /** 可恢复的战报元信息；rewardPlan和pending随生成时快照冻结。 */
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
            (row, index) -> mapper.readValue(row.getString(1), Receipt.class), role, requestId);
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
            int mission = decision.stage().mission();
            var preview = battles.preview(token, mission, probability -> ThreadLocalRandom.current().nextDouble() < probability);
            if (preview.assetRevision() != power.assetRevision() || preview.lineupVersion() != power.lineupVersion()) {
                throw new IllegalStateException("主线输入版本在同一角色锁内发生变化");
            }
            var replay = HeroBattleReplayProtocolUtils.encode(preview.battle()).toBuilder()
                .setAttackerName(roleData.nickname())
                .setDefenderName(rules.opponentName(decision.stage().index()))
                .setScenario("chapter:lineup:" + mission).build();
            boolean won = preview.battle().outcome() == HeroBattleRoundUtils.Outcome.ATTACKER_WIN;
            var after = rules.complete(new MainChapterRules.Progress(before.maxCleared(), false), mission, won);
            var pending = new LinkedHashSet<>(preview.pending());
            pending.addAll(power.pending());
            pending.add("random_probability_pending_review");
            var details = new Details(STORAGE_VERSION, mission, preview.assetRevision(), preview.lineupVersion(),
                preview.formationId(), power.total(), List.copyOf(pending),
                rewards.plan(new MainChapterRules.Progress(mission, won)));
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
            receipt = new Receipt(Action.BATTLE, id, state(role), List.of(), null);
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
            return mapper.readValue(settled, Receipt.class);
        }
        var before = state(role);
        if (!battle.replay().getOutcome().equals("ATTACKER_WIN")) {
            return new Receipt(Action.SETTLED, battleId, before, List.of(), null);
        }
        if (!battleId.equals(before.pendingBattleId()) || before.maxCleared() != battle.details().mission()) {
            throw new IllegalStateException("待领奖关卡与战报不一致");
        }
        var beforeRole = roles.findById(role).orElseThrow();
        var processed = rewards.grantPlan(role, battle.details().rewardPlan());
        var afterRole = roles.findById(role).orElseThrow();
        if (jdbc.update("UPDATE game_main_chapter SET pending_battle_id=NULL WHERE role_id=? AND pending_battle_id=?",
                role, battleId) != 1) {
            throw new IllegalStateException("待领奖凭据已变化");
        }
        sync.changed(role);
        var experience = new Experience(beforeRole.level(), beforeRole.basics().experience(), beforeRole.basics().experienceToNextLevel(),
            afterRole.level(), afterRole.basics().experience(), afterRole.basics().experienceToNextLevel());
        var receipt = new Receipt(Action.SETTLED, battleId, state(role), processed, experience);
        jdbc.update("UPDATE game_main_chapter_battle SET settlement_json=? WHERE id=? AND role_id=?",
            mapper.writeValueAsString(receipt), battleId, role);
        return receipt;
    }

    /** 角色锁后重新鉴权，避免等待锁期间会话已被撤销。 */
    private String authorizedRole(String token) {
        String role = sessions.requireRole(token);
        roles.lock(role);
        sessions.requireRole(token);
        return role;
    }

    /** 持锁读取主线状态，与早期简化进度完全隔离，不迁移猜测值。 */
    private State state(String role) {
        long revision = roles.revision(role);
        var states = jdbc.query("SELECT max_cleared,pending_battle_id FROM game_main_chapter WHERE role_id=?",
            (row, index) -> new State(row.getInt(1), row.getString(2), revision), role);
        var result = states.isEmpty() ? new State(0, null, revision) : states.getFirst();
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
