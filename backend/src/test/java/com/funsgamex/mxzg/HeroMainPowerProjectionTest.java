/**
 * 当前主阵容战力公开投影的内存库回归。使用真实保存、穿脱、会话及统一快照流程，
 * 分别核对已保存阵容、尚未计算的迁移记录、事务回滚以及历史峰值。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.hero.HeroBattleElementRules;
import com.funsgamex.mxzg.hero.HeroEquipmentService;
import com.funsgamex.mxzg.hero.HeroEquipmentService.Action;
import com.funsgamex.mxzg.hero.HeroMainPowerService;
import com.funsgamex.mxzg.hero.HeroPowerRules;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.lineup.Lineup;
import com.funsgamex.mxzg.lineup.MainFormationCommandService;
import com.funsgamex.mxzg.network.GameProtocolCodec;
import com.funsgamex.mxzg.network.SessionSnapshotService;
import com.funsgamex.mxzg.role.RoleRepository;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:main_power_projection;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.gm.enabled=false"
})
@ActiveProfiles("local")
class HeroMainPowerProjectionTest {
    /** 建立隔离测试角色，并验证冷重登复用原账号状态。 */
    @Autowired private DevelopmentLoginService login;
    /** 与协议共用的主阵容保存入口。 */
    @Autowired private MainFormationCommandService formations;
    /** 使用普通穿脱更新已上阵和未上阵英雄。 */
    @Autowired private HeroEquipmentService equipment;
    /** 为隔离角色准备真实装备物品，保留堆叠身份。 */
    @Autowired private InventoryService inventory;
    /** 比较既有主线战力与公共投影的真实值。 */
    @Autowired private HeroMainPowerService powers;
    /** 用原个人评分核对加光环后的逐人取整。 */
    @Autowired private HeroPowerRules score;
    /** 验证原表的最高档与多类叠加符合旧元素条件。 */
    @Autowired private HeroBattleElementRules elements;
    /** 登录、恢复及提交后推送共用的快照。 */
    @Autowired private SessionSnapshotService snapshots;
    /** 角色锁和资产版本，用于准备夹具及检查回滚边界。 */
    @Autowired private RoleRepository roles;
    /** 独立 H2 数据库中构建旧角色夹具和读取列。 */
    @Autowired private JdbcTemplate jdbc;
    /** 使用同一真实事务管理器执行测试中的准备和回滚。 */
    @Autowired private PlatformTransactionManager transactions;

    /** 单名测试角色、账号和凭证，未写入测试产物。 */
    private record Player(String account, String role, String token) {}

    /** 新号空队伍为真零，旧号缺列时以已保存队伍计算并在本人快照写回。 */
    @Test
    void initializesEmptyAndExistingRosterWithoutReadingPeakAsCurrent() {
        var player = player();
        assertNull(projected(player));
        assertEquals(0, snapshots.snapshot(player.token()).role().power());
        assertEquals(0, projected(player));

        String hero = addHero(player, 10304012, 4);
        saveTeam(player, hero);
        int current = powers.current(player.token()).total();
        assertTrue(current > 0);
        assertEquals(current, projected(player));

        int historical = current + 10_000;
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            roles.lock(player.role());
            jdbc.update("UPDATE game_role SET current_main_power=NULL,max_main_power=? WHERE id=?", historical, player.role());
        });
        long revision = roles.revision(player.role());
        var publicRead = new TransactionTemplate(transactions);
        publicRead.setReadOnly(true);
        int readOnlyPower = publicRead.execute(status -> powers.readCurrentForRole(player.role()));
        assertEquals(current, readOnlyPower);
        assertNull(projected(player), "公开资料的只读查询不能替其他玩家写回");

        var initial = snapshots.snapshot(player.token());
        assertEquals(current, initial.role().power());
        assertEquals(current, projected(player));
        assertEquals(historical, maximum(player));
        assertEquals(revision, initial.revision());
        assertEquals(0, snapshots.snapshot(player().token()).role().power());
    }

    /** 真装备改动在同一事务写当前值，未上阵不影响，降战力不降低历史值，重登读回真实值。 */
    @Test
    void projectsOnlyCommittedActiveHeroChangesAndKeepsHistoricalMaximum() {
        var player = player();
        String active = addHero(player, 10304012, 4);
        String reserve = addHero(player, 10204004, 4);
        saveTeam(player, active);
        int base = projected(player);
        assertEquals(base, maximum(player));

        String sword = new TransactionTemplate(transactions).execute(status ->
                inventory.credit(player.role(), 1001001, 2).instanceId());
        equip(player, reserve, sword);
        assertEquals(base, projected(player));
        assertEquals(base, maximum(player));

        equip(player, active, sword);
        int raised = projected(player);
        long raisedRevision = roles.revision(player.role());
        assertTrue(raised > base);
        assertEquals(raised, maximum(player));
        assertEquals(raised, powers.current(player.token()).total());

        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            unequip(player, active);
            assertEquals(base, projected(player));
            status.setRollbackOnly();
        });
        assertEquals(raisedRevision, roles.revision(player.role()));
        assertEquals(raised, projected(player));
        assertEquals(raised, maximum(player));

        unequip(player, active);
        assertEquals(base, projected(player));
        assertEquals(raised, maximum(player));
        assertEquals(base, powers.current(player.token()).total());
        var accepted = login.login(player.account(), "local-1");
        var authenticated = snapshots.snapshot("Bearer " + accepted.session().accessToken());
        assertEquals(player.role(), authenticated.role().id());
        assertEquals(base, authenticated.role().power());
        assertEquals(raised, maximum(player));
    }

    /** 两木一水的光环作用于三人；个人分不变，换到不同格位也不改变公开战力。 */
    @Test
    void scoresEveryDeployedHeroWithAuraAndIgnoresPositionAttributes() throws Exception {
        var player = player();
        String woodOne = addHero(player, 10304012, 4);
        String woodTwo = addHero(player, 10304004, 4);
        String water = addHero(player, 10204004, 4);
        var draft = powers.previewDraft(player.token(), UUID.randomUUID().toString(), List.of(water, woodTwo, woodOne));
        saveTeam(player, List.of(new Lineup.Slot(2, woodOne), new Lineup.Slot(3, woodTwo), new Lineup.Slot(5, water)));

        var snapshot = snapshots.snapshot(player.token());
        var measured = powers.current(player.token());
        int expected = 0;
        for (var hero : snapshot.heroes()) {
            var panel = hero.panelStats();
            var augmented = new HashMap<>(panel.rawAttributes());
            augmented.merge(102, 300L, Math::addExact);
            augmented.merge(201, 300L, Math::addExact);
            int withAura = score.score(augmented);
            assertEquals(withAura, measured.heroes().get(hero.id()));
            assertEquals(score.score(panel.rawAttributes()), panel.power());
            expected = Math.addExact(expected, withAura);
        }
        assertEquals(expected, snapshot.role().power());
        assertEquals(expected, draft.power());
        assertEquals(List.of(water, woodTwo, woodOne), draft.heroIds());
        assertEquals(expected, projected(player));
        assertEquals(expected, powers.readCurrentForRole(player.role()));
        var wire = GameProtocolCodec.decode(GameProtocolCodec.encode(Map.of("version", 1, "kind", "event",
            "name", "state.changed", "body", snapshot))).path("body");
        assertEquals(expected, wire.path("role").path("power").asInt());
        for (var hero : wire.path("heroes")) {
            assertTrue(hero.path("panelStats").has("power"));
            assertFalse(hero.path("panelStats").has("rawAttributes"));
        }

        saveTeam(player, List.of(new Lineup.Slot(5, woodOne), new Lineup.Slot(7, woodTwo), new Lineup.Slot(8, water)));
        assertEquals(expected, powers.current(player.token()).total());
        assertEquals(expected, projected(player));
    }

    /** 同类别使用最大达成档位，同时五色与同元素激活时共用各自属性。 */
    @Test
    void activatesOnlyLastMatchingTierAndCombinesDistinctAuraTypes() {
        assertEquals(Map.of(102, 500L, 201, 500L), elements.teamAura(List.of(10304012, 10304004, 10301001)));
        assertEquals(Map.of(102, 900L, 201, 900L), elements.teamAura(List.of(
            10101001, 10204004, 10304012, 10205019, 10505005, 10304004)));
    }

    /** 建立没有测试装备或英雄的新账号。 */
    private Player player() {
        String account = "main_power_" + UUID.randomUUID().toString().substring(0, 12);
        var accepted = login.login(account, "local-1");
        return new Player(account, accepted.role().id(), "Bearer " + accepted.session().accessToken());
    }

    /** 明确准备单个合法英雄，真正的驻扎关系由阵容保存服务写入。 */
    private String addHero(Player player, int templateId, int star) {
        String hero = UUID.randomUUID().toString();
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            roles.lock(player.role());
            jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage) VALUES (?,?,?,1,?,0)",
                hero, player.role(), templateId, star);
        });
        return hero;
    }

    /** 通过正常阵容保存将指定实例加入默认阵型中间位。 */
    private void saveTeam(Player player, String hero) {
        saveTeam(player, List.of(new Lineup.Slot(2, hero)));
    }

    /** 通过同一角色的真实阵容版本保存各个站位。 */
    private void saveTeam(Player player, List<Lineup.Slot> slots) {
        var formation = snapshots.snapshot(player.token()).mainFormation();
        formations.save(player.token(), new MainFormationCommandService.Save(UUID.randomUUID().toString(),
            formation.version(), formation.formationId(), slots));
    }

    /** 由真实装备命令消费背包堆叠中的一件装备用于战力测试。 */
    private void equip(Player player, String hero, String stackId) {
        assertTrue(equipment.change(player.token(), new HeroEquipmentService.Request(UUID.randomUUID().toString(),
            hero, Action.EQUIP, stackId, 0, 0)).changed());
    }

    /** 通过真实一键卸下命令释放已穿戴装备。 */
    private void unequip(Player player, String hero) {
        assertTrue(equipment.change(player.token(), new HeroEquipmentService.Request(UUID.randomUUID().toString(),
            hero, Action.UNEQUIP_ALL, null, 0, 0)).changed());
    }

    /** 直接读供公会使用的持久列，未计算保留 null，不经快照间接补值。 */
    private Integer projected(Player player) {
        return jdbc.queryForObject("SELECT current_main_power FROM game_role WHERE id=?", Integer.class, player.role());
    }

    /** 读取副本原峰值，比较当前值降低后此记录保持不变。 */
    private int maximum(Player player) {
        return jdbc.queryForObject("SELECT max_main_power FROM game_role WHERE id=?", Integer.class, player.role());
    }
}
