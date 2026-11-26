/**
 * 主线首通和里程碑领奖的独立本机预览宿主。仅测试类路径可运行，强制随机内存H2及回环端口。
 * 准备指定阶段的强队和历史进度，之后挑战、结算、领取和重连全部走真实WS与领域事务。
 * 不访问日常库，不输出凭证；本次随机run的停止文件关闭应用，HTTP仅提供测试实例身份。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.campaign.IdleActivityMaintenanceService;
import com.funsgamex.mxzg.campaign.MainChapterMilestoneRules;
import com.funsgamex.mxzg.campaign.MainChapterMilestoneService;
import com.funsgamex.mxzg.campaign.MainChapterRules;
import com.funsgamex.mxzg.hero.HeroBattleAttributeUtils;
import com.funsgamex.mxzg.hero.HeroBattleChapterScenario.Unit;
import com.funsgamex.mxzg.hero.HeroGrowthRules;
import com.funsgamex.mxzg.lineup.Lineup;
import com.funsgamex.mxzg.lineup.MainFormationCommandService;
import com.funsgamex.mxzg.network.SessionSnapshotService;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.test.context.TestComponent;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.ObjectMapper;

public final class MainChapterProgressionPreview {
    /** 只属于本进程的随机测试标识，客户端核对后才允许连接，不复用日常存储空间。 */
    private static final String RUN = UUID.randomUUID().toString().replace("-", "");

    /** 只提供显式启动入口，所有游戏状态仍由应用领域服务持有。 */
    private MainChapterProgressionPreview() {}

    /** 启动全新隔离库，指定后段候选上限时准备其换图、奖励和战斗抽验角色。 */
    public static void main(String[] args) throws Exception {
        if (args.length > 1 || !Files.isRegularFile(Path.of("pom.xml"))) {
            throw new IllegalArgumentException("必须在backend目录启动，仅可指定一个预览夹具");
        }
        int challengeLimit = args.length == 0 ? 20 : switch (args[0]) {
            case "--stage100-fixture" -> 100;
            case "--stage110-fixture" -> 110;
            case "--stage300-fixture" -> 300;
            case "--stage360-fixture" -> 360;
            case "--stage400-fixture" -> 400;
            case "--stage440-fixture" -> 440;
            case "--stage550-fixture" -> 550;
            default -> throw new IllegalArgumentException("未知主线预览夹具：" + args[0]);
        };
        String fixture = "chapter-stage" + challengeLimit + "-preview";
        Path directory = Path.of("target", fixture + "-" + RUN).toAbsolutePath().normalize();
        Files.createDirectories(directory);
        try (var context = SpringApplication.run(new Class<?>[] {GameApplication.class, Identity.class}, new String[] {
            "--spring.profiles.active=local", "--server.address=127.0.0.1", "--server.port=0",
            "--spring.datasource.url=jdbc:h2:mem:" + fixture + "_" + RUN
                + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
            "--spring.datasource.username=sa", "--spring.datasource.password=", "--mxzg.gm.enabled=false",
            "--mxzg.main-chapter.challenge-limit=" + challengeLimit,
        })) {
            var prepared = switch (challengeLimit) {
                case 100 -> Map.of("chapter100_50", 49, "chapter100_80", 79, "chapter100_100", 99, "chapter100_start", 40);
                case 110 -> Map.of("chapter110_101", 100, "chapter110_103", 102, "chapter110_110", 109);
                case 300 -> Map.of("chapter300_140", 139, "chapter300_159", 158, "chapter300_160", 159,
                    "chapter300_200", 199, "chapter300_201", 200, "chapter300_202", 201,
                    "chapter300_281", 280, "chapter300_282", 281, "chapter300_300", 299);
                case 360 -> Map.of("chapter360_301", 300, "chapter360_321", 320, "chapter360_330", 329,
                    "chapter360_351", 350, "chapter360_360", 359, "chapter360_run", 300);
                case 400 -> Map.of("chapter400_361", 360, "chapter400_362", 361, "chapter400_363", 362,
                    "chapter400_390", 389, "chapter400_400", 399, "chapter400_run", 360);
                case 440 -> Map.of("chapter440_401", 400, "chapter440_402", 401, "chapter440_404", 403,
                    "chapter440_425", 424, "chapter440_440", 439, "chapter440_run", 400);
                case 550 -> Map.of("chapter550_441", 440, "chapter550_451", 450, "chapter550_500", 499,
                    "chapter550_525", 524, "chapter550_550", 549, "chapter550_run", 440);
                default -> Map.of("chapter20_review", 14, "chapter20_start", 0);
            };
            for (var player : prepared.entrySet()) {
                preparePlayer(context, player.getKey(), player.getValue(), challengeLimit);
            }
            if (challengeLimit >= 300) {
                long now = Instant.now().getEpochSecond();
                context.getBean(IdleActivityMaintenanceService.class).configure("local-1", now - 86_400,
                    Optional.empty(), now);
            }
            int port = ((WebServerApplicationContext) context).getWebServer().getPort();
            var mapper = context.getBean(ObjectMapper.class);
            int preparedProgress = prepared.values().stream().filter(cleared -> cleared > 0).min(Integer::compareTo)
                .orElseThrow();
            Files.writeString(directory.resolve("owner.json"), mapper.writeValueAsString(Map.of(
                "kind", "mxzg-owned-socket-it", "run", RUN, "pid", ProcessHandle.current().pid(),
                "port", port, "directory", directory.toString(), "isolatedFixture", true,
                "preparedProgress", preparedProgress, "players", prepared,
                "challengeLimit", context.getBean(MainChapterRules.class).challengeLimit())));
            Files.writeString(Path.of("..", "client", "temp", fixture + "-owner.json"),
                Files.readString(directory.resolve("owner.json")));
            System.out.println("[CHAPTER-PREVIEW] port=" + port + " run=" + RUN + " players=" + prepared);
            while (!Files.exists(directory.resolve("stop.request"))) {
                Thread.sleep(500);
            }
        }
        Files.writeString(directory.resolve("stopped"), "closed");
    }

    /**
     * 仅向本次内存库写历史进度和可挑战的原配置阵容。较早的里程碑经原服务领取并持久化回执，
     * 目标关卡的战报、首通结算和里程碑资格留给实战操作。连续验证账号以 `_run` 结尾，角色等级取末关门槛。
     */
    private static void preparePlayer(ConfigurableApplicationContext context, String account, int cleared,
            int challengeLimit) {
        var player = context.getBean(DevelopmentLoginService.class).login(account);
        var jdbc = context.getBean(JdbcTemplate.class);
        String role = player.role().id();
        String token = "Bearer " + player.session().accessToken();
        String hero = UUID.randomUUID().toString();
        var chapterRules = context.getBean(MainChapterRules.class);
        if (challengeLimit > 20) {
            int requiredLevel = chapterRules.stage(account.endsWith("_run") ? challengeLimit : cleared + 1)
                .requiredLevel();
            jdbc.update("UPDATE game_role SET role_level=?,first_named=TRUE WHERE id=?", Math.max(31, requiredLevel), role);
        }
        int heroLevel = 100;
        int growthStage = 3;
        int leaderStar = lateChapterLeaderStar(challengeLimit);
        boolean fullLineup = leaderStar > 9;
        if (challengeLimit >= 300) {
            int highestGuardLevel = chapterRules.enemies(cleared + 1).stream()
                .mapToInt(MainChapterRules.Enemy::level).max().orElseThrow();
            heroLevel = fullLineup ? 200 : Math.max(100, highestGuardLevel + 20);
            growthStage = 6;
        }
        int leaderLevel = fullLineup ? context.getBean(HeroGrowthRules.class).limit(200, 6, leaderStar) : heroLevel;
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage) VALUES (?,?,10105011,?,?,?)",
            hero, role, leaderLevel, leaderStar, growthStage);
        if (cleared > 0) {
            jdbc.update("INSERT INTO game_main_chapter(role_id,max_cleared) VALUES (?,?)", role, cleared);
            jdbc.update("INSERT INTO game_main_chapter_idle(role_id,started_at) VALUES (?,?)", role,
                Instant.now().getEpochSecond() - 70);
        }
        var state = context.getBean(SessionSnapshotService.class).snapshot(token);
        var lineup = challengeLimit >= 300 ? prepareLateChapterLineup(jdbc, role, hero, heroLevel, leaderStar, leaderLevel)
            : List.of(new Lineup.Slot(2, hero));
        context.getBean(MainFormationCommandService.class).save(token,
            new MainFormationCommandService.Save(UUID.randomUUID().toString(), state.mainFormation().version(), 1,
                lineup));
        if (challengeLimit > 20) {
            var milestones = context.getBean(MainChapterMilestoneService.class);
            var rules = context.getBean(MainChapterMilestoneRules.class);
            for (int rewardId : List.of(100, 150, 200, 300, 400, 500)) {
                if (rules.require(rewardId).targetChapter() <= cleared) {
                    milestones.claim(token, rewardId);
                }
            }
        }
    }

    /** 按隔离测试的目标上限选队长星级，后段提高合法养成以避免随机败场打断连续验收。 */
    static int lateChapterLeaderStar(int challengeLimit) {
        if (challengeLimit >= 550) {
            return 14;
        }
        if (challengeLimit >= 440) {
            return 12;
        }
        if (challengeLimit >= 400) {
            return 11;
        }
        return challengeLimit >= 360 ? 10 : 9;
    }

    /**
     * 按原终阶和星级上限准备能力已接通的不同模板，不直接写战报或结果。
     * @param level 九星成员等级，在原200级上限内随预览目标选择
     * @param leaderStar 队长星级，十星起使用完整六人队，从十二星起六名成员均具备所需四技能
     * @param leaderLevel 队长按原成长规则所得等级上限，可用对应技能的成员复用
     */
    static List<Lineup.Slot> prepareLateChapterLineup(JdbcTemplate jdbc, String role, String leader, int level,
            int leaderStar, int leaderLevel) {
        boolean fullLineup = leaderStar > 9;
        var lineup = new ArrayList<>(List.of(new Lineup.Slot(fullLineup ? 6 : 2, leader)));
        var templates = fullLineup ? Map.of(2, 10204013, 3, 10105010, 5, 10205011, 7, 10305010, 8, 10205023)
            : Map.of(3, 10105010, 5, 10205011, 7, 10305010);
        var slots = templates.entrySet().stream().sorted(Map.Entry.comparingByKey()).toList();
        for (var member : slots) {
            String heroId = UUID.randomUUID().toString();
            // 从十二星夹具起，六个模板的四技能已经接通，成员均按同一上限养成。
            boolean advanced = leaderStar >= 12 || (fullLineup && member.getKey() != 5 && member.getKey() != 7);
            jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage) VALUES (?,?,?,?,?,6)",
                heroId, role, member.getValue(), advanced ? leaderLevel : level, advanced ? leaderStar : 9);
            lineup.add(new Lineup.Slot(member.getKey(), heroId));
        }
        return List.copyOf(lineup);
    }

    /** 600 层隔离结算验收用强队。只加强测试攻方，原守军、回放、胜负和奖品由实际逻辑计算。 */
    static List<Unit> dreamlandAcceptanceTeam(List<Unit> frozenTeam) {
        var result = new ArrayList<Unit>();
        for (var unit : frozenTeam) {
            var attributes = new HashMap<>(unit.attributes());
            attributes.computeIfPresent(220, (key, amount) -> Math.multiplyExact(amount, 8L));
            attributes.computeIfPresent(223, (key, amount) -> Math.multiplyExact(amount, 4L));
            result.add(new Unit(unit.id(), unit.faction(), unit.template(), unit.level(), unit.star(), unit.stage(),
                unit.position(), attributes, HeroBattleAttributeUtils.opening(attributes), unit.skills(), unit.portraitIconId()));
        }
        return List.copyOf(result);
    }

    /** 仅显式导入本测试宿主的身份探针；不被正式游戏装配，也不返回角色或凭证。 */
    @TestComponent
    @RestController
    public static final class Identity {
        /** 客户端连接前核对随机实例，不允许静默回退到日常后端。 */
        @GetMapping("/api/v1/test-identity")
        public Map<String, String> identity() {
            return Map.of("kind", "mxzg-owned-socket-it", "run", RUN);
        }
    }
}
