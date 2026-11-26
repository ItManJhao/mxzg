/**
 * 公会科技的角色进度、共享重置计数及请求回执。写入由科技服务在角色锁事务内完成，
 * 英雄属性装配只读职业进度，不读取或变更消费记录。
 */
package com.funsgamex.mxzg.guild;

import com.funsgamex.mxzg.guild.GuildTechnologyRules.Progress;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class GuildTechnologyRepository {
    /** 科技操作独立版本及该角色已经成功重置的累计次数。 */
    record Header(long version, int resetsCompleted) {}

    /** 原确认参数和成功提交的版本，用于重连恢复和重复请求识别。 */
    record Stored(String action, int profession, long previousVersion, long version, long assetRevision) {}

    /** 与角色资产使用同一数据库连接和事务。 */
    private final JdbcTemplate jdbc;

    /** 注入现行事务连接。 */
    GuildTechnologyRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** 返回已点亮职业到进度的映射，缺少的职业还未点亮。 */
    public Map<Integer, Progress> progress(String roleId) {
        return jdbc.query("""
                SELECT profession,stage,step FROM game_guild_technology_branch WHERE role_id=? ORDER BY profession
                """, rows -> {
            var result = new LinkedHashMap<Integer, Progress>();
            while (rows.next()) {
                result.put(rows.getInt("profession"), new Progress(rows.getInt("stage"), rows.getInt("step")));
            }
            return Map.copyOf(result);
        }, roleId);
    }

    /** 从未修改科技的角色隐式从版本 0 和未重置开始。 */
    Header header(String roleId) {
        return jdbc.query("SELECT version,resets_completed FROM game_guild_technology WHERE role_id=?",
                row -> row.next() ? new Header(row.getLong(1), row.getInt(2)) : new Header(0, 0), roleId);
    }

    /** 保存一次经过验证的职业点亮状态，重置则删除该职业进度行。 */
    void saveProgress(String roleId, int profession, Progress progress) {
        if (progress.step() == 0) {
            jdbc.update("DELETE FROM game_guild_technology_branch WHERE role_id=? AND profession=?", roleId, profession);
            return;
        }
        if (jdbc.update("""
                UPDATE game_guild_technology_branch SET stage=?,step=? WHERE role_id=? AND profession=?
                """, progress.stage(), progress.step(), roleId, profession) == 0) {
            jdbc.update("""
                    INSERT INTO game_guild_technology_branch(role_id,profession,stage,step) VALUES (?,?,?,?)
                    """, roleId, profession, progress.stage(), progress.step());
        }
    }

    /** 更新整棵科技树版本及全职业共享的重置次数。 */
    void saveHeader(String roleId, Header header) {
        if (jdbc.update("UPDATE game_guild_technology SET version=?,resets_completed=? WHERE role_id=?",
                header.version(), header.resetsCompleted(), roleId) == 0) {
            jdbc.update("INSERT INTO game_guild_technology(role_id,version,resets_completed) VALUES (?,?,?)",
                    roleId, header.version(), header.resetsCompleted());
        }
    }

    /** 同角色与原请求编号对应的成功记录，不依赖当前公会或职业等级。 */
    Stored receipt(String roleId, String requestId) {
        return jdbc.query("""
                SELECT action_type,profession,previous_version,result_version,asset_revision
                  FROM game_guild_technology_receipt WHERE role_id=? AND request_id=?
                """, row -> row.next() ? new Stored(row.getString(1), row.getInt(2), row.getLong(3), row.getLong(4),
                        row.getLong(5)) : null, roleId, requestId);
    }

    /** 原操作、扣费与此回执一并提交，同号只能插入一次。 */
    void saveReceipt(String roleId, String requestId, Stored stored) {
        jdbc.update("""
                INSERT INTO game_guild_technology_receipt(role_id,request_id,action_type,profession,previous_version,
                    result_version,asset_revision) VALUES (?,?,?,?,?,?,?)
                """, roleId, requestId, stored.action(), stored.profession(), stored.previousVersion(), stored.version(),
                stored.assetRevision());
    }
}
