/**
 * 前二十关与十五关通关奖励的独立本机预览宿主；仅测试类路径可运行，强制随机内存H2及回环端口。
 * 准备明确标记的强队和十四关进度，之后挑战、结算、领取和重连全部走正式WS与领域事务。
 * 不访问日常库，不输出凭证；本次随机run的停止文件关闭应用，HTTP仅提供测试实例身份。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.lineup.Lineup;
import com.funsgamex.mxzg.lineup.MainFormationCommandService;
import com.funsgamex.mxzg.network.SessionSnapshotService;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.test.context.TestComponent;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.ObjectMapper;

public final class MainChapterProgressionPreview {
    /** 只属于本进程的随机测试标识，客户端核对后才允许连接，不复用日常存储空间。 */
    private static final String RUN = UUID.randomUUID().toString().replace("-", "");

    /** 只提供显式启动入口，所有游戏状态仍由应用领域服务持有。 */
    private MainChapterProgressionPreview() {}

    /** 启动全新隔离库，保存不含凭证的归属文件，等待本run停止请求后完整关闭Spring。 */
    public static void main(String[] args) throws Exception {
        if (args.length != 0 || !Files.isRegularFile(Path.of("pom.xml"))) {
            throw new IllegalArgumentException("必须在backend目录无参数启动独立进度预览");
        }
        Path directory = Path.of("target", "chapter-stage20-preview-" + RUN).toAbsolutePath().normalize();
        Files.createDirectories(directory);
        try (var context = SpringApplication.run(new Class<?>[] {GameApplication.class, Identity.class}, new String[] {
            "--spring.profiles.active=local", "--server.address=127.0.0.1", "--server.port=0",
            "--spring.datasource.url=jdbc:h2:mem:chapter20_" + RUN
                + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
            "--spring.datasource.username=sa", "--spring.datasource.password=", "--mxzg.gm.enabled=false",
        })) {
            var login = context.getBean(DevelopmentLoginService.class);
            var jdbc = context.getBean(JdbcTemplate.class);
            var snapshots = context.getBean(SessionSnapshotService.class);
            var formations = context.getBean(MainFormationCommandService.class);
            for (String account : List.of("chapter20_review", "chapter20_start")) {
                var accepted = login.login(account);
                String role = accepted.role().id();
                String token = "Bearer " + accepted.session().accessToken();
                String hero = UUID.randomUUID().toString();
                jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage) VALUES (?,?,10105011,100,9,3)",
                    hero, role);
                if (account.equals("chapter20_review")) {
                    jdbc.update("INSERT INTO game_main_chapter(role_id,max_cleared) VALUES (?,14)", role);
                    jdbc.update("INSERT INTO game_main_chapter_idle(role_id,started_at) VALUES (?,?)", role,
                        Instant.now().getEpochSecond() - 70);
                }
                var state = snapshots.snapshot(token);
                formations.save(token, new MainFormationCommandService.Save(UUID.randomUUID().toString(),
                    state.mainFormation().version(), 1, List.of(new Lineup.Slot(2, hero))));
            }
            int port = ((WebServerApplicationContext) context).getWebServer().getPort();
            var mapper = context.getBean(ObjectMapper.class);
            Files.writeString(directory.resolve("owner.json"), mapper.writeValueAsString(Map.of(
                "kind", "mxzg-owned-socket-it", "run", RUN, "pid", ProcessHandle.current().pid(),
                "port", port, "directory", directory.toString(), "isolatedFixture", true,
                "preparedProgress", 14, "challengeLimit", 20)));
            Files.writeString(Path.of("..", "client", "temp", "chapter-stage20-preview-owner.json"),
                Files.readString(directory.resolve("owner.json")));
            System.out.println("[CHAPTER20-PREVIEW] port=" + port + " run=" + RUN);
            while (!Files.exists(directory.resolve("stop.request"))) {
                Thread.sleep(500);
            }
        }
        Files.writeString(directory.resolve("stopped"), "closed");
    }

    /** 仅显式导入本测试宿主的身份探针；不被正式游戏装配，也不返回角色或凭证。 */
    @TestComponent
    @RestController
    public static final class Identity {
        /** 客户端连接前核对随机实例，不允许静默回退到日常后端。 */
        @GetMapping("/api/v1/test-identity")
        public Map<String, String> identity() {
            return Map.of("kind", "mxzg-owned-socket-it", "run", RUN);
        }
    }
}
