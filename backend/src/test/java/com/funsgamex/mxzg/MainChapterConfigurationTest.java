/**
 * 配置化主线的独立H2回归：新挑战范围、全局关卡只读预览和降低范围后的历史结算。
 * 只为隔离角色准备数据，原回执与共享事务均走生产链，不连接日常数据库或修改运行中的范围。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.campaign.IdleRules;
import com.funsgamex.mxzg.campaign.MainChapterIdleStateRepository;
import com.funsgamex.mxzg.campaign.MainChapterRewardService;
import com.funsgamex.mxzg.campaign.MainChapterRules;
import com.funsgamex.mxzg.campaign.MainChapterService;
import com.funsgamex.mxzg.hero.HeroBattleChapterScenario;
import com.funsgamex.mxzg.hero.HeroBattleReplayProtocolUtils;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor;
import com.funsgamex.mxzg.hero.HeroLineupBattleService;
import com.funsgamex.mxzg.hero.HeroMainPowerService;
import com.funsgamex.mxzg.lineup.Lineup;
import com.funsgamex.mxzg.lineup.MainFormationCommandService;
import com.funsgamex.mxzg.network.AssetSyncService;
import com.funsgamex.mxzg.network.GameProtocolCodec;
import com.funsgamex.mxzg.network.SessionSnapshotService;
import com.funsgamex.mxzg.reward.RewardGrantService;
import com.funsgamex.mxzg.role.RoleRepository;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;
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
    /** 只创建隔离测试角色，签发凭证不输出。 */
    @Autowired private DevelopmentLoginService login;
    /** 真实鉴权服务供不同只读范围的领域实例复用。 */
    @Autowired private SessionService sessions;
    /** 当前默认开放连续二十关的真实主线服务。 */
    @Autowired private MainChapterService chapters;
    /** 真实共享发奖适配，历史结算仍消费持久冻结计划。 */
    @Autowired private MainChapterRewardService rewards;
    /** 只读输入及计算不会修改角色资产。 */
    @Autowired private HeroLineupBattleService battles;
    /** 原队伍战力及持久输入版本。 */
    @Autowired private HeroMainPowerService powers;
    /** 角色锁、资产和统一版本。 */
    @Autowired private RoleRepository roles;
    /** 原统一状态快照，验证新挑战范围随最终revision保留。 */
    @Autowired private SessionSnapshotService snapshots;
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

    /** 二十关之外不自动开放；第二十一关新挑战拒绝且事务不落战报或推进资产版本。 */
    @Test
    void defaultScopeRejectsTwentyFirstNewChallengeWithoutChangingAssets() {
        var player = player();
        cleared(player, 20);
        var before = snapshots.snapshot(player.token());
        assertEquals(20, before.mainChapter().challengeLimit());
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

    /** 默认二十关均经真实挑战和结算；重复回执不多发奖，最后一关结算后不跳到离散可用关。 */
    @Test
    void defaultScopeChallengesAndSettlesAllTwentyContinuousStages() throws Exception {
        var player = player();
        for (int index = 1; index <= 20; index++) {
            String requestId = UUID.randomUUID().toString();
            var battle = chapters.challenge(player.token(), requestId);
            assertEquals(MainChapterService.Action.BATTLE, battle.action());
            assertEquals(index, battle.state().maxCleared());
            assertEquals(20, battle.state().challengeLimit());
            assertEquals("chapter:lineup:" + index, chapters.replay(player.token(), battle.battleId()).replay().getScenario());
            assertEquals(battle, chapters.challenge(player.token(), requestId));
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
        Files.write(Path.of("target/chapter-open-scope-20.pb"), GameProtocolCodec.encode(Map.of(
            "version", 1, "kind", "event", "name", "state.changed", "body", finalSnapshot)));
        assertThrows(IllegalArgumentException.class,
            () -> chapters.challenge(player.token(), UUID.randomUUID().toString()));
        assertEquals(finalSnapshot.revision(), snapshots.snapshot(player.token()).revision());
        assertEquals(20, jdbc.queryForObject("SELECT COUNT(*) FROM game_main_chapter_battle WHERE role_id=?", Integer.class, player.role()));
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
            assertEquals(20, after.mainChapter().challengeLimit());
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

    /**
     * 每关使用真实持久英雄及阵型读取完整敌方普通/主动，再导出合法只读PB供客户端播放。
     * 合法成长候选只延长战场，不改原敌方、技能、伤害或场景标签；失败样本同样验证完整出手。
     */
    @Test
    void tenthThroughTwentiethStagesExportEveryConfiguredEnemySkill() throws Exception {
        var coverage = new ArrayList<Map<String, Object>>();
        for (int index = 10; index <= 20; index++) {
            HeroLineupBattleService.Preview selected = null;
            int selectedLevel = 0;
            var attempts = new ArrayList<Map<String, Object>>();
            for (int level : List.of(1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50)) {
                var player = player(10203003, 3, level, 0);
                var before = snapshots.snapshot(player.token());
                var preview = battles.preview(player.token(), index, probability -> true);
                var report = preview.battle();
                var expected = report.initial().stream().filter(unit -> unit.faction() == 2)
                    .flatMap(unit -> unit.skills().stream().map(skill -> unit.id() + ":" + skill.skillId()))
                    .collect(java.util.stream.Collectors.toSet());
                var occurred = report.frames().stream().flatMap(frame -> frame.trace().stream())
                    .filter(event -> event.kind().equals("skill.begin") && event.sourceId() >= 9)
                    .map(event -> event.sourceId() + ":" + event.configId())
                    .collect(java.util.stream.Collectors.toSet());
                attempts.add(Map.of("heroLevel", level, "expected", expected, "occurred", occurred));
                var after = snapshots.snapshot(player.token());
                assertEquals(before.role(), after.role());
                assertEquals(before.revision(), after.revision());
                assertEquals(before.inventory(), after.inventory());
                assertEquals(before.heroes(), after.heroes());
                assertEquals(before.mainChapter(), after.mainChapter());
                if (occurred.containsAll(expected)) {
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
        Files.writeString(Path.of("target/chapter-config-stage10-20-coverage.json"),
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

    /** 历史JSON缺范围保持null；新范围不从历史maxCleared推断，也不覆盖历史回执。 */
    @Test
    void legacyStateKeepsMissingLimitAndCompleteCatalogDoesNotBypassDependencies() {
        var old = mapper.readValue("{\"maxCleared\":3,\"pendingBattleId\":null,\"assetRevision\":1}", MainChapterService.State.class);
        assertNull(old.challengeLimit());
        assertNull(old.milestoneProgress());
        assertThrows(IllegalArgumentException.class, () -> new HeroBattleChapterScenario(mapper).enemies(551));
        assertEquals(270, idle.stage(21).base().getFirst().quantity());
        assertEquals(20, new MainChapterRules(mapper).challengeLimit());

    }

    /** 构建同一依赖但采用较小可信范围的领域实例；测试调用仍由外层真实事务持锁。 */
    private MainChapterService serviceAtLimit(int limit) {
        return new MainChapterService(sessions, roles, jdbc, new MainChapterRules(mapper, limit), powers,
            battles, rewards, sync, mapper, idleStates);
    }
}
