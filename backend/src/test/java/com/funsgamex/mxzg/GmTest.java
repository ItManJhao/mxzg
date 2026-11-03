/** GM 独立 H2 验证：真实事务、容量、角色隔离、重复请求与 Protobuf 推送。 */
package com.funsgamex.mxzg;
import java.util.*;
import java.net.*;
import java.net.http.*;
import java.nio.ByteBuffer;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.jdbc.core.JdbcTemplate;
import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.gm.GmService;
import com.funsgamex.mxzg.network.GameProtocolCodec;
import tools.jackson.databind.JsonNode;
import static org.junit.jupiter.api.Assertions.*;
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={"spring.datasource.url=jdbc:h2:mem:gm_test;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1","spring.datasource.username=sa","spring.datasource.password=","mxzg.gm.enabled=true"})
@ActiveProfiles("local")
class GmTest {
 @Autowired GmService gm;
 @Autowired DevelopmentLoginService login;
 @Autowired JdbcTemplate jdbc;
 @LocalServerPort int port;
 /** 合成账号，不连接玩家库。 */
 private DevelopmentLoginService.LoginResult player(){return login.login("gm_"+UUID.randomUUID().toString().substring(0,15));}
 /** 相同请求只到账一次；改参数复用请求 ID 回滚。 */
 @Test void receiptsAndIsolation(){var p=player();var other=player();String token="Bearer "+p.session().accessToken(),id=UUID.randomUUID().toString();gm.grant(token,id,"item",900101,5);gm.grant(token,id,"item",900101,5);assertEquals(5L,jdbc.queryForObject("SELECT quantity FROM game_inventory WHERE role_id=? AND item_id=900101",Long.class,p.role().id()));assertThrows(Exception.class,()->gm.grant(token,id,"item",900101,6));assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM game_inventory WHERE role_id=?",Integer.class,other.role().id()));assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM game_gm_grant WHERE role_id=?",Integer.class,p.role().id()));}
 /** 英雄初始星级由配置决定；容量不足整笔拒绝。 */
 @Test void heroesAndCapacity(){var p=player();String token="Bearer "+p.session().accessToken();gm.grant(token,UUID.randomUUID().toString(),"hero",10102002,2);assertEquals(2,jdbc.queryForObject("SELECT COUNT(*) FROM game_hero WHERE role_id=? AND star=2 AND hero_level=1",Integer.class,p.role().id()));jdbc.update("UPDATE game_role SET hero_capacity=2 WHERE id=?",p.role().id());assertThrows(Exception.class,()->gm.grant(token,UUID.randomUUID().toString(),"hero",10101001,1));assertEquals(2,jdbc.queryForObject("SELECT COUNT(*) FROM game_hero WHERE role_id=?",Integer.class,p.role().id()));}
 /** 非法数量、未知配置、无效会话不创建回执或资产。 */
 @Test void rejectInvalid(){var p=player();String token="Bearer "+p.session().accessToken();for(int qty:new int[]{0,-1,10000})assertThrows(Exception.class,()->gm.grant(token,UUID.randomUUID().toString(),"item",900101,qty));assertThrows(Exception.class,()->gm.grant(token,UUID.randomUUID().toString(),"hero",1,1));assertThrows(Exception.class,()->gm.grant("Bearer invalid",UUID.randomUUID().toString(),"item",900101,1));assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM game_gm_grant WHERE role_id=?",Integer.class,p.role().id()));}
 /** 二进制发放成功后收到真实 state.changed，响应回执与资产同步分离。 */
 @Test void websocketGrantPushesState() throws Exception {
  var p=player();var queue=new LinkedBlockingQueue<JsonNode>();
  try(var client=HttpClient.newHttpClient()){
   var socket=client.newWebSocketBuilder().subprotocols(GameProtocolCodec.SUBPROTOCOL).buildAsync(URI.create("ws://127.0.0.1:"+port+"/api/v1/game/socket"),new WebSocket.Listener(){
    final java.io.ByteArrayOutputStream bytes=new java.io.ByteArrayOutputStream();
    public void onOpen(WebSocket ws){ws.request(1);}
    public CompletionStage<?> onBinary(WebSocket ws,ByteBuffer data,boolean last){byte[] part=new byte[data.remaining()];data.get(part);bytes.writeBytes(part);if(last){try{queue.add(GameProtocolCodec.decode(bytes.toByteArray()));}catch(Exception e){throw new RuntimeException(e);}bytes.reset();}ws.request(1);return null;}
   }).join();
   try{
    send(socket,"session.authenticate",null,Map.of("accessToken",p.session().accessToken(),"clientInstanceId",UUID.randomUUID().toString()));var initial=queue.poll(5,TimeUnit.SECONDS);assertNotNull(initial);String conn=initial.path("body").path("connectionId").asString();
    send(socket,"gm.status",conn,Map.of());assertTrue(queue.poll(5,TimeUnit.SECONDS).path("body").path("enabled").asBoolean());
    send(socket,"gm.grant",conn,Map.of("requestId",UUID.randomUUID().toString(),"kind","hero","configId",10101001,"quantity",1));
    var a=queue.poll(5,TimeUnit.SECONDS);var b=queue.poll(5,TimeUnit.SECONDS);assertNotNull(a);assertNotNull(b);var event=a.path("kind").asString().equals("event")?a:b;var result=event==a?b:a;assertEquals("state.changed",event.path("name").asString());assertEquals(1,event.path("body").path("heroes").size());assertTrue(result.path("ok").asBoolean());
   }finally{socket.abort();}
  }
 }
 /** 构造真实协议请求，不绕过 socket 鉴权和业务分发。 */
 private void send(WebSocket socket,String name,String conn,Object body){var frame=new LinkedHashMap<String,Object>(Map.of("version",1,"kind","request","name",name,"id",UUID.randomUUID().toString(),"body",body));if(conn!=null)frame.put("connectionId",conn);socket.sendBinary(ByteBuffer.wrap(GameProtocolCodec.encode(frame)),true).join();}
}
