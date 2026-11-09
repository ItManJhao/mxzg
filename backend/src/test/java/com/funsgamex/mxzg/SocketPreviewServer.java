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
            "--spring.datasource.username=sa", "--spring.datasource.password=", "--mxzg.websocket.enabled=true",
            "--mxzg.gm.enabled=" + Arrays.asList(args).contains("--lineup-battle-fixture")
        });
                if(Arrays.asList(args).contains("--equipment-fixture")) {
            var player=context.getBean(com.funsgamex.mxzg.auth.DevelopmentLoginService.class).login("equipment_review");
            var jdbc=context.getBean(org.springframework.jdbc.core.JdbcTemplate.class);
            String hero=UUID.randomUUID().toString(),empty=UUID.randomUUID().toString();
            jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star) VALUES (?,?,10101001,1,1)",hero,player.role().id());
            jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star) VALUES (?,?,10301001,1,1)",empty,player.role().id());
            for(int slot=1;slot<=4;slot++)jdbc.update("INSERT INTO game_equipment(id,role_id,template_id,slot,soul_level,hero_id) VALUES (?,?,?,?,?,?)","922337203685477580"+slot,player.role().id(),1000001+slot*1000,slot,slot==1?3:0,hero);
        }
        // 只读试战验收专用：通过真实保存服务设置两名已支持英雄，仅作用于本进程内存库。
        if (Arrays.asList(args).contains("--lineup-battle-fixture")) {
            var player = context.getBean(com.funsgamex.mxzg.auth.DevelopmentLoginService.class).login("battle_review");
            var jdbc = context.getBean(org.springframework.jdbc.core.JdbcTemplate.class);
            var slots = new ArrayList<com.funsgamex.mxzg.lineup.Lineup.Slot>();
            for (int index = 0; index < 2; index++) {
                String hero = UUID.randomUUID().toString();
                jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star) VALUES (?,?,?,1,?)",
                    hero, player.role().id(), index == 0 ? 10101001 : 10104004, index == 0 ? 1 : 4);
                slots.add(new com.funsgamex.mxzg.lineup.Lineup.Slot(index + 2, hero));
            }
            String token = "Bearer " + player.session().accessToken();
            var snapshot = context.getBean(com.funsgamex.mxzg.network.SessionSnapshotService.class).snapshot(token);
            context.getBean(com.funsgamex.mxzg.lineup.MainFormationCommandService.class).save(token,
                new com.funsgamex.mxzg.lineup.MainFormationCommandService.Save(UUID.randomUUID().toString(),
                    snapshot.mainFormation().version(), 1, slots));
        }
        // 真实主线协议验收：强队只在本进程随机H2创建，不开启GM或英雄升级。
        if (Arrays.asList(args).contains("--main-chapter-fixture") || Arrays.asList(args).contains("--idle-loop-fixture")) {
            var player = context.getBean(com.funsgamex.mxzg.auth.DevelopmentLoginService.class).login("chapter_review");
            var jdbc = context.getBean(org.springframework.jdbc.core.JdbcTemplate.class);
            boolean idleLoop = Arrays.asList(args).contains("--idle-loop-fixture");
            // 治疗实机复验仅给当前独立内存角色准备一级冰晶女巫，不开放养成操作。
            boolean healingLineup = Arrays.asList(args).contains("--healing-lineup-fixture");
            var idleSlots = new ArrayList<com.funsgamex.mxzg.lineup.Lineup.Slot>();
            int[] templates = {10101001,10104004,10505005}, stars = {1,4,5}, positions = {2,3,5};
            // 复现负责人反馈的树精、火系英雄、布鲁组合；仅独立内存夹具生效，不改日常玩家。
            if (Arrays.asList(args).contains("--reported-lineup-fixture")) {
                templates = new int[] {10301001, 10101001, 10201001};
                stars = new int[] {1, 1, 1};
            }
            if (healingLineup) {
                templates = new int[] {10203003};
                stars = new int[] {3};
                positions = new int[] {2};
            }
            for (int i = 0; i < (idleLoop && !healingLineup ? 3 : 1); i++) {
                String hero = UUID.randomUUID().toString();
                int level = healingLineup || Arrays.asList(args).contains("--reported-lineup-fixture") ? 1 : 100;
                jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star) VALUES (?,?,?,?,?)",
                    hero, player.role().id(), templates[i], level, stars[i]);
                idleSlots.add(new com.funsgamex.mxzg.lineup.Lineup.Slot(positions[i], hero));
            }
            // 仅本进程内存夹具准备首通状态，便于连续遇敌和第二关挑战切换，不发首通奖励。
            if (idleLoop) {
                jdbc.update("INSERT INTO game_main_chapter(role_id,max_cleared) VALUES (?,1)", player.role().id());
                // 旧对话排除等级1；仅独立内存夹具设为2以验证真实对话筛选。
                jdbc.update("UPDATE game_role SET role_level=2 WHERE id=?", player.role().id());
            }
            String token = "Bearer " + player.session().accessToken();
            var snapshot = context.getBean(com.funsgamex.mxzg.network.SessionSnapshotService.class).snapshot(token);
            context.getBean(com.funsgamex.mxzg.lineup.MainFormationCommandService.class).save(token,
                new com.funsgamex.mxzg.lineup.MainFormationCommandService.Save(UUID.randomUUID().toString(),
                    snapshot.mainFormation().version(), 1, idleSlots));
        }
        // 仅本次独立内存预览准备主线布阵实例，不修改日常角色或数据库。
        if(Arrays.asList(args).contains("--formation-fixture")) {
            var player=context.getBean(com.funsgamex.mxzg.auth.DevelopmentLoginService.class).login("formation_review");
            var jdbc=context.getBean(org.springframework.jdbc.core.JdbcTemplate.class);
            for(int template:new int[]{10105008,10101001,10102002})
                jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage) VALUES (?,?,?,1,10,0)",UUID.randomUUID().toString(),player.role().id(),template);
        }
        // 仅独立内存预览夹具：同模板未进化/进化角色，用于检查切换和技能说明。
        if(Arrays.asList(args).contains("--evolution-fixture")) {
            var player=context.getBean(com.funsgamex.mxzg.auth.DevelopmentLoginService.class).login("evolution_review");
            var jdbc=context.getBean(org.springframework.jdbc.core.JdbcTemplate.class);
            for(int level:new int[]{0,2})jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage,evolve_type,evolve_level) VALUES (?,?,10105008,1,5,0,?,?)",UUID.randomUUID().toString(),player.role().id(),level==0?0:1,level);
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
