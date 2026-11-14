/**
 * 新主线挂机只读快照：在角色锁内投影已创建的累计时钟、基础收益及请求模式。
 * 首次计时由挑战事务创建；本入口不补建累计、不抽奖、不发奖，也不读取完整权益输入。
 * 挂机选人按主线阵容版本独立持久化，不改变领取操作版本。
 */
package com.funsgamex.mxzg.campaign;

import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import com.funsgamex.mxzg.lineup.Lineup;
import com.funsgamex.mxzg.lineup.MainFormationStateService;
import tools.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MainChapterIdleService {
    /** 仅用于独立挂机选人记录，累计时钟统一经状态仓库读取。 */
    private final JdbcTemplate jdbc;
    /** 来自旧策划表的时间与基础收益配置。 */
    private final IdleRules rules;

    /** 仅从当前角色持久VIP读取最大挂机时长，不将基础速率伪装成完整收益。 */
    private final IdleRewardInputService inputs;

    /** 持久化挂机选人结果，不存第二套英雄属性。 */
    private final ObjectMapper mapper;

    /** 新主线累计的唯一持久入口，缺行或不兼容格式不会在快照中补建。 */
    private final MainChapterIdleStateRepository states;

    /** 服务端请求入口开关；false明确投影READ_ONLY，不代表当前权益输入一定可用。 */
    private final boolean claimEnabled;

    /**
     * 领取操作版本及入口模式；窗口和类别计数不复制到客户端。
     * @param schemaVersion 领取状态协议格式，当前1；缺失或未知格式不能开放请求
     * @param operationVersion 当前持久消费版本，不等同于统一资产revision
     * @param requestMode READ_ONLY表示入口关闭，ENABLED仅表示允许提交请求，不预判权益是否齐全
     */
    public record ClaimState(int schemaVersion, long operationVersion, String requestMode) {}

    /**
     * 主线挂机的基础展示投影；领取状态只说明格式、操作版本和入口模式，不预报完整收益。
     * @param serverTime 当前快照服务器Unix秒
     * @param startedAt 持久累计起点Unix秒，读取和重连不重置
     * @param maxSeconds 当前角色VIP对应的最大可结算秒数
     * @param frequency 基础收益结算周期，单位秒
     * @param rewardStage 本次投影使用的最高已通关关卡
     * @param rates 每frequency秒的基础资源量，不含完整权益与活动加成
     * @param slots 按主线阵容版本冻结的挂机演出选人，不是第二份正式阵容
     * @param lineupVersion 上述选人使用的主线阵容版本
     * @param claimState 当前累计操作版本及请求模式，不包含窗口或保底的客户端副本
     */
    public record State(long serverTime, long startedAt, int maxSeconds, int frequency,
                        int rewardStage, List<CampaignRules.Reward> rates, List<Lineup.Slot> slots,
                        long lineupVersion, ClaimState claimState) {}

    /** 冻结抽样结果，序列化格式独立于主线阵容。 */
    public record Selection(List<Lineup.Slot> slots) {
        /** 不保留对可变阵容集合的引用，重连始终复用已冻结的选择。 */
        public Selection {
            slots = List.copyOf(slots);
        }
    }

    /** 注入累计仓库、只读VIP输入和服务端入口开关，不维护内存玩家副本。 */
    public MainChapterIdleService(JdbcTemplate jdbc, IdleRules rules, ObjectMapper mapper, IdleRewardInputService inputs,
            MainChapterIdleStateRepository states,
            @Value("${mxzg.main-chapter.idle-claim-enabled:false}") boolean claimEnabled) {
        this.inputs = inputs;
        this.mapper = mapper;
        this.jdbc = jdbc;
        this.rules = rules;
        this.states = states;
        this.claimEnabled = claimEnabled;
    }

    /**
     * 持有角色锁时投影已有累计及同角色VIP上限；未通关返回null，不开放旧服第一关旁路。
     * 已通关但累计缺失或格式损坏时拒绝整包，不因登录、重连或读取而创建免费起点。
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public State snapshot(String role, int maxCleared, long nowSeconds) {
        if (maxCleared == 0) {
            return null;
        }
        var rates = List.copyOf(rules.stage(maxCleared).base());
        int maxSeconds = inputs.maximumSeconds(role);
        var stored = states.require(role);
        var claimState = new ClaimState(stored.schemaVersion(), stored.operationVersion(),
                claimEnabled ? "ENABLED" : "READ_ONLY");
        return new State(nowSeconds, stored.startedAt(), maxSeconds, rules.data().frequency(),
            maxCleared, rates, List.of(), 0, claimState);
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
            state.rewardStage(), state.rates(), slots, formation.version(), state.claimState());
    }

}
