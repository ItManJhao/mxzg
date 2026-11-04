/** Creator 长连接隔离预览宿主：仅测试类路径可运行，强制内存 H2、回环随机端口和随机实例身份。 */
package com.funsgamex.mxzg;

import java.nio.file.*;
import java.util.*;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.test.context.TestComponent;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import org.springframework.web.bind.annotation.*;

public class SocketPreviewServer {
    private static final String RUN = UUID.randomUUID().toString().replace("-", "");

    /** 显式参数优先于外部配置，禁止该预览宿主误连文件库或现有 MySQL。 */
    public static void main(String[] args) throws Exception {
        var context = SpringApplication.run(new Class<?>[] {GameApplication.class, Identity.class}, new String[] {
            "--spring.profiles.active=local", "--server.address=127.0.0.1", "--server.port=0",
            "--spring.datasource.url=jdbc:h2:mem:socket_preview_" + RUN + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
            "--spring.datasource.username=sa", "--spring.datasource.password=", "--mxzg.websocket.enabled=true"
        });
                if(Arrays.asList(args).contains("--equipment-fixture")) {
            var player=context.getBean(com.funsgamex.mxzg.auth.DevelopmentLoginService.class).login("equipment_review");
            var jdbc=context.getBean(org.springframework.jdbc.core.JdbcTemplate.class);
            String hero=UUID.randomUUID().toString(),empty=UUID.randomUUID().toString();
            jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star) VALUES (?,?,10101001,1,1)",hero,player.role().id());
            jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star) VALUES (?,?,10301001,1,1)",empty,player.role().id());
            for(int slot=1;slot<=4;slot++)jdbc.update("INSERT INTO game_equipment(id,role_id,template_id,slot,soul_level,hero_id) VALUES (?,?,?,?,?,?)","922337203685477580"+slot,player.role().id(),1000001+slot*1000,slot,slot==1?3:0,hero);
        }
        if(Arrays.asList(args).contains("--skill-panel-fixture")) {
            var player=context.getBean(com.funsgamex.mxzg.auth.DevelopmentLoginService.class).login("skill_panel_review");
            var jdbc=context.getBean(org.springframework.jdbc.core.JdbcTemplate.class);
            jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage) VALUES (?,?,10103003,30,3,1)",UUID.randomUUID().toString(),player.role().id());
        }        int port = ((WebServerApplicationContext) context).getWebServer().getPort();
        Path manifest = Path.of("..", "client", "temp", "socket-preview.json");
        Files.createDirectories(manifest.getParent());
        Files.writeString(manifest, "{\"port\":" + port + ",\"run\":\"" + RUN + "\",\"pid\":" + ProcessHandle.current().pid() + "}");
        System.out.println("[SOCKET-PREVIEW] isolated instance ready at port " + port);
        System.out.println("http://localhost:7456/?mxzgTestApi=http%3A%2F%2F127.0.0.1%3A" + port
            + "&mxzgTestRun=" + RUN);
    }

    /** 只在显式导入的预览上下文提供身份接口，不进入普通测试或产品包组件扫描。 */
    @TestComponent
    @RestController
    public static class Identity {
        /** 隔离客户端必须核对随机运行标识后才能发送登录请求。 */
        @GetMapping("/api/v1/test-identity")
        public Map<String, String> identity() { return Map.of("kind", "mxzg-owned-socket-it", "run", RUN); }
    }
}
