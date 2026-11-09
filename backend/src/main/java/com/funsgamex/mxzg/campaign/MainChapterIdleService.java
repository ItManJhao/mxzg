/** 新主线挂机只读快照：在角色锁事务中初始化持久时钟，按真实通关配置投影收益，不抽奖、不发奖。 */
package com.funsgamex.mxzg.campaign;

import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import com.funsgamex.mxzg.lineup.Lineup;
import com.funsgamex.mxzg.lineup.MainFormationStateService;
import tools.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MainChapterIdleService {
    /** 新主线计时表，绝不读取旧简化game_campaign或game_idle。 */
    private final JdbcTemplate jdbc;
    /** 来自旧策划表的时间与基础收益配置。 */
    private final IdleRules rules;

    /** 持久化挂机选人结果，不存第二套英雄属性。 */
    private final ObjectMapper mapper;

    /** 服务器时间和持久起点单位为秒；rates为每frequency秒资源量。 */
    public record State(long serverTime, long startedAt, int maxSeconds, int frequency,
                        int rewardStage, List<CampaignRules.Reward> rates, List<Lineup.Slot> slots, long lineupVersion) {}

    /** 冻结抽样结果，序列化格式独立于主线阵容。 */
    public record Selection(List<Lineup.Slot> slots) {
        public Selection { slots = List.copyOf(slots); }
    }

    /** 注入持久连接与同源规则，不维护内存玩家副本。 */
    public MainChapterIdleService(JdbcTemplate jdbc, IdleRules rules, ObjectMapper mapper) {
        this.mapper = mapper;
        this.jdbc = jdbc;
        this.rules = rules;
    }

    /** 调用者必须已持有角色锁；未通关不启动，恢复时不重置起点，读快照不改变资产版本。 */
    @Transactional(propagation = Propagation.MANDATORY)
    public State snapshot(String role, int maxCleared, long nowSeconds) {
        if (maxCleared == 0) {
            return null;
        }
        var rates = List.copyOf(rules.stage(maxCleared).base());
        var starts = jdbc.query("SELECT started_at FROM game_main_chapter_idle WHERE role_id=?",
            (row, index) -> row.getLong(1), role);
        long startedAt;
        if (starts.isEmpty()) {
            startedAt = nowSeconds - rules.data().initialSeconds();
            jdbc.update("INSERT INTO game_main_chapter_idle(role_id,started_at) VALUES (?,?)", role, startedAt);
        } else {
            startedAt = starts.getFirst();
        }
        return new State(nowSeconds, startedAt, rules.data().maxSeconds(), rules.data().frequency(),
            maxCleared, rates, List.of(), 0);
    }
    /** 同一角色锁内按主线版本选人；三人内全保留，超过三人无放回抽取，重连复用原选择。 */
    @Transactional(propagation = Propagation.MANDATORY)
    public State withLineup(String role, State state, MainFormationStateService.State formation) {
        if (state == null) {
            return null;
        }
        var cached = jdbc.query("SELECT slots_json FROM game_main_chapter_idle_lineup WHERE role_id=? AND lineup_version=?",
            (row, index) -> mapper.readValue(row.getString(1), Selection.class), role, formation.version());
        List<Lineup.Slot> slots;
        if (cached.isEmpty()) {
            var candidates = new ArrayList<>(formation.slots());
            if (candidates.size() > 3) {
                Collections.shuffle(candidates, ThreadLocalRandom.current());
                candidates = new ArrayList<>(candidates.subList(0, 3));
            }
            candidates.sort(Comparator.comparingInt(Lineup.Slot::position));
            slots = List.copyOf(candidates);
            String value = mapper.writeValueAsString(new Selection(slots));
            if (jdbc.update("UPDATE game_main_chapter_idle_lineup SET lineup_version=?,slots_json=? WHERE role_id=?",
                    formation.version(), value, role) == 0) {
                jdbc.update("INSERT INTO game_main_chapter_idle_lineup(role_id,lineup_version,slots_json) VALUES (?,?,?)",
                    role, formation.version(), value);
            }
        } else {
            slots = cached.getFirst().slots();
            if (slots.size() > 3 || !formation.slots().containsAll(slots)) {
                throw new IllegalStateException("挂机阵容与主线持久版本不一致");
            }
        }
        return new State(state.serverTime(), state.startedAt(), state.maxSeconds(), state.frequency(),
            state.rewardStage(), state.rates(), slots, formation.version());
    }

}
