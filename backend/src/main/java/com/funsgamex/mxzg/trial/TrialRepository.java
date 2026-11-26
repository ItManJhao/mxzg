/**
 * 勇者试炼的持久进度、守军、原始回执和助战仓库。
 * 业务服务持有角色锁并在同一事务中提交进度、资产及回执。
 */
package com.funsgamex.mxzg.trial;

import com.funsgamex.mxzg.hero.HeroEquipmentRepository;
import com.funsgamex.mxzg.hero.HeroEvolutionRules;
import com.funsgamex.mxzg.hero.HeroGrowthRules;
import com.funsgamex.mxzg.hero.HeroProfile;
import com.funsgamex.mxzg.protocol.GameProtocol.BattleReplay;
import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
import com.google.protobuf.InvalidProtocolBufferException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.ObjectMapper;

@Repository
class TrialRepository {
    /** 试炼、角色和资产使用同一个事务和数据库。 */
    private final JdbcTemplate jdbc;
    /** 仅用于按排除名单查询尚未匹配的同服真人角色。 */
    private final NamedParameterJdbcTemplate namedJdbc;
    /** 序列化玩法状态及派遣时的内部战斗属性。 */
    private final ObjectMapper mapper;
    /** 恢复已完成请求前先校验原回执摘要。 */
    private final RewardReceiptPayloads payloads;

    /** 玩法状态与可空的上一场原战报。 */
    record Stored(TrialService.Progress progress, BattleReplay replay) {}

    /** 原命令和实际领奖快照，重复请求直接恢复。 */
    record Receipt(TrialService.Command command, TrialService.Settlement result) {}

    /** 只复制上阵计算所需的属性，派遣人的后续成长不会改动本日助战。 */
    record HeroSnapshot(String id, int templateId, int level, int star, int stage, int power,
                        HeroGrowthRules.Stats baseStats, HeroEquipmentRepository.State equipment,
                        HeroEvolutionRules.State evolution, Map<Integer, Long> growthAttributes,
                        List<HeroEvolutionRules.Skill> loadoutSkills) {
        /** 从真实资产捕获原装备、进化和技能，供异步借用。 */
        static HeroSnapshot capture(HeroProfile hero) {
            return new HeroSnapshot(hero.id(), hero.templateId(), hero.level(), hero.star(), hero.stage(),
                    hero.panelStats().power(), hero.baseStats(), hero.equipment(), hero.evolution(),
                    hero.growthAttributes(), hero.loadoutSkills());
        }

        /** 冻结的英雄用于组装借用人的阵型，不写回任何一方的名册。 */
        HeroProfile hero() {
            return new HeroProfile(id, templateId, level, star, false, false, stage, baseStats, equipment,
                    null, evolution, null, growthAttributes, loadoutSkills);
        }
    }

    /** 派遣人公开身份与英雄快照。 */
    record Dispatch(String roleId, String roleName, HeroSnapshot snapshot) {
        /** 公布好友窗口使用的头像、战力和今日已使用标记。 */
        TrialService.AssistHero view(boolean used) {
            return new TrialService.AssistHero(roleId, roleName, snapshot.id(), snapshot.templateId(),
                    snapshot.level(), snapshot.star(), snapshot.power(), used);
        }
    }

    /** 注入当前库、序列化器、原回执校验器。 */
    TrialRepository(JdbcTemplate jdbc, NamedParameterJdbcTemplate namedJdbc, ObjectMapper mapper,
                    RewardReceiptPayloads payloads) {
        this.jdbc = jdbc;
        this.namedJdbc = namedJdbc;
        this.mapper = mapper;
        this.payloads = payloads;
    }

    /** 读取该角色唯一试炼状态，首次进入时返回空。 */
    Stored find(String role) {
        return jdbc.query("SELECT progress_json,report_bytes FROM game_trial WHERE role_id=?",
                row -> row.next() ? new Stored(mapper.readValue(row.getString(1), TrialService.Progress.class),
                        replay(row.getBytes(2))) : null, role);
    }

    /** 在同一角色锁内一起保存状态和最后一场战报。 */
    void save(String role, boolean exists, TrialService.Progress progress, BattleReplay report) {
        String json = mapper.writeValueAsString(progress);
        byte[] bytes = bytes(report);
        int count = exists
                ? jdbc.update("UPDATE game_trial SET progress_json=?,report_bytes=? WHERE role_id=?", json, bytes, role)
                : jdbc.update("INSERT INTO game_trial(role_id,progress_json,report_bytes) VALUES(?,?,?)",
                        role, json, bytes);
        if (count != 1) {
            throw new IllegalStateException("勇者试炼进度写入异常");
        }
    }

    /** 读取与会话角色、请求号一致的原回执和原 Protobuf 战报。 */
    Receipt receipt(String role, String requestId) {
        return jdbc.query("""
                SELECT receipt_json,receipt_hash,report_bytes FROM game_trial_request WHERE role_id=? AND request_id=?
                """, row -> {
                    if (!row.next()) {
                        return null;
                    }
                    var saved = payloads.read(row.getString(1), row.getString(2), Receipt.class);
                    if (!role.equals(saved.result().roleId()) || !requestId.equals(saved.command().requestId())
                            || !requestId.equals(saved.result().requestId())
                            || !saved.command().action().equals(saved.result().action())) {
                        throw new IllegalStateException("勇者试炼回执归属不一致");
                    }
                    return new Receipt(saved.command(), saved.result().withReplay(replay(row.getBytes(3))));
                }, role, requestId);
    }

    /** 战报单独用 Protobuf 保存，摘要覆盖含命令及原资产的元数据。 */
    void saveReceipt(TrialService.Command command, TrialService.Settlement result) {
        var saved = payloads.freeze(new Receipt(command, result.withReplay(null)));
        var report = result.state().battle() == null ? null : result.state().battle().replay();
        jdbc.update("""
                INSERT INTO game_trial_request(role_id,request_id,receipt_json,receipt_hash,report_bytes)
                    VALUES (?,?,?,?,?)
                """, result.roleId(), result.requestId(), saved.json(), saved.hash(), bytes(report));
    }

    /** 按发布至今仍有效的日期，读取该角色自己已派出的英雄。 */
    List<Dispatch> ownDispatches(String role, long resetAt) {
        return jdbc.query("""
                SELECT sender.id,sender.nickname,dispatch.hero_json FROM game_trial_dispatch dispatch
                JOIN game_role sender ON sender.id=dispatch.role_id
                WHERE sender.id=? AND dispatch.reset_at=? ORDER BY dispatch.hero_id
                """, this::dispatch, role, resetAt);
    }

    /** 双向关系、同服和黑名单在一次查询中检查，避免客户端伪造借用来源。 */
    List<Dispatch> friendDispatches(String role, long resetAt) {
        return jdbc.query("""
                SELECT sender.id,sender.nickname,dispatch.hero_json
                FROM game_friend_relation f
                JOIN game_friend_relation reverse_friend ON reverse_friend.role_id=f.target_id
                    AND reverse_friend.target_id=f.role_id
                JOIN game_role borrower ON borrower.id=f.role_id
                JOIN game_role sender ON sender.id=f.target_id AND sender.server_id=borrower.server_id
                JOIN game_trial_dispatch dispatch ON dispatch.role_id=sender.id
                WHERE borrower.id=? AND dispatch.reset_at=?
                    AND NOT EXISTS (SELECT 1 FROM game_friend_block b
                                    WHERE b.role_id=borrower.id AND b.target_id=sender.id)
                    AND NOT EXISTS (SELECT 1 FROM game_friend_block b
                                    WHERE b.role_id=sender.id AND b.target_id=borrower.id)
                ORDER BY sender.id,dispatch.hero_id
                """, this::dispatch, role, resetAt);
    }

    /** 同日英雄数先由角色锁内检查，持久化前清除该角色已过期的旧派遣。 */
    void dispatch(String role, long resetAt, HeroSnapshot hero) {
        jdbc.update("DELETE FROM game_trial_dispatch WHERE role_id=? AND reset_at<>?", role, resetAt);
        jdbc.update("INSERT INTO game_trial_dispatch(role_id,hero_id,reset_at,hero_json) VALUES(?,?,?,?)",
                role, hero.id(), resetAt, mapper.writeValueAsString(hero));
    }

    /** 读取派遣行的冻结属性，坏数据会中断借用而非套用当前英雄。 */
    private Dispatch dispatch(ResultSet row, int index) throws SQLException {
        return new Dispatch(row.getString(1), row.getString(2), mapper.readValue(row.getString(3), HeroSnapshot.class));
    }

    /** 保存好友英雄第一次上阵时才记录来源；写入只持有借用者的角色锁。 */
    void recordAssistUsed(String borrower, Dispatch helper, long resetAt) {
        jdbc.update("INSERT INTO game_trial_assist_usage(sender_id,borrower_id,hero_id,reset_at) VALUES(?,?,?,?)",
                helper.roleId(), borrower, helper.snapshot().id(), resetAt);
    }

    /** 在派遣方角色锁内标记已到结算日的助战，邮件失败会随事务回滚。 */
    int markDueAssistRewards(String role, long now) {
        return jdbc.update("UPDATE game_trial_assist_usage SET mailed=TRUE "
                + "WHERE sender_id=? AND reset_at<=? AND mailed=FALSE", role, now);
    }

    /** 读取一页离线也应投递的派遣角色，巡回游标避免一个满邮箱阻塞排在后面的角色。 */
    List<String> dueAssistRoles(long now, String afterRole, int limit) {
        return jdbc.queryForList("""
                SELECT DISTINCT sender_id FROM game_trial_assist_usage
                WHERE mailed=FALSE AND reset_at<=? AND sender_id>?
                ORDER BY sender_id LIMIT ?
                """, String.class, now, afterRole, limit);
    }

    /** 按旧版战力区间挑选至多 200 名同服真人，过滤本人及本日已匹配对手。 */
    List<String> realCandidates(String server, List<String> excluded, long minimum, long maximum) {
        return namedJdbc.queryForList("""
                SELECT id FROM game_role WHERE server_id=:server AND id NOT IN (:excluded)
                    AND current_main_power>0 AND current_main_power BETWEEN :minimum AND :maximum
                ORDER BY id LIMIT 200
                """, Map.of("server", server, "excluded", excluded, "minimum", minimum, "maximum", maximum),
                String.class);
    }

    /** 无原战报时只保存空列，避免为只读变更生成替代战报。 */
    private static byte[] bytes(BattleReplay replay) {
        return replay == null ? null : replay.toByteArray();
    }

    /** 重读坏战报时中止请求，不能重新模拟生成一个不同的结果。 */
    private static BattleReplay replay(byte[] bytes) {
        if (bytes == null) {
            return null;
        }
        try {
            return BattleReplay.parseFrom(bytes);
        } catch (InvalidProtocolBufferException failure) {
            throw new IllegalStateException("勇者试炼原战报无法读取", failure);
        }
    }
}
