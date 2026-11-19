/** GM 独立 H2 验证：发放、角色与主线调整、游戏时钟、持久回执和 Protobuf 推送。 */
package com.funsgamex.mxzg;
import java.util.*;
import java.net.*;
import java.net.http.*;
import java.nio.ByteBuffer;
import java.time.Instant;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.jdbc.core.JdbcTemplate;
import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.campaign.MainChapterFirstRewardService;
import com.funsgamex.mxzg.gm.GmService;
import com.funsgamex.mxzg.network.GameProtocolCodec;
import com.funsgamex.mxzg.spirit.SpiritInventoryService;
import com.funsgamex.mxzg.time.GameClock;
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
 /** 统一首包读取入口，用于确认鉴权懒初始化之后重复快照不再推进版本。 */
 @Autowired com.funsgamex.mxzg.network.SessionSnapshotService snapshots;
 /** 重置关卡前后通过实际独立奖励入口核对同一成功回执。 */
 @Autowired MainChapterFirstRewardService chapterRewards;
 /** 出现断言失败时也恢复测试上下文的实际时钟。 */
 @Autowired GameClock clock;
 /** 合成账号，不连接玩家库。 */
 private DevelopmentLoginService.LoginResult player(){return login.login("gm_"+UUID.randomUUID().toString().substring(0,15));}
 /** 相同请求只到账一次；改参数复用请求 ID 回滚。 */
 @Test void receiptsAndIsolation(){var p=player();var other=player();String token="Bearer "+p.session().accessToken(),id=UUID.randomUUID().toString();gm.grant(token,id,"item",900101,5);gm.grant(token,id,"item",900101,5);assertEquals(5L,jdbc.queryForObject("SELECT quantity FROM game_inventory WHERE role_id=? AND item_id=900101",Long.class,p.role().id()));assertThrows(Exception.class,()->gm.grant(token,id,"item",900101,6));assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM game_inventory WHERE role_id=?",Integer.class,other.role().id()));assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM game_gm_grant WHERE role_id=?",Integer.class,p.role().id()));}
 /** 英雄初始星级由配置决定；容量不足整笔拒绝。 */
 @Test void heroesAndCapacity(){var p=player();String token="Bearer "+p.session().accessToken();gm.grant(token,UUID.randomUUID().toString(),"hero",10102002,2);assertEquals(2,jdbc.queryForObject("SELECT COUNT(*) FROM game_hero WHERE role_id=? AND star=2 AND hero_level=1",Integer.class,p.role().id()));jdbc.update("UPDATE game_role SET hero_capacity=2 WHERE id=?",p.role().id());assertThrows(Exception.class,()->gm.grant(token,UUID.randomUUID().toString(),"hero",10101001,1));assertEquals(2,jdbc.queryForObject("SELECT COUNT(*) FROM game_hero WHERE role_id=?",Integer.class,p.role().id()));}
 /** 非法数量、未知配置、无效会话不创建回执或资产。 */
 @Test void rejectInvalid(){var p=player();String token="Bearer "+p.session().accessToken();for(int qty:new int[]{0,-1,10000})assertThrows(Exception.class,()->gm.grant(token,UUID.randomUUID().toString(),"item",900101,qty));assertThrows(Exception.class,()->gm.grant(token,UUID.randomUUID().toString(),"hero",1,1));assertThrows(Exception.class,()->gm.grant("Bearer invalid",UUID.randomUUID().toString(),"item",900101,1));assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM game_gm_grant WHERE role_id=?",Integer.class,p.role().id()));}

 /** 百万级金币和钻石分别到账，重放只加一次，普通道具仍受数量保护。 */
 @Test
 void largeWalletGrantsKeepOrdinaryItemLimit() {
  var player = player();
  String role = player.role().id();
  String token = "Bearer " + player.session().accessToken();
  var before = snapshots.snapshot(token);
  String grantId = UUID.randomUUID().toString();
  var grant = gm.grant(token, grantId, "item", 900001, 10_000_000);
  assertEquals(grant, gm.grant(token, grantId, "item", 900001, 10_000_000));
  gm.grant(token, UUID.randomUUID().toString(), "item", 900002, 2_000_000);
  var rejected = assertThrows(ResponseStatusException.class,
      () -> gm.grant(token, UUID.randomUUID().toString(), "item", 900101, 10_000));
  assertEquals("GM_INVALID", rejected.getReason());
  var after = snapshots.snapshot(token);
  assertEquals(before.role().gold() + 10_000_000, after.role().gold());
  assertEquals(before.role().diamonds() + 2_000_000, after.role().diamonds());
  assertEquals(before.inventory(), after.inventory());
  assertEquals(before.revision() + 2, after.revision());
  assertEquals(2, count("game_gm_grant", role));
 }

 /** 设置角色等级统一同步且清零经验；不发升级赠钻，旧回执不能改写后来的等级。 */
 @Test
 void roleLevelSetsExactValueAndKeepsLatestAdjustmentOnRetry() {
  var player = player();
  String role = player.role().id();
  String token = "Bearer " + player.session().accessToken();
  jdbc.update("UPDATE game_role SET role_experience=5 WHERE id=?", role);
  var before = snapshots.snapshot(token);
  String requestId = UUID.randomUUID().toString();
  var receipt = gm.setRoleLevel(token, requestId, 15);
  var leveled = snapshots.snapshot(token);
  assertEquals(new GmService.Adjustment(requestId, 15), receipt);
  assertEquals(15, leveled.role().level());
  assertEquals(0, leveled.role().basics().experience());
  assertEquals(before.role().diamonds(), leveled.role().diamonds());
  assertEquals(before.revision() + 1, leveled.revision());
  gm.setRoleLevel(token, UUID.randomUUID().toString(), 2);
  assertEquals(receipt, gm.setRoleLevel(token, requestId, 15));
  var invalid = assertThrows(ResponseStatusException.class,
      () -> gm.setRoleLevel(token, UUID.randomUUID().toString(), Integer.MAX_VALUE));
  assertEquals("GM_INVALID_LEVEL", invalid.getReason());
  var conflict = assertThrows(ResponseStatusException.class, () -> gm.setChapter(token, requestId, 2));
  assertEquals("GM_REQUEST_CONFLICT", conflict.getReason());
  var latest = snapshots.snapshot(token);
  assertEquals(2, latest.role().level());
  assertEquals(leveled.revision() + 1, latest.revision());
  assertEquals(2, count("game_gm_adjustment", role));
 }

 /** 设置下一挑战关卡和挂机收益档位，重置后保留真实已领奖励，待结算时拒绝改写。 */
 @Test
 void chapterAdjustmentsPreserveIdleAndClaimHistory() {
  var player = player();
  String role = player.role().id();
  String token = "Bearer " + player.session().accessToken();
  var before = snapshots.snapshot(token);
  String jumpId = UUID.randomUUID().toString();
  var jump = gm.setChapter(token, jumpId, 6);
  var after = snapshots.snapshot(token);
  assertEquals(new GmService.Adjustment(jumpId, 6), jump);
  assertEquals(5, after.mainChapter().maxCleared());
  assertEquals(5, after.mainChapterIdle().rewardStage());
  assertEquals(before.mainChapterIdle().startedAt(), after.mainChapterIdle().startedAt());
  assertEquals(before.role(), after.role());
  assertEquals(before.inventory(), after.inventory());
  assertEquals(before.revision() + 1, after.revision());
  assertEquals(0, count("game_main_chapter_battle", role));
  var claimed = chapterRewards.claim(token, 1);
  jdbc.update("INSERT INTO game_main_chapter_milestone(role_id,reward_id) VALUES (?,1)", role);
  gm.setChapter(token, UUID.randomUUID().toString(), 1);
  assertEquals(jump, gm.setChapter(token, jumpId, 6));
  var reset = snapshots.snapshot(token);
  assertEquals(0, reset.mainChapter().maxCleared());
  assertEquals(0, reset.mainChapterIdle().rewardStage());
  assertEquals(List.of(1), reset.mainChapter().firstRewardProgress().claimedChapters());
  assertEquals(List.of(1), reset.mainChapter().milestoneProgress().claimedIds());
  assertEquals(claimed, chapterRewards.claim(token, 1));
  var tooHigh = assertThrows(ResponseStatusException.class,
      () -> gm.setChapter(token, UUID.randomUUID().toString(), reset.mainChapter().challengeLimit() + 1));
  assertEquals("GM_INVALID_CHAPTER", tooHigh.getReason());

  // 预置独立测试角色的待结算标识，关卡 GM 必须保持标识与当前通关数据。
  String pending = UUID.randomUUID().toString();
  jdbc.update("UPDATE game_main_chapter SET max_cleared=1,pending_battle_id=? WHERE role_id=?", pending, role);
  var busy = assertThrows(ResponseStatusException.class,
      () -> gm.setChapter(token, UUID.randomUUID().toString(), 7));
  assertEquals("GM_CHAPTER_PENDING", busy.getReason());
  var unchanged = snapshots.snapshot(token);
  assertEquals(1, unchanged.mainChapter().maxCleared());
  assertEquals(pending, unchanged.mainChapter().pendingBattleId());
  assertEquals(reset.revision(), unchanged.revision());
  assertEquals(2, count("game_gm_adjustment", role));
 }
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

 /** 以鉴权懒初始化后的版本为基线；回执SQL失败回滚精灵和版本，原请求重试仅增加一次。 */
 @Test
 void spiritReceiptFailureRollsBackAndRetrySucceeds() throws Exception {
  var player = player();
  String role = player.role().id();
  String token = "Bearer " + player.session().accessToken();
  String requestId = UUID.randomUUID().toString();
  String constraint = "gm_spirit_receipt_reject_" + UUID.randomUUID().toString().replace("-", "");
  long beforeAuthentication = revision(role);
  try (var peer = new SpiritPeer(player.session().accessToken())) {
   long before = initializedRevision(token, role, beforeAuthentication);
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

 /** 鉴权初始版本之后，真实精灵发放只推进一次；重放不重抽、不增版本、不再次推送。 */
 @Test
 void websocketSpiritGrantPushesCompleteStateOnce() throws Exception {
  var player = player();
  String role = player.role().id();
  String requestId = UUID.randomUUID().toString();
  var body = Map.of("requestId", requestId, "kind", "item", "configId", 2000002, "quantity", 2);
  long beforeAuthentication = revision(role);
  try (var peer = new SpiritPeer(player.session().accessToken())) {
   long before = initializedRevision("Bearer " + player.session().accessToken(), role, beforeAuthentication);
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

 /** 新角色鉴权只懒建一次冒险点；后续同一首包读取必须保持真实版本与唯一记录。 */
 private long initializedRevision(String token, String role, long beforeAuthentication) {
  long initialized = revision(role);
  assertEquals(beforeAuthentication + 1, initialized);
  assertEquals(1, count("game_tavern_point", role));
  assertEquals(initialized, snapshots.snapshot(token).revision());
  assertEquals(initialized, revision(role));
  assertEquals(1, count("game_tavern_point", role));
  return initialized;
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
 /** 角色等级与主线指令使用真实二进制回执，提交后的统一快照分别提供最新值。 */
 @Test
 void websocketAdjustmentsReturnReceiptAndUpdatedState() throws Exception {
  var player = player();
  try (var peer = new SpiritPeer(player.session().accessToken())) {
   String levelRequest = UUID.randomUUID().toString();
   peer.send("gm.level.set", Map.of("requestId", levelRequest, "level", 15));
   var afterLevel = readAdjustment(peer, "gm.level.set", levelRequest, "level", 15);
   assertEquals(15, afterLevel.path("role").path("level").asInt());

   String chapterRequest = UUID.randomUUID().toString();
   peer.send("gm.chapter.set", Map.of("requestId", chapterRequest, "mission", 10));
   var afterChapter = readAdjustment(peer, "gm.chapter.set", chapterRequest, "mission", 10);
   assertEquals(9, afterChapter.path("mainChapter").path("maxCleared").asInt());
   assertEquals(15, afterChapter.path("role").path("level").asInt());
  }
 }

 /** 核对单笔指令的独立回执并返回本次统一状态，适配两个消息的到达顺序。 */
 private JsonNode readAdjustment(SpiritPeer peer, String name, String requestId, String key, int value)
     throws Exception {
  var first = peer.receive();
  var second = peer.receive();
  var push = first.path("kind").asString().equals("event") ? first : second;
  var response = push == first ? second : first;
  assertEquals("state.changed", push.path("name").asString());
  assertEquals(name, response.path("name").asString());
  assertTrue(response.path("ok").asBoolean(), response.toString());
  assertEquals(requestId, response.path("body").path("requestId").asString());
  assertEquals(value, response.path("body").path(key).asInt());
  return push.path("body");
 }

 /** 通过真实 WS 设定过去时间，核对查询、重连心跳和期限快照都使用同一个游戏时钟。 */
 @Test
 void websocketClockDrivesGameplayAndCanReset() throws Exception {
  var player = player();
  var target = Instant.parse("2001-01-02T03:04:05Z");
  try {
   try (var peer = new SpiritPeer(player.session().accessToken())) {
    peer.send("gm.time.set", Map.of("unixSeconds", -1));
    assertEquals("GM_INVALID_TIME", peer.receive().path("error").path("code").asString());
    peer.send("gm.time.set", Map.of("unixSeconds", target.getEpochSecond()));
    var set = peer.receive();
    assertTrue(set.path("ok").asBoolean(), set.toString());
    assertEquals(target.toEpochMilli(), set.path("body").path("serverTimeMs").asLong());
    assertTrue(set.path("body").path("overridden").asBoolean());
    peer.send("gm.time.get", Map.of());
    var read = peer.receive().path("body");
    assertTrue(read.path("serverTimeMs").asLong() >= target.toEpochMilli());
    assertTrue(read.path("overridden").asBoolean());
    var snapshot = snapshots.snapshot("Bearer " + player.session().accessToken());
    assertTrue(snapshot.timedInventory().serverTimeSeconds() >= target.getEpochSecond());
    assertTrue(snapshot.timedInventory().serverTimeSeconds() < target.getEpochSecond() + 60);
    assertTrue(snapshot.mainChapterIdle().serverTime() >= target.getEpochSecond());
    assertTrue(snapshot.mainChapterIdle().serverTime() < snapshot.mainChapterIdle().startedAt());
   }
   try (var peer = new SpiritPeer(player.session().accessToken())) {
    peer.send("session.heartbeat", Map.of());
    long heartbeat = peer.receive().path("body").path("serverTimeMs").asLong();
    assertTrue(heartbeat >= target.toEpochMilli() && heartbeat < target.plusSeconds(60).toEpochMilli());
    peer.send("gm.time.set", Map.of("unixSeconds", 0));
    var reset = peer.receive().path("body");
    assertFalse(reset.path("overridden").asBoolean());
    assertTrue(Math.abs(reset.path("serverTimeMs").asLong() - System.currentTimeMillis()) < 5_000);
   }
  } finally {
   clock.reset();
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
