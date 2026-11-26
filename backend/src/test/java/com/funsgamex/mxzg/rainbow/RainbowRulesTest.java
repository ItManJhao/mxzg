/**
 * 核对原表投影的彩虹圣殿资格、神位加成和进化边界。
 * 不需要玩家或数据库，保证业务层面对的是完整守军和真实通知文案。
 */
package com.funsgamex.mxzg.rainbow;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

class RainbowRulesTest {
    /** 由生产入口加载与玩家端一致的全量规则。 */
    private final RainbowRules rules = new RainbowRules(new ObjectMapper());

    /** 入口等级和旧服务端挑战等级各自保留，六个神位顺序对应类型内编号和名次。 */
    @Test
    void loadsOriginalSeatRules() {
        assertEquals(35, rules.minimumLevel());
        assertEquals(30, rules.minimumChallengeLevel());
        assertEquals(1200, rules.challengeCooldownSeconds());
        assertEquals(5, rules.historyLimit());
        assertEquals(15, rules.battleRounds());
        assertEquals("map54", rules.battleMap());
        assertEquals(List.of(10, 20, 20, 50, 50, 50), rules.seats().stream()
                .map(RainbowRules.Seat::requiredArenaRank).toList());
        assertEquals(List.of(1, 1, 2, 1, 2, 3), rules.seats().stream().map(RainbowRules.Seat::position).toList());
        assertTrue(rules.seats().stream().allMatch(seat -> seat.occupationSeconds() == 259_200));
        assertEquals(Map.of(102, 300L, 201, 300L), rules.seat(1).attributes());
        assertEquals(Map.of(102, 200L, 201, 200L), rules.seat(2).attributes());
        assertEquals(Map.of(102, 100L, 201, 100L), rules.seat(6).attributes());
        assertNull(rules.seat(0));
        assertNull(rules.seat(7));
    }

    /** 前十档分别取真实进化队伍，旧版档号不存在时统一使用该类型原有最后一档。 */
    @Test
    void selectsOriginalEnemyGroupsAndPreviews() {
        for (int type = 1; type <= 3; type++) {
            for (int evolution : List.of(1, 5, 10)) {
                assertTrue(rules.isValidEvolution(evolution));
                assertEquals(evolution, rules.mission(type, evolution).evolution());
            }
            var maximum = rules.mission(type, 1000);
            assertEquals(1000, maximum.evolution());
            assertSame(maximum, rules.mission(type, 0));
            assertSame(maximum, rules.mission(type, 1005));
            assertEquals(6, maximum.enemies().size());
            assertEquals(3, maximum.activeSkills().getFirst().level());
        }
        var opening = rules.mission(1, 1);
        assertFalse(rules.isValidEvolution(0));
        assertFalse(rules.isValidEvolution(2));
        assertEquals(10205009, opening.enemies().getFirst().template());
        assertEquals(5, opening.enemies().getFirst().star());
        assertEquals(List.of(2, 3, 5, 6, 7, 8), opening.enemies().stream().map(enemy -> enemy.position()).toList());
        assertEquals(new RainbowRules.Skill(102050091, 1), opening.activeSkills().getFirst());
        assertEquals(new RainbowRules.Skill(102050092, 1), opening.passiveSkills().getFirst());
    }

    /** 夺位和到期使用各自原邮件模板，并将神位名代入正文。 */
    @Test
    void rendersOriginalDisplacementAndExpiryMail() {
        var seat = rules.seat(1);
        var displaced = rules.mailNotice(seat, false);
        var expired = rules.mailNotice(seat, true);
        assertEquals("彩虹圣殿", displaced.subject());
        assertEquals(displaced.subject(), expired.subject());
        assertTrue(displaced.content().contains("彩虹之主圣位已被其他人占据"));
        assertTrue(expired.content().contains("彩虹之主圣位达到时间上限自动失效"));
    }
}
