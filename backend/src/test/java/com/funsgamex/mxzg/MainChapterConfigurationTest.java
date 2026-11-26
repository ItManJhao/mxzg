/**
 * 配置化主线的独立H2回归：新挑战范围、全局关卡只读预览和降低范围后的历史结算。
 * 只为隔离角色准备数据，原回执与共享事务均走生产链，不连接日常数据库或修改运行中的范围。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.campaign.IdleActivityMaintenanceService;
import com.funsgamex.mxzg.campaign.IdleRules;
import com.funsgamex.mxzg.campaign.MainChapterFirstRewardRules;
import com.funsgamex.mxzg.campaign.MainChapterFirstRewardService;
import com.funsgamex.mxzg.campaign.MainChapterIdleClaimService;
import com.funsgamex.mxzg.campaign.MainChapterIdleStateRepository;
import com.funsgamex.mxzg.campaign.MainChapterMilestoneService;
import com.funsgamex.mxzg.campaign.MainChapterRewardService;
import com.funsgamex.mxzg.campaign.MainChapterRules;
import com.funsgamex.mxzg.campaign.MainChapterService;
import com.funsgamex.mxzg.chat.ChatService;
import com.funsgamex.mxzg.hero.HeroBattleChapterScenario;
import com.funsgamex.mxzg.hero.HeroBattleReplayProtocolUtils;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor;
import com.funsgamex.mxzg.hero.HeroGrowthRules;
import com.funsgamex.mxzg.hero.HeroLineupBattleService;
import com.funsgamex.mxzg.hero.HeroMainPowerService;
import com.funsgamex.mxzg.lineup.Lineup;
import com.funsgamex.mxzg.lineup.MainFormationCommandService;
import com.funsgamex.mxzg.network.AssetSyncService;
import com.funsgamex.mxzg.network.GameProtocolCodec;
import com.funsgamex.mxzg.network.SessionSnapshotService;
import com.funsgamex.mxzg.reward.RewardGrantService;
import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.time.GameClock;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:main_chapter_configuration;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password="
})
@ActiveProfiles("local")
class MainChapterConfigurationTest {
    /** 本类共享内存区服只接受一个开服秒，跨用例复用以保留初始化幂等。 */
    private static final long IDLE_SERVER_OPENED_AT = Instant.now().minusSeconds(86_400).getEpochSecond();

    /** 只创建隔离测试角色，签发凭证不输出。 */
    @Autowired private DevelopmentLoginService login;
    /** 真实鉴权服务供不同只读范围的领域实例复用。 */
    @Autowired private SessionService sessions;
    /** 读取默认开放范围的真实主线服务。 */
    @Autowired private MainChapterService chapters;
    /** 真实共享发奖适配，历史结算仍消费持久冻结计划。 */
    @Autowired private MainChapterRewardService rewards;
    /** 独立通关奖励继续随受限主线进度装配。 */
    @Autowired private MainChapterFirstRewardRules firstRewards;
    /** 冻结独立通关奖励回执，供候选服务重复领取和重登后的读取。 */
    @Autowired private RewardReceiptPayloads rewardPayloads;
    /** 共享游戏时钟，保持隔离领取与本机正常领取使用同一时间来源。 */
    @Autowired private GameClock clock;
    /** 候选关卡独立奖励使用同一套事务内公告发布。 */
    @Autowired private ChatService chat;
    /** 只读输入及计算不会修改角色资产。 */
    @Autowired private HeroLineupBattleService battles;
    /** 原队伍战力及持久输入版本。 */
    @Autowired private HeroMainPowerService powers;
    /** 角色锁、资产和统一版本。 */
    @Autowired private RoleRepository roles;
    /** 原统一状态快照，验证新挑战范围随最终revision保留。 */
    @Autowired private SessionSnapshotService snapshots;
    /** 当前里程碑服务以已持久化的真实通关事实发放原始奖励。 */
    @Autowired private MainChapterMilestoneService milestones;
    /** 原阵容保存，避免测试绕过站位归属。 */
    @Autowired private MainFormationCommandService formations;
    /** 仅向本类隔离H2准备已有通关和时钟。 */
    @Autowired private JdbcTemplate jdbc;
    /** 原事务管理负责角色锁及持久回执幂等。 */
    @Autowired private PlatformTransactionManager transactions;
    /** 复用统一版本，不制造第二份同步状态。 */
    @Autowired private AssetSyncService sync;
    /** 原首次挑战时钟仓储，历史恢复不补免费收益。 */
    @Autowired private MainChapterIdleStateRepository idleStates;
    /** 同源配置与历史JSON序列化。 */
    @Autowired private ObjectMapper mapper;
    /** 完整同源挂机目录；拥有收益配置不代表相应挑战已开放。 */
    @Autowired private IdleRules idle;
    /** 发放验收关卡的真实挂机收益，回执和起点使用既有领域。 */
    @Autowired private MainChapterIdleClaimService idleClaims;
    /** 初始化本类隔离库的区服开服时间，领取时仍校验生产活动配置。 */
    @Autowired private IdleActivityMaintenanceService idleMaintenance;
    /** 共享类型支持检查只读使用，不在配置预检时发奖。 */
    @Autowired private RewardGrantService grants;

    /** 当前测试身份，不将token写入产物。 */
    private record Player(String role, String token, String hero) {}

    /** 使用完整旧魅惑之拥强队，后续依旧由真实战斗决定胜负。 */
    private Player player() {
        return player(10105011, 9, 100, 3);
    }

    /** 根据真实模板/星级/等级/强化创建隔离英雄；只调整合法养成输入，不伪造属性或技能。 */
    private Player player(int template, int star, int level, int stage) {
        var accepted = login.login("configured_" + UUID.randomUUID().toString().substring(0, 12));
        String role = accepted.role().id();
        String token = "Bearer " + accepted.session().accessToken();
        String hero = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage) VALUES (?,?,?,?,?,?)",
            hero, role, template, level, star, stage);
        var state = snapshots.snapshot(token);
        formations.save(token, new MainFormationCommandService.Save(UUID.randomUUID().toString(),
            state.mainFormation().version(), 1, List.of(new Lineup.Slot(2, hero))));
        return new Player(role, token, hero);
    }

    /** 仅准备已通关事实和既有时钟，不伪造战报、奖励或待结算结果。 */
    private void cleared(Player player, int stage) {
        jdbc.update("INSERT INTO game_main_chapter(role_id,max_cleared) VALUES (?,?)", player.role(), stage);
        jdbc.update("INSERT INTO game_main_chapter_idle(role_id,started_at) VALUES (?,?)",
            player.role(), Instant.now().getEpochSecond() - 60);
    }

    /** 第551关的新挑战被拒绝，且事务不写战报、请求回执或资产版本。 */
    @Test
    void defaultScopeRejectsChallengeAfterLimitWithoutChangingAssets() {
        var player = player();
        cleared(player, 550);
        var before = snapshots.snapshot(player.token());
        assertEquals(550, before.mainChapter().challengeLimit());
        var failure = assertThrows(IllegalArgumentException.class,
            () -> chapters.challenge(player.token(), UUID.randomUUID().toString()));
        assertTrue(failure.getMessage().contains("开放范围"));
        var after = snapshots.snapshot(player.token());
        assertEquals(before.role(), after.role());
        assertEquals(before.revision(), after.revision());
        assertEquals(before.mainChapter(), after.mainChapter());
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM game_main_chapter_battle WHERE role_id=?", Integer.class, player.role()));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM game_main_chapter_command WHERE role_id=?", Integer.class, player.role()));
    }

    /** 默认前550关均经真实挑战和结算，重复回执只读，末关结算后继续限制新挑战。 */
    @Test
    void defaultScopeChallengesAndSettlesAllOpenStages() throws Exception {
        var player = prepareLateChapterPlayer(550, 201);
        var tx = new TransactionTemplate(transactions);
        int attempts = 0;
        for (int index = 1; index <= 550; index++) {
            var victory = challengeToVictory(chapters, tx, player.token(), index, 550, snapshots.snapshot(player.token()));
            var battle = victory.battle();
            attempts += victory.attempts();
            assertEquals(index, battle.state().maxCleared(), "须由实际胜利推进第" + index + "关");
            var replay = chapters.replay(player.token(), battle.battleId()).replay();
            assertEquals("chapter:lineup:" + index, replay.getScenario());
            assertEquals("ATTACKER_WIN", replay.getOutcome());
            assertEquals(battle, chapters.challenge(player.token(), victory.requestId()));
            var settled = chapters.claim(player.token(), battle.battleId());
            assertEquals(MainChapterService.Action.SETTLED, settled.action());
            assertNotNull(settled.actual());
            assertNull(settled.state().pendingBattleId());
            assertEquals(index, settled.state().maxCleared());
            var after = snapshots.snapshot(player.token());
            assertEquals(index, after.mainChapterIdle().rewardStage());
            assertEquals(settled, chapters.claim(player.token(), battle.battleId()));
            assertEquals(after.revision(), snapshots.snapshot(player.token()).revision());
        }
        var finalSnapshot = snapshots.snapshot(player.token());
        assertEquals("ENABLED", finalSnapshot.mainChapterIdle().claimState().requestMode());
        Files.write(Path.of("target/chapter-open-scope-550.pb"), GameProtocolCodec.encode(Map.of(
            "version", 1, "kind", "event", "name", "state.changed", "body", finalSnapshot)));
        assertThrows(IllegalArgumentException.class,
            () -> chapters.challenge(player.token(), UUID.randomUUID().toString()));
        assertEquals(finalSnapshot.revision(), snapshots.snapshot(player.token()).revision());
        assertEquals(attempts, jdbc.queryForObject("SELECT COUNT(*) FROM game_main_chapter_battle WHERE role_id=?",
            Integer.class, player.role()));
    }

    /** 在真实角色锁内准备已达到后段挑战等级的隔离角色，保留全部关卡门槛。 */
    private void prepareRoleLevel(Player player, int level) {
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            roles.lock(player.role());
            roles.setDevelopmentLevel(player.role(), level);
        });
    }

    /** 在单独设为25的范围内从原第20关进度连续挑战，保留真实首通、挂机快照和可复验战报。 */
    @Test
    void candidateScopeChallengesAndSettlesStagesTwentyOneThroughTwentyFive() throws Exception {
        verifyCandidateRange(20, 25, 22);
    }

    /** 在补齐技能表现后连续挑战第 26～29 关，保留真实结算和 Creator 战报。 */
    @Test
    void candidateScopeChallengesAndSettlesStagesTwentySixThroughTwentyNine() throws Exception {
        verifyCandidateRange(25, 29, 26);
    }

    /** 第 30 关真实通关及重登结算后，额外奖励按旧配置 ID 幂等发放 500 强化石。 */
    @Test
    void stageThirtyUnlocksOriginalMilestone() throws Exception {
        String token = verifyCandidateRange(29, 30, 30);
        var before = snapshots.snapshot(token);
        assertFalse(before.mainChapter().milestoneProgress().claimedIds().contains(150));
        var receipt = milestones.claim(token, 150);
        assertEquals(30, receipt.targetChapter());
        assertEquals(1, receipt.actual().items().size());
        assertEquals(900102, receipt.actual().items().getFirst().itemId());
        assertEquals(500, receipt.actual().items().getFirst().credited());
        var after = snapshots.snapshot(token);
        assertEquals(countInventoryItem(before, 900102) + 500, countInventoryItem(after, 900102));
        assertTrue(after.mainChapter().milestoneProgress().claimedIds().contains(150));
        assertEquals(receipt, milestones.claim(token, 150));
        assertEquals(after.revision(), snapshots.snapshot(token).revision());
    }

    /** 从第 30 关的历史进度挑战下一章，验证真实守军、首通结算和挂机档位。 */
    @Test
    void candidateScopeChallengesAndSettlesStagesThirtyOneThroughThirtySeven() throws Exception {
        verifyCandidateRange(30, 37, 36);
    }

    /** 验证第 38 关补齐后可连续到第 40 关，含末关重登结算及挂机掉落组进入下一档。 */
    @Test
    void candidateScopeChallengesAndSettlesStagesThirtyEightThroughForty() throws Exception {
        verifyCandidateRange(37, 40, 40);
        assertEquals(1001, idle.stage(39).group());
        assertEquals(1002, idle.stage(40).group());
    }

    /** 同一隔离角色连续挑战第 41～100 关，复验重登结算、独立通关奖励和里程碑的真实发放。 */
    @Test
    void candidateScopeChallengesAndSettlesStagesFortyOneThroughOneHundred() throws Exception {
        var player = player();
        prepareRoleLevel(player, 31);
        String token = verifyCandidateRange(player, 40, 100, List.of(50, 80, 100),
            List.of(50, 60, 70, 75, 80, 90, 100),
            Map.of(50, new MilestoneReward(200, 900102, 800), 80, new MilestoneReward(300, 1001012, 1)));
        var snapshot = snapshots.snapshot(token);
        assertEquals(100, snapshot.mainChapter().maxCleared());
        assertEquals(1004, idle.stage(99).group());
        assertEquals(1005, idle.stage(100).group());
        assertEquals(List.of(200, 300), snapshot.mainChapter().milestoneProgress().claimedIds());
    }

    /** 同一隔离角色连续挑战第 101～110 关，核对新被动关、重登结算和第110关两个领取入口。 */
    @Test
    void candidateScopeChallengesAndSettlesStagesOneHundredOneThroughOneHundredTen() throws Exception {
        // 单英雄100级会偶发输在第109关，使用九星合法等级保证后续能实际校验领奖。
        var player = player(10105011, 9, 150, 6);
        prepareRoleLevel(player, 33);
        String token = verifyCandidateRange(player, 100, 110, List.of(103, 110), List.of(110),
            Map.of(110, new MilestoneReward(400, 10205011, 1)));
        var snapshot = snapshots.snapshot(token);
        assertEquals(110, snapshot.mainChapter().maxCleared());
        assertEquals(List.of(400), snapshot.mainChapter().milestoneProgress().claimedIds());
        assertEquals(List.of(110), snapshot.mainChapter().firstRewardProgress().claimedChapters());
    }

    /** 用达到原配置等级要求的隔离角色打通第111～300关，并核对通关、里程碑及末关挂机的真实到账。 */
    @Test
    void candidateScopeChallengesAndSettlesStagesOneHundredElevenThroughThreeHundred() throws Exception {
        var player = prepareStageThreeHundredPlayer();
        var independentRewards = List.of(120, 125, 130, 140, 150, 160, 170, 175, 180, 190, 200, 210,
            220, 225, 230, 240, 250, 260, 270, 275, 280, 290, 300);
        String token = verifyCandidateRange(player, 110, 300, List.of(140, 159, 200, 201, 250, 300),
            independentRewards, Map.of(140, new MilestoneReward(500, 10105007, 1)));
        var snapshot = snapshots.snapshot(token);
        assertEquals(300, snapshot.mainChapter().maxCleared());
        assertEquals(List.of(500), snapshot.mainChapter().milestoneProgress().claimedIds());
        assertEquals(independentRewards, snapshot.mainChapter().firstRewardProgress().claimedChapters());
        var milestone = milestones.status(token, 500);
        assertTrue(milestone.found());
        assertEquals(10105007, milestone.receipt().actual().heroes().getFirst().templateId());
        assertEquals(1013, idle.stage(299).group());
        assertEquals(1014, idle.stage(300).group());
        verifyIdleClaimAtStage(token, snapshot, 300);
    }

    /** 准备满足第300关门槛的隔离角色，由统一的后段测试阵容挑战。 */
    private Player prepareStageThreeHundredPlayer() {
        return prepareLateChapterPlayer(300, 97);
    }

    /** 同一角色连续完成第301～360关，验证全部七档奖励、挂机档位及下一关开放范围。 */
    @Test
    void candidateScopeChallengesAndSettlesStagesThreeHundredOneThroughThreeHundredSixty() throws Exception {
        var player = prepareLateChapterPlayer(360, 117);
        var independentRewards = List.of(310, 320, 325, 330, 340, 350, 360);
        String token = verifyCandidateRange(player, 300, 360, List.of(301, 321, 330, 351, 360), independentRewards,
            Map.of());
        var snapshot = snapshots.snapshot(token);
        assertEquals(360, snapshot.mainChapter().maxCleared());
        assertEquals(independentRewards, snapshot.mainChapter().firstRewardProgress().claimedChapters());
        assertEquals(List.of(), snapshot.mainChapter().milestoneProgress().claimedIds());
        assertEquals(1014, idle.stage(329).group());
        assertEquals(1015, idle.stage(330).group());
        assertEquals(1015, idle.stage(360).group());
    }

    /** 用同一隔离角色实打第361～400关，核对原门槛、五档独立通关奖励、挂机及第401关边界。 */
    @Test
    void candidateScopeChallengesAndSettlesStagesThreeHundredSixtyOneThroughFourHundred() throws Exception {
        var player = prepareLateChapterPlayer(400, 131);
        var independentRewards = List.of(370, 375, 380, 390, 400);
        String token = verifyCandidateRange(player, 360, 400, List.of(361, 362, 363, 390, 400), independentRewards,
            Map.of());
        var snapshot = snapshots.snapshot(token);
        assertEquals(400, snapshot.mainChapter().maxCleared());
        assertEquals(independentRewards, snapshot.mainChapter().firstRewardProgress().claimedChapters());
        assertEquals(List.of(), snapshot.mainChapter().milestoneProgress().claimedIds());
        for (int chapter = 361; chapter <= 400; chapter++) {
            assertEquals(1015, idle.stage(chapter).group(), "旧挂机掉落组须保持至第" + chapter + "关");
        }
    }

    /** 用同一隔离角色实打第401～440关，验证换图阶段的守军、五档独立奖励、挂机和第441关边界。 */
    @Test
    void candidateScopeChallengesAndSettlesStagesFourHundredOneThroughFourHundredForty() throws Exception {
        var player = prepareLateChapterPlayer(440, 143);
        var independentRewards = List.of(410, 420, 425, 430, 440);
        String token = verifyCandidateRange(player, 400, 440, List.of(401, 402, 404, 425, 440), independentRewards,
            Map.of());
        var snapshot = snapshots.snapshot(token);
        assertEquals(440, snapshot.mainChapter().maxCleared());
        assertEquals(independentRewards, snapshot.mainChapter().firstRewardProgress().claimedChapters());
        assertEquals(List.of(), snapshot.mainChapter().milestoneProgress().claimedIds());
        for (int chapter = 401; chapter <= 440; chapter++) {
            assertEquals(1015, idle.stage(chapter).group(), "旧挂机掉落组须保持至第" + chapter + "关");
        }
    }

    /** 用同一隔离角色实打第441～550关，核对十三档独立领奖、挂机到账、重登及第551关边界。 */
    @Test
    void candidateScopeChallengesAndSettlesStagesFourHundredFortyOneThroughFiveHundredFifty() throws Exception {
        var player = prepareLateChapterPlayer(550, 201);
        var independentRewards = List.of(450, 460, 470, 475, 480, 490, 500, 510, 520, 525, 530, 540, 550);
        String token = verifyCandidateRange(player, 440, 550, List.of(441, 451, 500, 525, 550), independentRewards,
            Map.of());
        var snapshot = snapshots.snapshot(token);
        assertEquals(550, snapshot.mainChapter().maxCleared());
        assertEquals(independentRewards, snapshot.mainChapter().firstRewardProgress().claimedChapters());
        assertEquals(List.of(), snapshot.mainChapter().milestoneProgress().claimedIds());
        for (int chapter = 441; chapter <= 550; chapter++) {
            assertEquals(1015, idle.stage(chapter).group(), "旧挂机掉落组须保持至第" + chapter + "关");
        }
    }

    /** 准备满足末关等级的隔离角色，通过真实阵型命令保存对应区间可用的强队。 */
    private Player prepareLateChapterPlayer(int lastChapter, int requiredLevel) {
        int leaderStar = MainChapterProgressionPreview.lateChapterLeaderStar(lastChapter);
        int leaderLevel = new HeroGrowthRules(mapper).limit(200, 6, leaderStar);
        var player = player(10105011, leaderStar, leaderLevel, 6);
        assertEquals(requiredLevel, new MainChapterRules(mapper).stage(lastChapter).requiredLevel());
        prepareRoleLevel(player, requiredLevel);
        var lineup = MainChapterProgressionPreview.prepareLateChapterLineup(jdbc, player.role(), player.hero(), 200,
            leaderStar, leaderLevel);
        var formation = snapshots.snapshot(player.token()).mainFormation();
        formations.save(player.token(), new MainFormationCommandService.Save(UUID.randomUUID().toString(),
            formation.version(), 1, lineup));
        return player;
    }

    /** 核对范围中每档正常挂机触发均有可发放的正权重候选和真实基础资源。 */
    @Test
    void idleRewardCandidatesThroughStageFiveHundredFiftyStayGrantable() {
        var data = idle.data();
        var covered = data.stages().stream().filter(stage -> stage.id() >= 111 && stage.id() <= 550).toList();
        assertEquals(440, covered.size());
        var groups = covered.stream().map(IdleRules.Stage::group).distinct().sorted().toList();
        assertEquals(List.of(1005, 1006, 1007, 1008, 1009, 1010, 1011, 1012, 1013, 1014, 1015), groups);
        for (var stage : covered) {
            grants.requireSupported(stage.base().stream().map(reward -> reward.itemId()).toList());
        }
        for (int group : groups) {
            var triggers = data.triggers().stream().filter(trigger -> trigger.group() == group).toList();
            assertFalse(triggers.isEmpty(), "缺挂机触发组 " + group);
            for (var trigger : triggers) {
                var items = data.drops().stream().filter(drop -> drop.table() == trigger.table() && drop.weight() > 0)
                    .map(IdleRules.Drop::itemId).toList();
                assertFalse(items.isEmpty(), "缺挂机掉落表 " + trigger.table());
                grants.requireSupported(items);
            }
        }
    }

    /** 核对指定关卡的领取按原档位实际入账，验证成功回执、计时复位及请求重试。 */
    private void verifyIdleClaimAtStage(String token, SessionSnapshotService.Snapshot before, int stage) {
        long now = clock.epochSeconds();
        idleMaintenance.configure(before.role().serverId(), IDLE_SERVER_OPENED_AT, Optional.empty(), now);
        String requestId = UUID.randomUUID().toString();
        long operation = before.mainChapterIdle().claimState().operationVersion();
        var receipt = idleClaims.claim(token, requestId, operation);
        assertEquals(stage, receipt.rewardStage());
        assertEquals(before.mainChapterIdle().startedAt(), receipt.previousStartedAtSeconds());
        assertEquals(operation + 1, receipt.afterOperationVersion());
        assertEquals(receipt, idleClaims.status(token, requestId).receipt());
        var after = snapshots.snapshot(token);
        assertEquals(receipt.assetRevision(), after.revision());
        assertEquals(receipt.committedAtSeconds(), after.mainChapterIdle().startedAt());
        assertEquals(receipt.actual().wallet().goldAfter(), after.role().gold());
        assertTrue(after.role().gold() > before.role().gold());
        assertEquals(receipt, idleClaims.claim(token, requestId, operation));
        assertEquals(after.revision(), snapshots.snapshot(token).revision());
    }

    /** 隔离验收使用的原里程碑配置ID、奖励资产配置ID和应到账数量。 */
    private record MilestoneReward(int id, int itemId, long amount) {}

    /** 记录真正获胜的一次挑战、对应的幂等键和本关持久战报总数。 */
    private record Victory(String requestId, MainChapterService.Receipt battle, int attempts) {}

    /** 第441关后的隔离角色允许有限重试。每次用新请求打同一关，先验证败场及重放没有推进或发奖。 */
    private Victory challengeToVictory(MainChapterService service, TransactionTemplate tx, String token, int chapter,
            int limit, SessionSnapshotService.Snapshot before) {
        int maxAttempts = chapter >= 441 ? 5 : 1;
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            String requestId = UUID.randomUUID().toString();
            var battle = tx.execute(status -> service.challenge(token, requestId));
            assertEquals(MainChapterService.Action.BATTLE, battle.action());
            assertEquals(limit, battle.state().challengeLimit());
            if (battle.state().maxCleared() == chapter) {
                return new Victory(requestId, battle, attempt);
            }
            assertEquals(chapter - 1, battle.state().maxCleared());
            assertNull(battle.state().pendingBattleId());
            assertTrue(battle.rewards().isEmpty());
            assertNull(battle.actual());
            var defeated = tx.execute(status -> service.replay(token, battle.battleId()));
            assertEquals("chapter:lineup:" + chapter, defeated.replay().getScenario());
            assertEquals("DEFENDER_WIN", defeated.replay().getOutcome());
            assertTrue(defeated.details().rewardPlan().rewards().isEmpty());
            assertEquals(battle, tx.execute(status -> service.challenge(token, requestId)));
            var after = snapshots.snapshot(token);
            assertEquals(before.mainChapter(), after.mainChapter());
            assertEquals(before.revision(), after.revision());
            assertEquals(before.role(), after.role());
            assertEquals(before.inventory(), after.inventory());
            assertEquals(before.tavernPoints(), after.tavernPoints());
        }
        return fail("第" + chapter + "关在" + maxAttempts + "次实际挑战中未获胜");
    }

    /** 从权威库存快照统计某种道具的到账数量。 */
    private long countInventoryItem(SessionSnapshotService.Snapshot snapshot, int itemId) {
        return snapshot.inventory().stream().filter(item -> item.itemId() == itemId)
                .mapToLong(item -> item.quantity()).sum();
    }

    /** 以隔离候选上限复验连续挑战、指定关卡重登、持久结算及按原配置更新挂机；返回当前有效凭证。 */
    private String verifyCandidateRange(int alreadyCleared, int limit, int reloginAt) throws Exception {
        return verifyCandidateRange(player(), alreadyCleared, limit, List.of(reloginAt), List.of(), Map.of());
    }

    /** 按真实守军连续挑战，并复验使用生产公告服务的独立领奖、重登、里程碑和挂机宝箱。 */
    private String verifyCandidateRange(Player player, int alreadyCleared, int limit, List<Integer> reloginAt,
                                        List<Integer> independentRewardAt, Map<Integer, MilestoneReward> milestoneAt)
            throws Exception {
        cleared(player, alreadyCleared);
        var candidate = serviceAtLimit(limit);
        var configured = new MainChapterRules(mapper);
        var tx = new TransactionTemplate(transactions);
        var firstRewardService = new MainChapterFirstRewardService(sessions, roles, candidate, configured,
            firstRewards, grants, sync, jdbc, rewardPayloads, clock, chat);
        var firstRewardPlans = independentRewardAt.isEmpty() ? Map.<Integer, List<RewardGrantService.Reward>>of()
            : readIndependentRewardPlans(alreadyCleared, limit);
        assertEquals(independentRewardAt, firstRewardPlans.keySet().stream().sorted().toList());
        var firstRewardReceipts = new TreeMap<Integer, MainChapterFirstRewardService.Receipt>();
        String token = player.token();
        int attempts = 0;
        for (int index = alreadyCleared + 1; index <= limit; index++) {
            int chapter = index;
            String challengeToken = token;
            var before = snapshots.snapshot(challengeToken);
            var independentReward = firstRewardPlans.get(chapter);
            if (independentReward != null) {
                var rejected = assertThrows(MainChapterFirstRewardService.Rejected.class,
                    () -> tx.execute(status -> firstRewardService.claim(challengeToken, chapter)));
                assertEquals("FIRST_REWARD_NOT_REACHED", rejected.code());
                assertFalse(tx.execute(status -> firstRewardService.status(challengeToken, chapter)).found());
                assertEquals(before.revision(), snapshots.snapshot(challengeToken).revision());
            }
            var victory = challengeToVictory(candidate, tx, challengeToken, chapter, limit, before);
            var battle = victory.battle();
            attempts += victory.attempts();
            assertEquals(index, battle.state().maxCleared(), "须由实际胜利推进第" + index + "关");
            assertEquals(battle.battleId(), battle.state().pendingBattleId());

            if (reloginAt.contains(index)) {
                token = relogin(player);
                assertEquals(battle.battleId(), snapshots.snapshot(token).mainChapter().pendingBattleId());
            }

            String settlementToken = token;
            assertEquals(battle, tx.execute(status -> candidate.challenge(settlementToken, victory.requestId())));
            var saved = tx.execute(status -> candidate.replay(settlementToken, battle.battleId()));
            var replay = saved.replay();
            assertEquals("chapter:lineup:" + index, replay.getScenario());
            assertEquals("ATTACKER_WIN", replay.getOutcome());
            assertEquals(configured.enemies(index).stream()
                    .map(enemy -> List.of(enemy.template(), enemy.position(), enemy.level(), enemy.star())).toList(),
                replay.getUnitsList().stream().filter(unit -> unit.getFaction() == 2)
                    .map(unit -> List.of(unit.getTemplateId(), unit.getPosition(), unit.getLevel(), unit.getStar())).toList());
            var firstRewards = configured.stage(index).firstRewards();
            assertEquals(firstRewards, saved.details().rewardPlan().rewards());

            var settled = tx.execute(status -> candidate.claim(settlementToken, battle.battleId()));
            assertEquals(MainChapterService.Action.SETTLED, settled.action());
            assertNull(settled.state().pendingBattleId());
            assertEquals(index, settled.state().maxCleared());
            assertEquals(firstRewards, settled.actual().items().stream()
                .map(item -> new MainChapterRules.Reward(item.itemId(), item.requested())).toList());
            var after = snapshots.snapshot(settlementToken);
            long gold = firstRewards.stream().filter(reward -> reward.itemId() == 900001)
                .mapToLong(MainChapterRules.Reward::quantity).sum();
            assertEquals(before.role().gold() + gold, after.role().gold());
            assertEquals(settled.actual().wallet().diamondsAfter(), after.role().diamonds());
            for (var stack : settled.actual().stacks()) {
                assertEquals(stack.afterQuantity(), countInventoryItem(after, stack.itemId()));
                assertEquals(stack.beforeQuantity(), countInventoryItem(before, stack.itemId()));
            }
            for (var experience : settled.actual().experience()) {
                assertEquals(experience.level(), after.role().level());
                assertEquals(experience.experience(), after.role().basics().experience());
            }
            for (var points : settled.actual().tavern()) {
                assertEquals(points.afterQuantity(), after.tavernPoints().adventureCount());
            }
            assertEquals(index, after.mainChapterIdle().rewardStage());
            assertEquals(idle.stage(index).base(), after.mainChapterIdle().rates());
            assertEquals(before.mainChapterIdle().startedAt(), after.mainChapterIdle().startedAt());
            assertEquals(settled, tx.execute(status -> candidate.claim(settlementToken, battle.battleId())));
            assertEquals(after.revision(), snapshots.snapshot(settlementToken).revision());
            String fixture = index <= 25 ? "chapter-config-stage-" : "chapter-victory-stage-";
            Files.write(Path.of("target/" + fixture + index + ".pb"), replay.toByteArray());
            if (!independentRewardAt.isEmpty()) {
                exportReceipt("chapter-settle-stage-" + index, "chapter.claim", settled);
            }
            if (independentReward != null) {
                firstRewardReceipts.put(chapter, verifyFirstReward(settlementToken, chapter, independentReward,
                    candidate, firstRewardService, tx));
            }
            if (index == 330 || index == 390 || index == 425 || index == 500) {
                verifyIdleClaimAtStage(settlementToken, snapshots.snapshot(settlementToken), index);
            }
            var milestone = milestoneAt.get(index);
            if (milestone != null) {
                verifyMilestone(settlementToken, index, milestone);
            }
        }

        String finalToken = firstRewardReceipts.isEmpty() ? token : relogin(player);
        if (!firstRewardReceipts.isEmpty()) {
            var progress = tx.execute(status -> candidate.current(finalToken)).firstRewardProgress();
            assertEquals(firstRewardPlans.keySet().stream().sorted().toList(), progress.claimedChapters());
            for (var entry : firstRewardReceipts.entrySet()) {
                var recovered = tx.execute(status -> firstRewardService.status(finalToken, entry.getKey()));
                assertTrue(recovered.found());
                assertEquals(entry.getValue(), recovered.receipt());
            }
        }
        var beforeRejected = snapshots.snapshot(finalToken);
        var failure = assertThrows(IllegalArgumentException.class,
            () -> tx.execute(status -> candidate.challenge(finalToken, UUID.randomUUID().toString())));
        assertTrue(failure.getMessage().contains("开放范围"));
        assertEquals(beforeRejected.revision(), snapshots.snapshot(finalToken).revision());
        assertEquals(attempts, jdbc.queryForObject("SELECT COUNT(*) FROM game_main_chapter_battle WHERE role_id=?",
            Integer.class, player.role()));
        assertEquals(attempts, jdbc.queryForObject("SELECT COUNT(*) FROM game_main_chapter_command WHERE role_id=?",
            Integer.class, player.role()));
        return finalToken;
    }

    /** 重登隔离角色并核实真实角色身份，旧凭证不会写入验收产物。 */
    private String relogin(Player player) {
        String account = jdbc.queryForObject("SELECT login_account FROM game_role WHERE id=?",
            String.class, player.role());
        String token = "Bearer " + login.login(account).session().accessToken();
        assertEquals(player.role(), snapshots.claim(token));
        return token;
    }

    /** 直接读取构建打包的原通关奖励表，避免漏验发奖目录因类型不支持而过滤的旧项。 */
    private Map<Integer, List<RewardGrantService.Reward>> readIndependentRewardPlans(int alreadyCleared, int limit)
            throws Exception {
        var plans = new TreeMap<Integer, List<RewardGrantService.Reward>>();
        try (var source = getClass().getResourceAsStream("/gameplay/firstrewardchapter.json")) {
            assertNotNull(source);
            for (var row : mapper.readTree(source).path("rows")) {
                int chapter = row.path("chapter").asInt();
                if (chapter > alreadyCleared && chapter <= limit) {
                    var plan = new ArrayList<RewardGrantService.Reward>();
                    for (var reward : mapper.readTree(row.path("reward").asString())) {
                        plan.add(new RewardGrantService.Reward(reward.path("item_type").asInt(),
                            reward.path("item_num").asLong()));
                    }
                    assertFalse(plan.isEmpty());
                    assertNull(plans.put(chapter, List.copyOf(plan)));
                }
            }
        }
        return plans;
    }

    /** 使用真实领取服务核对资格、钱包或库存到账、单条回执与重复幂等，并导出二进制反馈。 */
    private MainChapterFirstRewardService.Receipt verifyFirstReward(String token, int chapter,
            List<RewardGrantService.Reward> expected, MainChapterService candidate,
            MainChapterFirstRewardService service, TransactionTemplate tx) throws Exception {
        var before = snapshots.snapshot(token);
        var eligible = tx.execute(status -> candidate.current(token)).firstRewardProgress().eligibleChapters();
        assertTrue(eligible.contains(chapter));
        var receipt = tx.execute(status -> service.claim(token, chapter));
        assertEquals(chapter, receipt.chapter());
        assertEquals(expected, receipt.actual().items().stream()
            .map(item -> new RewardGrantService.Reward(item.itemId(), item.credited())).toList());
        var after = snapshots.snapshot(token);
        assertEquals(before.revision() + 1, receipt.assetRevision());
        assertEquals(receipt.assetRevision(), after.revision());
        for (var reward : expected) {
            long change = reward.itemId() == 900002 ? after.role().diamonds() - before.role().diamonds()
                : countInventoryItem(after, reward.itemId()) - countInventoryItem(before, reward.itemId());
            assertEquals(reward.quantity(), change, "第" + chapter + "关奖励 " + reward.itemId());
        }
        var progress = tx.execute(status -> candidate.current(token)).firstRewardProgress();
        assertTrue(progress.claimedChapters().contains(chapter));
        assertFalse(progress.eligibleChapters().contains(chapter));
        assertEquals(receipt, tx.execute(status -> service.claim(token, chapter)));
        var repeated = snapshots.snapshot(token);
        assertEquals(after.revision(), repeated.revision());
        assertEquals(after.role(), repeated.role());
        assertEquals(after.inventory(), repeated.inventory());
        assertEquals(List.of(receipt.receiptId()), jdbc.queryForList("SELECT receipt_id "
            + "FROM game_main_chapter_first_reward WHERE role_id=? AND chapter_id=?", String.class,
            receipt.roleId(), chapter));
        exportReceipt("chapter-first-reward-stage-" + chapter, "chapter.firstreward.claim", receipt);
        return receipt;
    }

    /** 当关真正结算后领取原里程碑，验收背包或英雄名册到账、重试幂等和可回放协议回执。 */
    private void verifyMilestone(String token, int chapter, MilestoneReward expected) throws Exception {
        var before = snapshots.snapshot(token);
        assertFalse(before.mainChapter().milestoneProgress().claimedIds().contains(expected.id()));
        var receipt = milestones.claim(token, expected.id());
        assertEquals(chapter, receipt.targetChapter());
        assertEquals(1, receipt.actual().items().size());
        var reward = receipt.actual().items().getFirst();
        assertEquals(expected.itemId(), reward.itemId());
        assertEquals(expected.amount(), reward.credited());
        var after = snapshots.snapshot(token);
        if (receipt.actual().heroes().isEmpty()) {
            assertEquals(expected.amount(), countInventoryItem(after, expected.itemId())
                - countInventoryItem(before, expected.itemId()));
        } else {
            assertEquals(expected.amount(), receipt.actual().heroes().size());
            for (var hero : receipt.actual().heroes()) {
                assertEquals(expected.itemId(), hero.templateId());
                assertFalse(before.heroes().stream().anyMatch(profile -> profile.id().equals(hero.instanceId())));
                assertTrue(after.heroes().stream().anyMatch(profile -> profile.id().equals(hero.instanceId())
                    && profile.templateId() == expected.itemId()));
            }
        }
        assertTrue(after.mainChapter().milestoneProgress().claimedIds().contains(expected.id()));
        assertEquals(receipt, milestones.claim(token, expected.id()));
        assertEquals(after.revision(), snapshots.snapshot(token).revision());
        exportReceipt("chapter-milestone-stage-" + chapter, "chapter.milestone.claim", receipt);
    }

    /** 导出由生产服务发出的二进制回执，便于本机 Creator 复验结算和奖励展示。 */
    private void exportReceipt(String fixture, String name, Object receipt) throws Exception {
        Files.write(Path.of("target/" + fixture + "-frame.pb"), GameProtocolCodec.encode(Map.of(
            "version", 1, "kind", "response", "name", name, "ok", true, "body", receipt)));
    }

    /** 只读预览使用真实全局目录；输出当前已接通关卡原PB，不改敌人、技能、资产或范围。 */
    @Test
    void configuredReadOnlyBattlesKeepGlobalIndexAndFrozenUnits() throws Exception {
        var player = player();
        var before = snapshots.snapshot(player.token());
        assertEquals(2, new HeroBattleChapterScenario(mapper).enemies(4).size());
        for (int index : List.of(6)) {
            var result = battles.preview(player.token(), index, rate -> rate == 1D);
            var report = result.battle();
            assertEquals("audit:lineup:" + index, report.scenario());
            var configured = new MainChapterRules(mapper).enemies(index);
            var enemies = report.initial().stream().filter(unit -> unit.faction() == 2).toList();
            assertEquals(configured.stream().map(MainChapterRules.Enemy::template).toList(),
                enemies.stream().map(HeroBattleChapterScenario.Unit::template).toList());
            assertEquals(configured.stream().map(MainChapterRules.Enemy::level).toList(),
                enemies.stream().map(HeroBattleChapterScenario.Unit::level).toList());
            var replay = HeroBattleReplayProtocolUtils.encode(report);
            Files.write(Path.of("target/chapter-config-stage-" + index + ".pb"), replay.toByteArray());
            Files.write(Path.of("target/chapter-config-stage-" + index + "-frame.pb"), GameProtocolCodec.encode(Map.of(
                "version", 1, "kind", "response", "name", "battle.preview", "id", UUID.randomUUID().toString(), "ok", true,
                "body", Map.of("mission", index, "assetRevision", result.assetRevision(),
                    "lineupVersion", result.lineupVersion(), "formationId", result.formationId(),
                    "pending", result.pending(), "replay", GameProtocolCodec.tree(replay)))));
        }
        var after = snapshots.snapshot(player.token());
        assertEquals(before.role(), after.role());
        assertEquals(before.revision(), after.revision());
        assertEquals(before.mainChapter(), after.mainChapter());
        assertEquals(before.inventory(), after.inventory());
    }

    /**
     * 以真实成长低级冰晶女巫保留第4关两个原怪到主动与普攻出手，导出实际发生过四种表现的完整PB。
     * 候选只改变合法英雄等级，逐场真实执行；不删敌人/技能、不改临时属性，不将只读结果写成主线胜利。
     */
    @Test
    void fourthStageExportsBothEnemiesActiveAndOrdinarySkills() throws Exception {
        HeroLineupBattleService.Preview selected = null;
        var attempts = new ArrayList<Map<String, Object>>();
        int selectedLevel = 0;
        for (int level : List.of(1, 2, 3, 4, 5, 6, 8, 10, 12)) {
            var player = player(10203003, 3, level, 0);
            var before = snapshots.snapshot(player.token());
            var preview = battles.preview(player.token(), 4, rate -> rate == 1D);
            var report = preview.battle();
            var counts = presentationCounts(report);
            attempts.add(Map.of("heroLevel", level, "rounds", report.rounds(),
                "outcome", report.outcome().name(), "presentationCounts", counts));
            var after = snapshots.snapshot(player.token());
            assertEquals(before.role(), after.role());
            assertEquals(before.revision(), after.revision());
            assertEquals(before.inventory(), after.inventory());
            assertEquals(before.mainChapter(), after.mainChapter());
            if (List.of(3020100, 3021101, 3050300, 3051101).stream().allMatch(counts::containsKey)) {
                selected = preview;
                selectedLevel = level;
                break;
            }
        }
        assertNotNull(selected, "真实等级候选未覆盖全部动作：" + attempts);
        var report = selected.battle();
        var enemySkills = report.frames().stream().flatMap(frame -> frame.trace().stream())
            .filter(trace -> trace.kind().equals("skill.begin") && (trace.sourceId() == 10 || trace.sourceId() == 11))
            .map(HeroBattleHealingExecutor.Trace::configId).toList();
        assertTrue(enemySkills.containsAll(List.of(103020020, 103020021, 103040050, 103040051)));
        assertEquals(List.of(10302002, 10304005), report.initial().stream().filter(unit -> unit.faction() == 2)
            .map(HeroBattleChapterScenario.Unit::template).toList());
        var replay = HeroBattleReplayProtocolUtils.encode(report);
        Files.write(Path.of("target/chapter-config-stage-4.pb"), replay.toByteArray());
        Files.write(Path.of("target/chapter-config-stage-4-frame.pb"), GameProtocolCodec.encode(Map.of(
            "version", 1, "kind", "response", "name", "battle.preview", "id", UUID.randomUUID().toString(), "ok", true,
            "body", Map.of("mission", 4, "assetRevision", selected.assetRevision(),
                "lineupVersion", selected.lineupVersion(), "formationId", selected.formationId(),
                "pending", selected.pending(), "replay", GameProtocolCodec.tree(replay)))));
        Files.writeString(Path.of("target/chapter-config-stage-4-coverage.json"), mapper.writerWithDefaultPrettyPrinter()
            .writeValueAsString(Map.of("readOnly", true, "configuredStageIndex", 4, "heroTemplate", 10203003,
                "heroStar", 3, "heroStage", 0, "heroLevel", selectedLevel, "attempts", attempts,
                "presentationCounts", presentationCounts(report), "enemySkillStarts", enemySkills,
                "report", report)));
    }

    /** 按真实trace计数展示动作，不能以技能配置存在代替该场实际执行过。 */
    private Map<Integer, Long> presentationCounts(HeroBattleChapterScenario.Result report) {
        return report.frames().stream().flatMap(frame -> frame.trace().stream())
            .filter(trace -> trace.kind().equals("presentation"))
            .collect(java.util.stream.Collectors.groupingBy(HeroBattleHealingExecutor.Trace::configId,
                java.util.TreeMap::new, java.util.stream.Collectors.counting()));
    }

    /**
     * 第5关三怪使用原配置完整主动/普攻，按新版原表声明/既有wire保留type1与type3，供核验Lua覆盖。
     * 候选仅调整真实冰晶女巫等级以延长存活，不删敌人或提高假血量，仍只生成只读战报。
     */
    @Test
    void fifthStageExportsThreeEnemiesFullSkillsAndOriginalPlaceholderOrder() throws Exception {
        HeroLineupBattleService.Preview selected = null;
        var attempts = new ArrayList<Map<String, Object>>();
        int selectedLevel = 0;
        for (int level : List.of(1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30)) {
            var player = player(10203003, 3, level, 0);
            var before = snapshots.snapshot(player.token());
            var preview = battles.preview(player.token(), 5, rate -> rate == 1D);
            var report = preview.battle();
            var counts = presentationCounts(report);
            attempts.add(Map.of("heroLevel", level, "rounds", report.rounds(),
                "outcome", report.outcome().name(), "presentationCounts", counts));
            var after = snapshots.snapshot(player.token());
            assertEquals(before.role(), after.role());
            assertEquals(before.revision(), after.revision());
            assertEquals(before.inventory(), after.inventory());
            assertEquals(before.mainChapter(), after.mainChapter());
            if (List.of(1020100, 1021101, 2020100, 2021101, 2050100, 2050300, 2051101)
                    .stream().allMatch(counts::containsKey)) {
                selected = preview;
                selectedLevel = level;
                break;
            }
        }
        assertNotNull(selected, "第5关真实成长候选未覆盖全部动作：" + attempts);
        var report = selected.battle();
        var enemySkills = report.frames().stream().flatMap(frame -> frame.trace().stream())
            .filter(trace -> trace.kind().equals("skill.begin") && trace.sourceId() >= 9)
            .map(HeroBattleHealingExecutor.Trace::configId).toList();
        assertTrue(enemySkills.containsAll(List.of(101020020, 101020021, 102020020,
            102020021, 102040050, 102040051)));
        assertEquals(List.of(10102002, 10202002, 10204005), report.initial().stream()
            .filter(unit -> unit.faction() == 2).map(HeroBattleChapterScenario.Unit::template).toList());
        var coldOrdinary = report.frames().stream().map(HeroBattleChapterScenario.Frame::trace)
            .filter(trace -> trace.stream().anyMatch(event -> event.kind().equals("skill.begin")
                && event.configId() == 102040050)).findFirst().orElseThrow();
        assertEquals(List.of(102040050, 2050100, 2050200, 2050300, 102040050), coldOrdinary.stream()
            .filter(event -> event.kind().equals("skill.begin") || event.kind().equals("skill.end")
                || event.kind().equals("presentation") || event.kind().equals("damage"))
            .map(HeroBattleHealingExecutor.Trace::configId).toList());
        assertEquals(1, coldOrdinary.stream().filter(event -> event.kind().equals("damage")).count());
        var replay = HeroBattleReplayProtocolUtils.encode(report);
        Files.write(Path.of("target/chapter-config-stage-5.pb"), replay.toByteArray());
        Files.write(Path.of("target/chapter-config-stage-5-frame.pb"), GameProtocolCodec.encode(Map.of(
            "version", 1, "kind", "response", "name", "battle.preview", "id", UUID.randomUUID().toString(), "ok", true,
            "body", Map.of("mission", 5, "assetRevision", selected.assetRevision(),
                "lineupVersion", selected.lineupVersion(), "formationId", selected.formationId(),
                "pending", selected.pending(), "replay", GameProtocolCodec.tree(replay)))));
        Files.writeString(Path.of("target/chapter-config-stage-5-coverage.json"), mapper.writerWithDefaultPrettyPrinter()
            .writeValueAsString(Map.of("readOnly", true, "configuredStageIndex", 5, "heroTemplate", 10203003,
                "heroStar", 3, "heroStage", 0, "heroLevel", selectedLevel, "attempts", attempts,
                "presentationCounts", presentationCounts(report), "enemySkillStarts", enemySkills,
                "report", report)));
    }

    /**
     * 第9关三名原怪完整出手，并实际安装1051301暴击降低；只选择合法英雄等级延长战场。
     * 不为胜局修改NPC/血量/系数，原表声明、既有wire和冻结统计均交生产映射器保存。
     */
    @Test
    void ninthStageExportsCompleteNpcSkillsAndRealCriticalDebuff() throws Exception {
        HeroLineupBattleService.Preview selected = null;
        var attempts = new ArrayList<Map<String, Object>>();
        int selectedLevel = 0;
        for (int level : List.of(1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30)) {
            var player = player(10203003, 3, level, 0);
            var before = snapshots.snapshot(player.token());
            var preview = battles.preview(player.token(), 9, rate -> rate == 1D);
            var report = preview.battle();
            var counts = presentationCounts(report);
            long installed = report.frames().stream().flatMap(frame -> frame.trace().stream())
                .filter(event -> event.kind().equals("buff.upsert") && event.configId() == 1051301).count();
            attempts.add(Map.of("heroLevel", level, "rounds", report.rounds(), "outcome", report.outcome().name(),
                "presentationCounts", counts, "criticalDebuffInstalls", installed));
            var after = snapshots.snapshot(player.token());
            assertEquals(before.role(), after.role());
            assertEquals(before.revision(), after.revision());
            assertEquals(before.inventory(), after.inventory());
            assertEquals(before.mainChapter(), after.mainChapter());
            assertEquals(550, after.mainChapter().challengeLimit());
            if (installed > 0 && List.of(1020100, 1021101, 2020100, 2021101, 1050100, 1051101)
                    .stream().allMatch(counts::containsKey)) {
                selected = preview;
                selectedLevel = level;
                break;
            }
        }
        assertNotNull(selected, "第9关真实成长候选未覆盖完整技能/属性动作：" + attempts);
        var report = selected.battle();
        var enemySkills = report.frames().stream().flatMap(frame -> frame.trace().stream())
            .filter(event -> event.kind().equals("skill.begin") && event.sourceId() >= 9)
            .map(HeroBattleHealingExecutor.Trace::configId).toList();
        assertTrue(enemySkills.containsAll(List.of(101020020, 101020021, 102020020,
            102020021, 101040050, 101040051)));
        var enemies = report.initial().stream().filter(unit -> unit.faction() == 2).toList();
        assertEquals(List.of(10102002, 10202002, 10104005), enemies.stream()
            .map(HeroBattleChapterScenario.Unit::template).toList());
        assertTrue(enemies.stream().allMatch(unit -> unit.level() == 5 && unit.stage() == 0));
        var debuffs = report.frames().stream().flatMap(frame -> frame.trace().stream())
            .filter(event -> event.kind().equals("buff.upsert") && event.configId() == 1051301).toList();
        assertTrue(debuffs.stream().allMatch(event -> event.sourceId() == 11 && event.targetId() == 2
            && event.buff().spec().effect() == 2 && event.buff().spec().conflict() == 1052));
        var replay = HeroBattleReplayProtocolUtils.encode(report);
        Files.write(Path.of("target/chapter-config-stage-9.pb"), replay.toByteArray());
        Files.write(Path.of("target/chapter-config-stage-9-frame.pb"), GameProtocolCodec.encode(Map.of(
            "version", 1, "kind", "response", "name", "battle.preview", "id", UUID.randomUUID().toString(), "ok", true,
            "body", Map.of("mission", 9, "assetRevision", selected.assetRevision(),
                "lineupVersion", selected.lineupVersion(), "formationId", selected.formationId(),
                "pending", selected.pending(), "replay", GameProtocolCodec.tree(replay)))));
        Files.writeString(Path.of("target/chapter-config-stage-9-coverage.json"), mapper.writerWithDefaultPrettyPrinter()
            .writeValueAsString(Map.of("readOnly", true, "configuredStageIndex", 9, "heroTemplate", 10203003,
                "heroStar", 3, "heroStage", 0, "heroLevel", selectedLevel, "attempts", attempts,
                "presentationCounts", presentationCounts(report), "enemySkillStarts", enemySkills,
                "report", report)));
    }

    /** 保留第 10～20 关全部原守军主动和普攻的可复验战报。 */
    @Test
    void tenthThroughTwentiethStagesExportEveryConfiguredEnemySkill() throws Exception {
        exportConfiguredEnemySkillCoverage(10, 20);
    }

    /** 录制第 26～30 关原守军完整出手，补足强队首通可能提前击杀施法者的覆盖。 */
    @Test
    void twentySixthThroughThirtiethStagesExportEveryConfiguredEnemySkill() throws Exception {
        exportConfiguredEnemySkillCoverage(26, 30);
    }

    /** 录制截至第 37 关的连续原守军普攻和主动，覆盖换章后的实际播放。 */
    @Test
    void thirtyFirstThroughThirtySeventhStagesExportEveryConfiguredEnemySkill() throws Exception {
        exportConfiguredEnemySkillCoverage(31, 37);
    }

    /** 录制第 38～40 关完整出手，亡灵之刃战报必须包含对坦克的实际追击。 */
    @Test
    void thirtyEighthThroughFortiethStagesExportEveryConfiguredEnemySkill() throws Exception {
        exportConfiguredEnemySkillCoverage(38, 40);
    }

    /** 第 42 关的深渊元首须实际释放新补的主动特效，强队首通可能在施法前击杀。 */
    @Test
    void stageFortyTwoExportsOriginalEnemyActions() throws Exception {
        exportConfiguredEnemySkillCoverage(42, 42);
    }

    /** 用持久角色的合法成长候选取得原守军完整出手，输出可播放的只读战报和各动作出现次数。 */
    private void exportConfiguredEnemySkillCoverage(int firstStage, int lastStage) throws Exception {
        var coverage = new ArrayList<Map<String, Object>>();
        for (int index = firstStage; index <= lastStage; index++) {
            HeroLineupBattleService.Preview selected = null;
            int selectedLevel = 0;
            var attempts = new ArrayList<Map<String, Object>>();
            // 第 38 关用坦克布兰特承受追击；其余关保持之前的冰晶女巫样本。
            int template = index == 38 ? 10304012 : 10203003;
            int star = index == 38 ? 4 : 3;
            // 后三关的重复同模板守军共享相同动作；保留完整站位，播放覆盖按唯一技能统计。
            boolean includeSlotInCoverage = index < 38;
            var levels = index >= 38 ? List.of(12, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100)
                : List.of(1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50);
            for (int level : levels) {
                var player = player(template, star, level, 0);
                var before = snapshots.snapshot(player.token());
                var preview = battles.preview(player.token(), index, probability -> true);
                var report = preview.battle();
                var expected = report.initial().stream().filter(unit -> unit.faction() == 2)
                    .flatMap(unit -> unit.skills().stream().map(skill ->
                        (includeSlotInCoverage ? unit.id() + ":" : "") + skill.skillId()))
                    .collect(java.util.stream.Collectors.toSet());
                var occurred = report.frames().stream().flatMap(frame -> frame.trace().stream())
                    .filter(event -> event.kind().equals("skill.begin") && event.sourceId() >= 9)
                    .map(event -> (includeSlotInCoverage ? event.sourceId() + ":" : "") + event.configId())
                    .collect(java.util.stream.Collectors.toSet());
                boolean tankFollowup = report.frames().stream().flatMap(frame -> frame.trace().stream())
                    .anyMatch(event -> event.kind().equals("damage") && event.configId() == 5081501
                        && event.sourceId() >= 9 && event.targetId() == 2);
                attempts.add(Map.of("heroLevel", level, "expected", expected, "occurred", occurred,
                    "tankFollowup", tankFollowup));
                var after = snapshots.snapshot(player.token());
                assertEquals(before.role(), after.role());
                assertEquals(before.revision(), after.revision());
                assertEquals(before.inventory(), after.inventory());
                assertEquals(before.heroes(), after.heroes());
                assertEquals(before.mainChapter(), after.mainChapter());
                if (occurred.containsAll(expected) && (index != 38 || tankFollowup)) {
                    selected = preview;
                    selectedLevel = level;
                    break;
                }
            }
            assertNotNull(selected, "完整NPC普通/主动未出现：关=" + index + "；" + attempts);
            var report = selected.battle();
            assertEquals("audit:lineup:" + index, report.scenario());
            var configured = new MainChapterRules(mapper).enemies(index);
            var enemies = report.initial().stream().filter(unit -> unit.faction() == 2).toList();
            assertEquals(configured.stream().map(MainChapterRules.Enemy::template).toList(),
                enemies.stream().map(HeroBattleChapterScenario.Unit::template).toList());
            var replay = HeroBattleReplayProtocolUtils.encode(report);
            Files.write(Path.of("target/chapter-config-stage-" + index + ".pb"), replay.toByteArray());
            Files.write(Path.of("target/chapter-config-stage-" + index + "-frame.pb"), GameProtocolCodec.encode(Map.of(
                "version", 1, "kind", "response", "name", "battle.preview", "id", UUID.randomUUID().toString(), "ok", true,
                "body", Map.of("mission", index, "assetRevision", selected.assetRevision(),
                    "lineupVersion", selected.lineupVersion(), "formationId", selected.formationId(),
                    "pending", selected.pending(), "replay", GameProtocolCodec.tree(replay)))));
            coverage.add(Map.of("stage", index, "heroLevel", selectedLevel, "scenario", report.scenario(),
                "enemyCount", enemies.size(), "attempts", attempts, "presentationCounts", presentationCounts(report),
                "outcome", report.outcome().name(), "readOnly", true));
        }
        Files.writeString(Path.of("target/chapter-config-stage" + firstStage + "-" + lastStage + "-coverage.json"),
            mapper.writerWithDefaultPrettyPrinter().writeValueAsString(coverage));
    }

    /** 已有第三关待结算降到二关范围后仍可恢复原请求并一次结算，不按新范围删除旧成果。 */
    @Test
    void narrowedScopeStillRecoversOriginalPendingReceiptAndFrozenRewardPlan() {
        var player = player();
        cleared(player, 2);
        String requestId = UUID.randomUUID().toString();
        var original = chapters.challenge(player.token(), requestId);
        assertEquals(3, original.state().maxCleared());
        assertEquals(original.battleId(), original.state().pendingBattleId());
        var lower = serviceAtLimit(2);
        var tx = new TransactionTemplate(transactions);
        var current = tx.execute(status -> lower.current(player.token()));
        assertEquals(2, current.challengeLimit());
        assertEquals(3, current.maxCleared());
        assertEquals(original, tx.execute(status -> lower.challenge(player.token(), requestId)));
        String settleRequest = UUID.randomUUID().toString();
        var receipt = tx.execute(status -> lower.challenge(player.token(), settleRequest));
        assertEquals(MainChapterService.Action.SETTLED, receipt.action());
        assertEquals(original.battleId(), receipt.battleId());
        assertNull(receipt.state().pendingBattleId());
        assertEquals(2, receipt.state().challengeLimit());
        var after = snapshots.snapshot(player.token());
        assertEquals(receipt, tx.execute(status -> lower.claim(player.token(), original.battleId())));
        assertEquals(receipt, tx.execute(status -> lower.challenge(player.token(), settleRequest)));
        assertEquals(after.role(), snapshots.snapshot(player.token()).role());
        assertEquals(after.revision(), snapshots.snapshot(player.token()).revision());
        assertThrows(IllegalArgumentException.class,
            () -> tx.execute(status -> lower.challenge(player.token(), UUID.randomUUID().toString())));
    }

    /** 历史 JSON 缺范围保持 null，并校验当前默认值与完整目录、旧映射边界各自独立。 */
    @Test
    void legacyStateKeepsMissingLimitAndCompleteCatalogDoesNotBypassDependencies() {
        var old = mapper.readValue("{\"maxCleared\":3,\"pendingBattleId\":null,\"assetRevision\":1}", MainChapterService.State.class);
        assertNull(old.challengeLimit());
        assertNull(old.milestoneProgress());
        assertThrows(IllegalArgumentException.class, () -> new HeroBattleChapterScenario(mapper).enemies(551));
        assertEquals(270, idle.stage(21).base().getFirst().quantity());
        assertEquals(550, new MainChapterRules(mapper).challengeLimit());

    }

    /** 构建同一依赖但采用指定可信范围的领域实例；测试调用仍由外层真实事务持锁。 */
    private MainChapterService serviceAtLimit(int limit) {
        return new MainChapterService(sessions, roles, jdbc, new MainChapterRules(mapper, limit), powers,
            battles, rewards, sync, mapper, idleStates, firstRewards);
    }
}
