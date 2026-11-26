/**
 * 彩虹圣殿的同源规则索引。神位资格、战场守军、属性与邮件文案均从原策划投影读取。
 * 占领者、进化进度、冷却及战报的运行状态由玩法服务持久化，本类只管理不可变规则。
 */
package com.funsgamex.mxzg.rainbow;

import com.funsgamex.mxzg.hero.HeroBattleChapterScenario.ConfiguredEnemy;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
public final class RainbowRules {
    /** 神位编号在同服稳定。类型内位置从 1 开始，属性值单位是万分比，占领期限单位为秒。 */
    public record Seat(int id, int type, int position, String name, int requiredArenaRank, int occupationSeconds,
                       Map<Integer, Long> attributes) {
        /** 冻结本席属性。入场属性计算与界面显示共享配置。 */
        public Seat {
            attributes = Map.copyOf(attributes);
        }
    }

    /** 当前神位进化预览的一项技能及其展示等级。战斗技能由各守军模板和星级决定。 */
    public record Skill(int id, int level) {}

    /** 一种神位的真实进化档，首个守军和技能列表同时作为神位预览。 */
    public record Mission(int type, int evolution, List<ConfiguredEnemy> enemies,
                          List<Skill> activeSkills, List<Skill> passiveSkills) {
        /** 冻结原始守军队列和预览技能，跨玩家共享同一份配置。 */
        public Mission {
            enemies = List.copyOf(enemies);
            activeSkills = List.copyOf(activeSkills);
            passiveSkills = List.copyOf(passiveSkills);
        }
    }

    /** 原场景 40、41 的无附件邮件，正文可包含待替换的神位名称。 */
    public record MailNotice(String subject, String content) {}

    /** 原表投影，minimumLevel 是入口等级，minimumChallengeLevel 是旧服务端的挑战等级门槛。 */
    private record Configuration(int schemaVersion, int minimumLevel, int minimumChallengeLevel, int historyLimit,
                                 int challengeCooldownSeconds, int battleRounds, String battleMap, List<Seat> seats,
                                 List<Mission> missions, MailNotice displacedMail, MailNotice expiredMail) {}

    /** 加载并验证的全量规则，启动后保持只读。 */
    private final Configuration config;
    /** 按稳定编号升序的六个席位，列表下标比席位编号小 1。 */
    private final List<Seat> seats;
    /** 按神位类型查原进化档列表，档号从 1 开始，对应列表下标 0。 */
    private final Map<Integer, List<Mission>> missionsByType;

    /** 装配时拒绝缺失、损坏或站位不完整的原表投影，避免将占领状态写入无法战斗的席位。 */
    public RainbowRules(ObjectMapper mapper) {
        try (var input = RainbowRules.class.getResourceAsStream("/gameplay/rainbow-rules.json")) {
            if (input == null) {
                throw new IllegalStateException("缺少彩虹圣殿配置");
            }
            config = mapper.readValue(input, Configuration.class);
        } catch (IOException failure) {
            throw new IllegalStateException("无法读取彩虹圣殿配置", failure);
        }
        if (config.schemaVersion() != 1 || config.minimumChallengeLevel() <= 0
                || config.minimumLevel() < config.minimumChallengeLevel() || config.historyLimit() <= 0
                || config.challengeCooldownSeconds() <= 0 || config.battleRounds() <= 0 || config.battleRounds() > 15
                || config.battleMap().isBlank() || config.seats().size() != 6
                || !validMail(config.displacedMail()) || !validMail(config.expiredMail())) {
            throw new IllegalStateException("彩虹圣殿基础规则无效");
        }
        seats = List.copyOf(config.seats());
        validateSeats(seats);
        missionsByType = indexMissions(config.missions());
    }

    /** 校验席位 ID、类型及类型内序号，使服务端的稳定编号和原画面座位一一对应。 */
    private static void validateSeats(List<Seat> seats) {
        int seatIndex = 0;
        for (int type = 1; type <= 3; type++) {
            for (int position = 1; position <= type; position++) {
                Seat seat = seats.get(seatIndex++);
                if (seat.id() != seatIndex || seat.type() != type || seat.position() != position || seat.name().isBlank()
                        || seat.requiredArenaRank() <= 0 || seat.occupationSeconds() <= 0
                        || !seat.attributes().keySet().equals(Set.of(102, 201))
                        || seat.attributes().values().stream().anyMatch(amount -> amount <= 0)) {
                    throw new IllegalStateException("彩虹圣殿神位无效：" + seat.id());
                }
            }
        }
    }

    /** 以原进化号建立索引，校验同一场内的六个原始站位及全表守军编号唯一。 */
    private static Map<Integer, List<Mission>> indexMissions(List<Mission> missions) {
        Map<Integer, List<Mission>> byType = new HashMap<>();
        var enemyIds = new HashSet<Integer>();
        for (Mission mission : missions) {
            List<Mission> levels = byType.computeIfAbsent(mission.type(), ignored -> new ArrayList<>());
            if (mission.type() < 1 || mission.type() > 3 || mission.evolution() != levels.size() + 1
                    || mission.enemies().size() != 6) {
                throw new IllegalStateException("彩虹圣殿守军档位无效：" + mission.type() + "/" + mission.evolution());
            }
            var positions = new HashSet<Integer>();
            for (ConfiguredEnemy enemy : mission.enemies()) {
                if (!enemyIds.add(enemy.configId()) || enemy.position() < 1 || enemy.position() > 8
                        || !positions.add(enemy.position()) || enemy.template() <= 0 || enemy.level() <= 0
                        || enemy.star() <= 0) {
                    throw new IllegalStateException("彩虹圣殿守军无效：" + enemy.configId());
                }
            }
            levels.add(mission);
        }
        if (byType.size() != 3 || byType.values().stream().anyMatch(levels -> levels.size() != 1000)) {
            throw new IllegalStateException("彩虹圣殿守军进化档缺失");
        }
        byType.replaceAll((type, levels) -> List.copyOf(levels));
        return Map.copyOf(byType);
    }

    /** 检查原始模板可显示且支持替换丢失的神位名称。 */
    private static boolean validMail(MailNotice notice) {
        return notice != null && !notice.subject().isBlank() && notice.content().contains("[1]");
    }

    /** 返回副本大厅入口需要的角色等级。 */
    public int minimumLevel() {
        return config.minimumLevel();
    }

    /** 返回原挑战协议单独配置的角色等级；玩家通过大厅进入时同时受入口等级限制。 */
    public int minimumChallengeLevel() {
        return config.minimumChallengeLevel();
    }

    /** 返回每个神位保留的最近成功挑战条数。 */
    public int historyLimit() {
        return config.historyLimit();
    }

    /** 返回失败后禁止继续挑战的时长，单位秒。 */
    public int challengeCooldownSeconds() {
        return config.challengeCooldownSeconds();
    }

    /** 返回挑战和回放沿用的最大回合数。 */
    public int battleRounds() {
        return config.battleRounds();
    }

    /** 返回挑战及回放的共享地图资源名。 */
    public String battleMap() {
        return config.battleMap();
    }

    /** 返回六个原始神位，顺序为彩虹之主、骑士、护卫。 */
    public List<Seat> seats() {
        return seats;
    }

    /** 按稳定神位编号查询。返回 null 表示客户端传入了不存在的神位。 */
    public Seat seat(int id) {
        return id >= 1 && id <= seats.size() ? seats.get(id - 1) : null;
    }

    /** 校验挑战请求允许一次进化 1、5 或 10 次，其余数值不可进入战斗。 */
    public boolean isValidEvolution(int evolution) {
        return evolution == 1 || evolution == 5 || evolution == 10;
    }

    /**
     * 按神位类型和进化档返回原守军。和旧版相同，查不到档号时使用该类型最后一档。
     * @param evolution 当前进化号用于页面预览，当前进化号加所选次数用于实际挑战。
     * @throws IllegalArgumentException 神位类型没有原始守军配置。
     */
    public Mission mission(int type, int evolution) {
        List<Mission> levels = missionsByType.get(type);
        if (levels == null) {
            throw new IllegalArgumentException("彩虹圣殿神位类型无效：" + type);
        }
        return evolution >= 1 && evolution <= levels.size() ? levels.get(evolution - 1) : levels.getLast();
    }

    /** 按实际原因取得失位邮件，并填入对应神位名称。 */
    public MailNotice mailNotice(Seat seat, boolean expired) {
        MailNotice template = expired ? config.expiredMail() : config.displacedMail();
        return new MailNotice(template.subject(), template.content().replace("[1]", seat.name()));
    }
}
