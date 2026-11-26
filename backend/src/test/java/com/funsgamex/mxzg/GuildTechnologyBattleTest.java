/**
 * 在独立 H2 比较同一队伍点亮科技前后的权威面板、战力和实际守军战报。
 * 入会、换会、点亮和重置通过业务服务提交，测试只准备角色、英雄和可消费资产。
 */
package com.funsgamex.mxzg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.guild.GuildService;
import com.funsgamex.mxzg.guild.GuildTechnologyRules;
import com.funsgamex.mxzg.guild.GuildTechnologyService;
import com.funsgamex.mxzg.hero.HeroBattleChapterScenario;
import com.funsgamex.mxzg.hero.HeroBattleReplayProtocolUtils;
import com.funsgamex.mxzg.hero.HeroLineupBattleService;
import com.funsgamex.mxzg.hero.HeroProfile;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.lineup.Lineup;
import com.funsgamex.mxzg.lineup.MainFormationCommandService;
import com.funsgamex.mxzg.network.SessionSnapshotService;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.time.GameClock;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:guild_technology_battle;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.gm.enabled=false"
})
@ActiveProfiles("local")
class GuildTechnologyBattleTest {
    /** 本次点亮战士职业；同队法师用于确认科技不跨职业生效。 */
    private static final int WARRIOR = 1;
    /** 在一阶六次点亮后，生命、攻击、暴击、暴伤、速度及增伤各一级。 */
    private static final GuildTechnologyRules.Progress FULL_FIRST_STAGE = new GuildTechnologyRules.Progress(1, 6);
    /** 旧公会捐献和科技共用的贡献道具。 */
    private static final int GUILD_MEDAL_ID = 901301;

    /** 测试只登录隔离角色，业务从已认证身份取得角色。 */
    @Autowired private DevelopmentLoginService login;
    /** 通过真实公会身份变更启用或停用角色科技。 */
    @Autowired private GuildService guilds;
    /** 通过生产事务依次升级和重置职业节点。 */
    @Autowired private GuildTechnologyService technology;
    /** 从原表取得实际节点属性。 */
    @Autowired private GuildTechnologyRules rules;
    /** 保存同一队伍供面板和战场读取。 */
    @Autowired private MainFormationCommandService formations;
    /** 会话初始化及提交后的资产权威视图。 */
    @Autowired private SessionSnapshotService snapshots;
    /** 使用真实持久阵容、配置守军和正式战斗引擎。 */
    @Autowired private HeroLineupBattleService battle;
    /** 验证业务事务已更新主阵投影，无需依赖重新登录。 */
    @Autowired private RoleRepository roles;
    /** 为隔离角色准备贡献。 */
    @Autowired private InventoryService inventory;
    /** 将隔离贡献写入真实持久库存。 */
    @Autowired private PlatformTransactionManager transactions;
    /** 准备角色等级、资源及真实英雄模板。 */
    @Autowired private JdbcTemplate jdbc;
    /** 将离会测试推进到重新入会冷却以后。 */
    @Autowired private GameClock clock;

    /** 当前测试角色的标识及认证串。 */
    private record Player(String roleId, String authorization) {}

    /** 从真实科技事务增减角色属性，验证职业隔离、退会、换会与战斗数值。 */
    @Test
    void technologyChangesOccupationPowerAndLiveBattleUntilGuildMembershipEnds() {
        var player = player();
        String warrior = seedHero(player, 10105008, 60, 5, 4);
        String mage = seedHero(player, 10101001, 1, 1, 0);
        String guildId = createGuild(player);
        formations.save(player.authorization(), new MainFormationCommandService.Save(id(),
                snapshots.snapshot(player.authorization()).mainFormation().version(), 1,
                List.of(new Lineup.Slot(2, warrior), new Lineup.Slot(3, mage))));
        var before = snapshots.snapshot(player.authorization());
        var baselineBattle = fight(player);
        long version = technology.info(player.roleId()).version();

        for (int step = 1; step <= FULL_FIRST_STAGE.step(); step++) {
            version = technology.upgrade(player.roleId(), new GuildTechnologyService.Command(id(), WARRIOR, version)).version();
        }
        int storedPower = roles.findById(player.roleId()).orElseThrow().power();
        var improved = snapshots.snapshot(player.authorization());
        assertTrue(storedPower > before.role().power());
        assertEquals(storedPower, improved.role().power());
        var originalWarrior = hero(before, warrior);
        var trainedWarrior = hero(improved, warrior);
        assertTrue(trainedWarrior.panelStats().includedSources().contains("guild_technology"));
        assertTrue(trainedWarrior.panelStats().power() > originalWarrior.panelStats().power());
        assertEquals(hero(before, mage), hero(improved, mage));
        assertTechnologyInBattle(player, baselineBattle);

        var left = guilds.change(player.roleId(), new GuildService.Command(id(), GuildService.Action.LEAVE,
                guildId, null, null, null));
        assertEquals(before.role().power(), roles.findById(player.roleId()).orElseThrow().power());
        assertEquals(originalWarrior, hero(snapshots.snapshot(player.authorization()), warrior));
        assertFalse(technology.info(player.roleId()).member());
        assertEquals(version, technology.info(player.roleId()).version());
        assertEquals(unit(baselineBattle, 2).opening(), unit(fight(player), 2).opening());

        try {
            clock.setEpochSeconds(Math.addExact(left.rejoinAtSeconds(), 86_400L));
            var leader = player();
            String otherGuild = createGuild(leader);
            guilds.change(player.roleId(), new GuildService.Command(id(), GuildService.Action.APPLY,
                    otherGuild, null, null, null));
            var approval = guilds.change(leader.roleId(), new GuildService.Command(id(), GuildService.Action.APPROVE,
                    otherGuild, player.roleId(), null, null));
            assertEquals(storedPower, approval.members().stream().filter(row -> row.id().equals(player.roleId()))
                    .findFirst().orElseThrow().power());
            assertEquals(storedPower, roles.findById(player.roleId()).orElseThrow().power());
            assertEquals(trainedWarrior, hero(snapshots.snapshot(player.authorization()), warrior));
            assertEquals(version, technology.info(player.roleId()).version());
            assertTechnologyInBattle(player, baselineBattle);
        } finally {
            clock.reset();
        }

        technology.reset(player.roleId(), new GuildTechnologyService.Command(id(), WARRIOR, version));
        assertEquals(before.role().power(), roles.findById(player.roleId()).orElseThrow().power());
        assertEquals(originalWarrior, hero(snapshots.snapshot(player.authorization()), warrior));
        assertEquals(unit(baselineBattle, 2).opening(), unit(fight(player), 2).opening());
    }

    /** 对照真实战斗输入、冻结战报和攻击实际走到的扣血链路。 */
    private void assertTechnologyInBattle(Player player, HeroBattleChapterScenario.Result before) {
        var after = fight(player);
        var attacker = unit(after, 2);
        var baseline = unit(before, 2);
        rules.attributes(WARRIOR, FULL_FIRST_STAGE).forEach((attribute, amount) ->
                assertEquals(baseline.attributes().getOrDefault(attribute, 0L) + amount,
                        attacker.attributes().getOrDefault(attribute, 0L), "科技属性仅加入一次：" + attribute));
        assertEquals(unit(before, 3), unit(after, 3));
        assertTrue(attacker.opening().maxHp() > baseline.opening().maxHp());
        assertTrue(attacker.opening().attack() > baseline.opening().attack());
        assertTrue(firstDamage(after, attacker.id()) > firstDamage(before, baseline.id()));
        var replay = HeroBattleReplayProtocolUtils.encode(after);
        assertEquals(attacker.opening().maxHp(), replay.getUnitsList().stream()
                .filter(row -> row.getUnitId() == attacker.id()).findFirst().orElseThrow().getMaxHp());
    }

    /** 从服务器保存的主阵容挑战原配置关卡，固定概率选择便于作前后对照。 */
    private HeroBattleChapterScenario.Result fight(Player player) {
        return battle.preview(player.authorization(), 1, rate -> rate >= 1D).battle();
    }

    /** 只读取真实攻方对应格位，避免把同格守军视为己方。 */
    private static HeroBattleChapterScenario.Unit unit(HeroBattleChapterScenario.Result report, int position) {
        return report.initial().stream().filter(row -> row.faction() == 1 && row.position() == position)
                .findFirst().orElseThrow();
    }

    /** 读取战斗引擎首次实际计算的伤害，保留超出守军剩余生命的原伤害。 */
    private static long firstDamage(HeroBattleChapterScenario.Result report, int attackerId) {
        return report.damages().stream().filter(hit -> hit.sourceId() == attackerId).findFirst().orElseThrow().incoming();
    }

    /** 从权威资产快照取本次比较的英雄实例。 */
    private static HeroProfile hero(SessionSnapshotService.Snapshot snapshot, String instanceId) {
        return snapshot.heroes().stream().filter(row -> row.id().equals(instanceId)).findFirst().orElseThrow();
    }

    /** 创建具备公会入口资格及测试资源的隔离角色，使用真实登录和贡献入账。 */
    private Player player() {
        var registered = login.login("tech_" + id().substring(0, 8), "local-1");
        String role = registered.role().id();
        jdbc.update("UPDATE game_role SET role_level=50,gold=10000000,diamonds=2000 WHERE id=?", role);
        new TransactionTemplate(transactions).executeWithoutResult(status -> inventory.credit(role, GUILD_MEDAL_ID, 50000));
        return new Player(role, "Bearer " + registered.session().accessToken());
    }

    /** 使用指定旧模板准备本人英雄，阵容仍通过真实保存命令提交。 */
    private String seedHero(Player player, int template, int level, int star, int stage) {
        String instance = id();
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage) VALUES (?,?,?,?,?,?)",
                instance, player.roleId(), template, level, star, stage);
        return instance;
    }

    /** 使用生产建会入口创建仅有真实会长的新公会。 */
    private String createGuild(Player leader) {
        return guilds.change(leader.roleId(), new GuildService.Command(id(), GuildService.Action.CREATE,
                null, null, "科技" + id().substring(0, 8), null)).guild().id();
    }

    /** 每次操作的稳定标识采用与生产一致的 UUID 形式。 */
    private static String id() {
        return UUID.randomUUID().toString();
    }
}
