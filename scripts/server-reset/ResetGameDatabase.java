/**
 * 为 Windows 清档入口生成独立的空 H2 库。原库只读打开，区服、开服设置、
 * 活动发布和 Flyway 迁移历史逐行保留；玩家档案、会话及玩法进度留在原库。
 * 调用方负责停服、备份、替换以及启服检查。此程序只写一个原本不存在的文件。
 */
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

public final class ResetGameDatabase {
    /** 按外键依赖先复制区服，再复制各区号段和开服活动。 */
    private static final List<String> CONFIGURATION = List.of(
            "flyway_schema_history", "game_server", "game_role_public_sequence", "game_idle_activity_control");
    /** 个人服 ID 与开发机启动脚本保持一致。 */
    private static final Pattern PERSONAL_ID = Pattern.compile("dev-[a-z0-9][a-z0-9_-]{0,26}");
    /** H2 JDBC 文件地址使用库名而非物理文件扩展名。 */
    private static final String MV_SUFFIX = ".mv.db";

    /** 此命令不需要实例。 */
    private ResetGameDatabase() {}

    /** 接受模式、区服 ID、源文件和新文件的绝对路径；失败时不发布产物，由调用方处理临时文件。 */
    public static void main(String[] args) throws Exception {
        if (args.length != 4) {
            throw new IllegalArgumentException("用法：ResetGameDatabase <shared|personal> <区服ID> <原.mv.db> <新.mv.db>");
        }
        var mode = args[0];
        var id = args[1];
        if (!(mode.equals("shared") && id.equals("local-1") || mode.equals("personal") && PERSONAL_ID.matcher(id).matches())) {
            throw new IllegalArgumentException("共享模式须指定 local-1；个人模式须指定本机已登记的 dev-* 区服。");
        }
        var source = databasePath(args[2]);
        var stage = databasePath(args[3]);
        if (!Files.isRegularFile(source, LinkOption.NOFOLLOW_LINKS) || source.equals(stage)
                || !Files.getFileStore(source).equals(Files.getFileStore(stage.getParent()))) {
            throw new IllegalArgumentException("源库须是已有普通文件，临时目标须位于同一磁盘的独立位置。");
        }
        try (var old = DriverManager.getConnection(url(source) + ";IFEXISTS=TRUE;ACCESS_MODE_DATA=r", "sa", "")) {
            var tables = gameTables(old);
            checkOwnership(old, mode, id);
            // 原子占位同时拒绝已有文件和同名链接；H2 可在零字节新文件上初始化。
            Files.createFile(stage);
            try (var fresh = DriverManager.getConnection(url(stage) + ";WRITE_DELAY=0", "sa", "")) {
                copySchema(old, fresh);
                if (!tables.equals(gameTables(fresh))) {
                    throw new SQLException("新旧库的业务表集合不一致。");
                }
                fresh.setAutoCommit(false);
                for (String table : CONFIGURATION) {
                    copyConfiguration(old, fresh, table);
                }
                for (String table : tables) {
                    long expected = CONFIGURATION.contains(table) ? count(old, table) : 0;
                    if (count(fresh, table) != expected) {
                        throw new SQLException("新库的记录数不符合清档规则：" + table);
                    }
                }
                checkOwnership(fresh, mode, id);
                fresh.commit();
                System.out.printf("已验证 %d 张表，保留区服 %s 的配置，新库玩家数为 0。%n", tables.size(), id);
            }
        }
    }

    /** 解析已有父目录的物理路径；拒绝相对路径和可改变 H2 连接选项的分隔符。 */
    private static Path databasePath(String value) throws Exception {
        var path = Path.of(value);
        if (!path.isAbsolute() || path.getFileName() == null || !path.getFileName().toString().endsWith(MV_SUFFIX)
                || path.getFileName().toString().equals(MV_SUFFIX)) {
            throw new IllegalArgumentException("必须使用绝对的 .mv.db 文件路径。");
        }
        var resolved = path.getParent().toRealPath().resolve(path.getFileName());
        if (resolved.toString().contains(";")) {
            throw new IllegalArgumentException("数据库路径不能包含 JDBC 选项分隔符。");
        }
        return resolved;
    }

    /** 生成与游戏实例一致的 MySQL 兼容模式地址；禁止 H2 把错误写入源库的 trace 文件。 */
    private static String url(Path path) {
        String file = path.toString().replace('\\', '/');
        return "jdbc:h2:file:" + file.substring(0, file.length() - MV_SUFFIX.length())
                + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;TRACE_LEVEL_FILE=0";
    }

    /** 确认是 MXZG 专用库；遇到不认识的业务表归属时中止，防止误清混合数据库。 */
    private static Set<String> gameTables(Connection db) throws SQLException {
        var names = new HashSet<String>();
        try (var stmt = db.createStatement(); var rows = stmt.executeQuery("""
                SELECT table_schema, table_name FROM information_schema.tables
                WHERE table_type='BASE TABLE' AND table_schema<>'information_schema'
                """)) {
            while (rows.next()) {
                String table = rows.getString(2);
                if (!rows.getString(1).equals("public")
                        || !(table.equals("flyway_schema_history") || table.matches("game_[a-z0-9_]+"))) {
                    throw new SQLException("发现非 MXZG 表，请单独核对清档范围：" + rows.getString(1) + "." + table);
                }
                names.add(table);
            }
        }
        if (!names.containsAll(CONFIGURATION) || !names.contains("game_role") || !names.contains("game_session")) {
            throw new SQLException("缺少已知的 MXZG 区服或玩家表。");
        }
        return names;
    }

    /** 共享库仅接受当前的单一区服；个人库允许 Flyway 自带的无玩家种子行，并核实角色实际归属。 */
    private static void checkOwnership(Connection db, String mode, String id) throws SQLException {
        boolean found = false;
        try (var stmt = db.createStatement(); var rows = stmt.executeQuery("SELECT id,region_id FROM game_server")) {
            while (rows.next()) {
                String server = rows.getString(1);
                String region = rows.getString(2);
                if (server.equals(id) && region.equals(mode.equals("shared") ? "local" : "lan-personal")) {
                    found = true;
                } else if (!(mode.equals("personal") && region.equals("local")
                        && (server.equals("local-1") || server.equals("local-2")))) {
                    throw new SQLException("该数据库还包含其他区服：" + server + "。已停止整库清档。");
                }
            }
        }
        if (!found) {
            throw new SQLException("数据库未登记目标区服 " + id);
        }
        try (var stmt = db.prepareStatement("SELECT COUNT(*) FROM game_role WHERE server_id<>?")) {
            stmt.setString(1, id);
            try (var rows = stmt.executeQuery()) {
                rows.next();
                if (rows.getLong(1) != 0) {
                    throw new SQLException("存在归属其他区服的角色，不能清除此数据库。");
                }
            }
        }
    }

    /** H2 从实际已迁移的库导出无业务记录的 DDL，避免重放首次建库时的历史区服种子。 */
    private static void copySchema(Connection source, Connection dest) throws SQLException {
        try (var reader = source.createStatement(); var ddl = reader.executeQuery("SCRIPT NODATA");
             var writer = dest.createStatement()) {
            while (ddl.next()) {
                writer.execute(ddl.getString(1));
            }
        }
    }

    /** 逐列复制一张允许保留的配置表。角色公开号仅保留各区号段，新档从本区初始序号开始。 */
    private static void copyConfiguration(Connection source, Connection dest, String table) throws SQLException {
        try (var reader = source.createStatement(); var data = reader.executeQuery("SELECT * FROM " + table)) {
            var metadata = data.getMetaData();
            var columns = new ArrayList<String>();
            for (int i = 1; i <= metadata.getColumnCount(); i++) {
                columns.add(metadata.getColumnName(i));
            }
            String quoted = columns.stream().map(name -> "\"" + name.replace("\"", "\"\"") + "\"")
                    .collect(java.util.stream.Collectors.joining(","));
            String values = String.join(",", java.util.Collections.nCopies(columns.size(), "?"));
            try (var insert = dest.prepareStatement("INSERT INTO " + table + " (" + quoted + ") VALUES (" + values + ")")) {
                while (data.next()) {
                    for (int i = 1; i <= columns.size(); i++) {
                        if (table.equals("game_role_public_sequence") && columns.get(i - 1).equals("last_sequence")) {
                            insert.setLong(i, 0L);
                        } else {
                            insert.setObject(i, data.getObject(i));
                        }
                    }
                    insert.executeUpdate();
                }
            }
        }
    }

    /** 对可信表名或固定配置表进行计数，供新库发布前验证。 */
    private static long count(Connection db, String table) throws SQLException {
        try (var stmt = db.createStatement(); var rows = stmt.executeQuery("SELECT COUNT(*) FROM " + table)) {
            rows.next();
            return rows.getLong(1);
        }
    }
}
