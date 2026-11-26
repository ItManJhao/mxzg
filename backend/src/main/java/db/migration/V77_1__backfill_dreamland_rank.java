/**
 * 从 V75 角色梦境进度恢复已确认的历史最高层。旧进度没有精确达成时间，
 * 因此保留未知标记，截止期和邮件仍从新版首次启用后开始结算。
 */
package db.migration;

import java.sql.SQLException;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;
import tools.jackson.databind.ObjectMapper;

public class V77_1__backfill_dreamland_rank extends BaseJavaMigration {
    /** 按 V75 固化的 JSON 字段读取已确认的最高层，不读取当前战报猜测胜场。 */
    private final ObjectMapper mapper = new ObjectMapper();

    /** 只迁移有正楼层且属于本库角色的进度，无效原数据不得静默加入排行榜。 */
    @Override
    public void migrate(Context context) throws SQLException {
        var connection = context.getConnection();
        try (var statement = connection.createStatement();
                var rows = statement.executeQuery("""
                        SELECT r.id,r.server_id,d.progress_json FROM game_dreamland d
                        JOIN game_role r ON r.id=d.role_id
                        """);
                var insert = connection.prepareStatement("""
                        INSERT INTO game_dreamland_rank_best(role_id,server_id,floor,achieved_at)
                        VALUES (?,?,?,0)
                        """)) {
            while (rows.next()) {
                var floor = mapper.readTree(rows.getString(3)).path("highestFloor");
                long value = floor.asLong(-1);
                if (!floor.isIntegralNumber() || value < 0 || value > 1500) {
                    throw new IllegalStateException("存量梦境最高层无效，角色=" + rows.getString(1));
                }
                if (value > 0) {
                    insert.setString(1, rows.getString(1));
                    insert.setString(2, rows.getString(2));
                    insert.setInt(3, (int) value);
                    insert.executeUpdate();
                }
            }
        }
    }
}
