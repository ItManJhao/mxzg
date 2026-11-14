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
import com.funsgamex.mxzg.spirit.SpiritInventoryService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import static org.junit.jupiter.api.Assertions.*;
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={"spring.datasource.url=jdbc:h2:mem:gm_test;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1","spring.datasource.username=sa","spring.datasource.password=","mxzg.gm.enabled=true"})
@ActiveProfiles("local")
class GmTest {
 @Autowired GmService gm;
 @Autowired DevelopmentLoginService login;
 @Autowired JdbcTemplate jdbc;
 @LocalServerPort int port;
 /** 当前真实精灵领域入口，读取时加入测试独立数据库的显式事务。 */
 @Autowired SpiritInventoryService spirits;
 /** 与GM代理、精灵写入和资产版本共用的真实事务管理器。 */
 @Autowired PlatformTransactionManager transactions;
 /** 合成账号，不连接玩家库。 */
 private DevelopmentLoginService.LoginResult player(){return login.login("gm_"+UUID.randomUUID().toString().substring(0,15));}
 /** 相同请求只到账一次；改参数复用请求 ID 回滚。 */
 @Test void receiptsAndIsolation(){var p=player();var other=player();String token="Bearer "+p.session().accessToken(),id=UUID.randomUUID().toString();gm.grant(token,id,"item",900101,5);gm.grant(token,id,"item",900101,5);assertEquals(5L,jdbc.queryForObject("SELECT quantity FROM game_inventory WHERE role_id=? AND item_id=900101",Long.class,p.role().id()));assertThrows(Exception.class,()->gm.grant(token,id,"item",900101,6));assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM game_inventory WHERE role_id=?",Integer.class,other.role().id()));assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM game_gm_grant WHERE role_id=?",Integer.class,p.role().id()));}
 /** 英雄初始星级由配置决定；容量不足整笔拒绝。 */
 @Test void heroesAndCapacity(){var p=player();String token="Bearer "+p.session().accessToken();gm.grant(token,UUID.randomUUID().toString(),"hero",10102002,2);assertEquals(2,jdbc.queryForObject("SELECT COUNT(*) FROM game_hero WHERE role_id=? AND star=2 AND hero_level=1",Integer.class,p.role().id()));jdbc.update("UPDATE game_role SET hero_capacity=2 WHERE id=?",p.role().id());assertThrows(Exception.class,()->gm.grant(token,UUID.randomUUID().toString(),"hero",10101001,1));assertEquals(2,jdbc.queryForObject("SELECT COUNT(*) FROM game_hero WHERE role_id=?",Integer.class,p.role().id()));}
 /** 非法数量、未知配置、无效会话不创建回执或资产。 */
 @Test void rejectInvalid(){var p=player();String token="Bearer "+p.session().accessToken();for(int qty:new int[]{0,-1,10000})assertThrows(Exception.class,()->gm.grant(token,UUID.randomUUID().toString(),"item",900101,qty));assertThrows(Exception.class,()->gm.grant(token,UUID.randomUUID().toString(),"hero",1,1));assertThrows(Exception.class,()->gm.grant("Bearer invalid",UUID.randomUUID().toString(),"item",900101,1));assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM game_gm_grant WHERE role_id=?",Integer.class,p.role().id()));}
 /** 同一请求只创建一批真实实例；重放不重抽属性，回执和实例均按真实角色隔离。 */
 @Test
 void spiritInstancesKeepStableReceiptAndRoleOwnership() {
  var player = player();
  var other = player();
  String role = player.role().id();
  String token = "Bearer " + player.session().accessToken();
  String requestId = UUID.randomUUID().toString();
  long before = revision(role);
  var receipt = gm.grant(token, requestId, "item", 2000002, 3);
  var original = spiritState(role);
  assertEquals(1, original.schemaVersion());
  assertEquals(3, original.items().size());
  assertEquals(3, original.items().stream().map(SpiritInventoryService.Item::instanceId).distinct().count());
  for (var item : original.items()) {
   assertEquals(UUID.fromString(item.instanceId()).toString(), item.instanceId());
   assertEquals(2000002, item.itemId());
   assertTrue(item.abilityId() >= 1 && item.abilityId() <= 4);
   assertFalse(item.skills().isEmpty());
   assertTrue(item.skills().stream().allMatch(skill -> skill.sort() > 0 && skill.skillId() > 0 && skill.level() > 0));
  }
  assertEquals(before + 1, revision(role));
  assertEquals(0, count("game_inventory", role));
  assertEquals(receipt, gm.grant(token, requestId, "item", 2000002, 3));
  assertEquals(original, spiritState(role));
  assertEquals(before + 1, revision(role));
  assertEquals(1, count("game_gm_grant", role));
  var conflict = assertThrows(ResponseStatusException.class,
      () -> gm.grant(token, requestId, "item", 2000002, 4));
  assertEquals("GM_REQUEST_CONFLICT", conflict.getReason());
  assertEquals(original, spiritState(role));
  assertTrue(spiritState(other.role().id()).items().isEmpty());
  gm.grant("Bearer " + other.session().accessToken(), requestId, "item", 2000002, 1);
  var otherState = spiritState(other.role().id());
  assertEquals(1, otherState.items().size());
  assertTrue(original.items().stream().noneMatch(item -> item.instanceId().equals(otherState.items().getFirst().instanceId())));
  assertEquals(original, spiritState(role));
  assertEquals(1, count("game_gm_grant", other.role().id()));
 }

 /** 未恢复精灵明确拒绝；超过技术批量上限不能裁剪、写假堆叠、增加版本或留下成功回执。 */
 @Test
 void spiritRejectsUnrestoredAndExcessGrants() {
  var player = player();
  String role = player.role().id();
  String token = "Bearer " + player.session().accessToken();
  long before = revision(role);
  for (int itemId : List.of(2000001, 2000003)) {
   var unsupported = assertThrows(ResponseStatusException.class,
       () -> gm.grant(token, UUID.randomUUID().toString(), "item", itemId, 1));
   assertEquals("GM_UNSUPPORTED_ITEM_TYPE", unsupported.getReason());
  }
  for (int quantity : List.of(1001, 9999)) {
   var overLimit = assertThrows(ResponseStatusException.class,
       () -> gm.grant(token, UUID.randomUUID().toString(), "item", 2000002, quantity));
   assertEquals("GM_SPIRIT_LIMIT", overLimit.getReason());
  }
  assertEquals(0, count("game_inventory", role));
  assertEquals(0, count("game_spirit", role));
  assertEquals(0, count("game_gm_grant", role));
  assertEquals(before, revision(role));
 }

 /** 技术上限1000整批合法，生成1000个独立实例并只提交一次资产版本。 */
 @Test
 void spiritGrantAcceptsTechnicalMaximum() {
  var player = player();
  String role = player.role().id();
  long before = revision(role);
  gm.grant("Bearer " + player.session().accessToken(), UUID.randomUUID().toString(), "item", 2000002, 1000);
  var state = spiritState(role);
  assertEquals(1000, state.items().size());
  assertEquals(1000, state.items().stream().map(SpiritInventoryService.Item::instanceId).distinct().count());
  assertEquals(0, count("game_inventory", role));
  assertEquals(1, count("game_gm_grant", role));
  assertEquals(before + 1, revision(role));
 }

 /** 回执SQL失败时实例、资产版本和推送一起回滚；移除独立库故障后原请求仍能正常重试。 */
 @Test
 void spiritReceiptFailureRollsBackAndRetrySucceeds() throws Exception {
  var player = player();
  String role = player.role().id();
  String token = "Bearer " + player.session().accessToken();
  String requestId = UUID.randomUUID().toString();
  String constraint = "gm_spirit_receipt_reject_" + UUID.randomUUID().toString().replace("-", "");
  long before = revision(role);
  try (var peer = new SpiritPeer(player.session().accessToken())) {
   // 只拦截当前合成角色的回执插入，确保故障发生在真实精灵写入之后。
   jdbc.execute("ALTER TABLE game_gm_grant ADD CONSTRAINT " + constraint + " CHECK (role_id <> '" + role + "')");
   try {
    assertThrows(DataIntegrityViolationException.class,
        () -> gm.grant(token, requestId, "item", 2000002, 3));
    assertEquals(0, count("game_spirit", role));
    assertEquals(0, count("game_inventory", role));
    assertEquals(0, count("game_gm_grant", role));
    assertEquals(before, revision(role));
    peer.assertNoEvent();
   } finally {
    jdbc.execute("ALTER TABLE game_gm_grant DROP CONSTRAINT " + constraint);
   }
   gm.grant(token, requestId, "item", 2000002, 3);
   var event = peer.receive();
   assertEquals("state.changed", event.path("name").asString());
   assertEquals(3, event.path("body").path("spiritInventory").path("items").size());
   assertEquals(3, count("game_spirit", role));
   assertEquals(1, count("game_gm_grant", role));
   assertEquals(before + 1, revision(role));
  }
 }

 /** 正式二进制GM请求推送完整真实精灵快照，重放只回执且不重抽、不增版本、不再次推送。 */
 @Test
 void websocketSpiritGrantPushesCompleteStateOnce() throws Exception {
  var player = player();
  String role = player.role().id();
  long before = revision(role);
  String requestId = UUID.randomUUID().toString();
  var body = Map.of("requestId", requestId, "kind", "item", "configId", 2000002, "quantity", 2);
  try (var peer = new SpiritPeer(player.session().accessToken())) {
   peer.send("gm.grant", body);
   var first = peer.receive();
   var second = peer.receive();
   var event = first.path("kind").asString().equals("event") ? first : second;
   var response = event == first ? second : first;
   assertEquals("response", response.path("kind").asString());
   assertEquals("gm.grant", response.path("name").asString());
   assertTrue(response.path("ok").asBoolean());
   assertEquals(requestId, response.path("body").path("requestId").asString());
   assertEquals(2000002, response.path("body").path("configId").asInt());
   assertEquals(2, response.path("body").path("quantity").asInt());
   assertEquals("state.changed", event.path("name").asString());
   assertEquals(role, event.path("body").path("role").path("id").asString());
   assertEquals(before + 1, event.path("body").path("revision").asLong());
   assertEquals(0, event.path("body").path("inventory").size());
   var snapshot = event.path("body").path("spiritInventory");
   assertEquals(1, snapshot.path("schemaVersion").asInt());
   assertEquals(2, snapshot.path("items").size());
   var original = spiritState(role);
   var identities = new HashSet<String>();
   for (var item : snapshot.path("items")) {
    identities.add(item.path("instanceId").asString());
    var stored = original.items().stream()
        .filter(candidate -> candidate.instanceId().equals(item.path("instanceId").asString())).findFirst().orElseThrow();
    assertEquals(stored.itemId(), item.path("itemId").asInt());
    assertEquals(stored.abilityId(), item.path("abilityId").asInt());
    assertEquals(stored.skills().size(), item.path("skills").size());
    for (int index = 0; index < stored.skills().size(); index++) {
     var skill = stored.skills().get(index);
     var transmitted = item.path("skills").get(index);
     assertEquals(skill.sort(), transmitted.path("sort").asInt());
     assertEquals(skill.skillId(), transmitted.path("skillId").asInt());
     assertEquals(skill.level(), transmitted.path("level").asInt());
    }
   }
   assertEquals(2, identities.size());
   peer.send("gm.grant", body);
   var replay = peer.receive();
   assertEquals("response", replay.path("kind").asString());
   assertTrue(replay.path("ok").asBoolean());
   assertEquals(requestId, replay.path("body").path("requestId").asString());
   peer.assertNoEvent();
   assertEquals(original, spiritState(role));
   assertEquals(before + 1, revision(role));
   assertEquals(1, count("game_gm_grant", role));
  }
 }

 /** 在真实事务内读取完整精灵状态，读取校验同时覆盖持久真实属性。 */
 private SpiritInventoryService.State spiritState(String role) {
  return new TransactionTemplate(transactions).execute(status -> spirits.current(role));
 }

 /** 查询独立数据库已提交的资产版本，不使用本地计数替代。 */
 private long revision(String role) {
  return jdbc.queryForObject("SELECT state_revision FROM game_role WHERE id=?", Long.class, role);
 }

 /** 表名仅由本测试固定字面量传入，按角色核对实际落库数量。 */
 private int count(String table, String role) {
  return jdbc.queryForObject("SELECT COUNT(*) FROM " + table + " WHERE role_id=?", Integer.class, role);
 }

 /** 精灵GM测试专用真实二进制连接，隔离当前合成角色，关闭时释放网络资源。 */
 private final class SpiritPeer implements WebSocket.Listener, AutoCloseable {
  /** 本连接专属JDK客户端，随测试关闭。 */
  private final HttpClient client = HttpClient.newHttpClient();
  /** 完整二进制帧队列，测试线程统一解码和断言。 */
  private final BlockingQueue<byte[]> incoming = new LinkedBlockingQueue<>();
  /** 当前网络消息分片，末片入队后重置。 */
  private final java.io.ByteArrayOutputStream fragments = new java.io.ByteArrayOutputStream();
  /** 回环随机端口连接，不触碰日常测试服或现有角色。 */
  private final WebSocket socket;
  /** 鉴权成功后保存的真实连接ID，后续业务请求必须携带。 */
  private String connectionId;

  /** 建立正式子协议连接并完成鉴权，确保后续读帧只含本次业务响应或提交事件。 */
  private SpiritPeer(String token) throws Exception {
   socket = client.newWebSocketBuilder().subprotocols(GameProtocolCodec.SUBPROTOCOL)
       .connectTimeout(java.time.Duration.ofSeconds(5))
       .buildAsync(URI.create("ws://127.0.0.1:" + port + "/api/v1/game/socket"), this).join();
   send("session.authenticate", Map.of("accessToken", token, "clientInstanceId", UUID.randomUUID().toString()));
   var response = receive();
   assertTrue(response.path("ok").asBoolean());
   connectionId = response.path("body").path("connectionId").asString();
   assertFalse(connectionId.isBlank());
  }

  /** 开启首帧消费，避免客户端背压阻塞真实推送。 */
  @Override
  public void onOpen(WebSocket opened) {
   opened.request(1);
  }

  /** 合并真实二进制分片；不在网络线程修改测试资产或遗漏中间分片。 */
  @Override
  public CompletionStage<?> onBinary(WebSocket opened, ByteBuffer data, boolean last) {
   byte[] part = new byte[data.remaining()];
   data.get(part);
   fragments.writeBytes(part);
   if (last) {
    incoming.add(fragments.toByteArray());
    fragments.reset();
   }
   opened.request(1);
   return null;
  }

  /** 发送正式Protobuf信封，复用服务端确认的连接身份。 */
  private void send(String name, Object body) {
   GmTest.this.send(socket, name, connectionId, body);
  }

  /** 在固定期限内读取完整真实帧，超时直接暴露事务通知或协议回包缺失。 */
  private JsonNode receive() throws Exception {
   byte[] wire = incoming.poll(5, TimeUnit.SECONDS);
   assertNotNull(wire, "GM精灵消息未按期到达");
   return GameProtocolCodec.decode(wire);
  }

  /** 回执重放或回滚不得产生资产事件，短期限内也不能留下额外响应。 */
  private void assertNoEvent() throws InterruptedException {
   assertNull(incoming.poll(200, TimeUnit.MILLISECONDS), "重复请求或回滚不应推送资产变更");
  }

  /** 中止测试连接并关闭客户端，避免遗留心跳和后台线程。 */
  @Override
  public void close() {
   socket.abort();
   client.close();
  }
 }
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
