/**
 * 本机开发 GM：发放资产、准备角色等级和主线挑战进度。
 * 仅修改当前已鉴权角色，使用同库持久回执和事务提交后的统一状态同步。
 */
package com.funsgamex.mxzg.gm;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.stereotype.Service;
import org.springframework.context.annotation.Profile;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import tools.jackson.databind.*;
import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.campaign.MainChapterService;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.hero.*;
import com.funsgamex.mxzg.inventory.*;
import com.funsgamex.mxzg.network.AssetSyncService;
import com.funsgamex.mxzg.spirit.SpiritInventoryService;
import com.funsgamex.mxzg.tavern.TavernPointService;
import com.funsgamex.mxzg.time.GameClock;
@Service @Profile("local & !production")
public class GmService {
 /** 当前已恢复真实实例生成的精灵物品，其他type8不能降级成普通库存。 */
 private static final int SUPPORTED_SPIRIT_ITEM = 2_000_002;
 /** 单次精灵准备的技术批量上限，与实例服务保持一致；不是持有容量，不裁剪请求。 */
 private static final int MAX_SPIRIT_GRANT_QUANTITY = 1_000;
 /** 除金币、钻石外，保留当前普通道具和各实例类别的单次上限。 */
 private static final int MAX_ITEM_GRANT_QUANTITY = 9_999;
 /** 金币钱包对应的配置 ID。 */
 private static final int GOLD_ITEM = 900001;
 /** 钻石钱包对应的配置 ID。 */
 private static final int DIAMOND_ITEM = 900002;
 /** 服务端开关；local配置默认开启，缺少本配置时兜底关闭，production不装配本服务。 */
 private final boolean enabled;
 /** 当前连接身份验证入口。 */
 private final SessionService sessions;
 /** 角色锁与钱包唯一写入口。 */
 private final RoleRepository roles;
 /** 主线唯一进度入口，校验范围与待结算状态。 */
 private final MainChapterService chapters;
 /** 发放回执与资产使用同一数据库事务。 */
 private final JdbcTemplate jdbc;
 /** 普通库存写入口。 */
 private final InventoryService inventory;
 /** 逐件期限库存写入口。 */
 private final TimedInventoryService timed;
 /** 真实精灵实例写入口，加入本次GM回执事务，不重抽已确认的重复请求。 */
 private final SpiritInventoryService spirits;
 /** 冒险点唯一领域入口，开发准备明确不受关卡上限裁剪。 */
 private final TavernPointService tavernPoints;
 /** 递增资产版本并提交后同步。 */
 private final AssetSyncService sync;
 /** 英雄初始属性校验规则。 */
 private final HeroGrowthRules growth;
 /** 真实 GM 英雄也在发放事务内登记图鉴最高星级。 */
 private final HeroRepository heroRepository;
 /** 持久英雄容量查询。 */
 private final HeroCapacityService capacity;
 /** 英雄新增后在同事务内更新永久解锁。 */
 private final com.funsgamex.mxzg.lineup.MainFormationStateService formations;
 /** 与登录、期限物品共用的游戏时钟，批量发放只读取一次。 */
 private final GameClock clock;
 /** 启动加载的可信配置索引，不存玩家资产。 */
 private final Map<Integer,JsonNode> heroes=new HashMap<>(),items=new HashMap<>();
 /** 需要逐件发放的期限配置 ID。 */
 private final Set<Integer> timedIds=new HashSet<>();
 /** 成功回执；资产仍由 state.changed 更新。 */
 public record Result(String requestId,String kind,int configId,int quantity) {}
 /** 配置型 GM 的持久回执，value 为目标角色等级或下一挑战关卡。 */
 public record Adjustment(String requestId, int value) {}
 /** 区分共享回执表中的操作类型；重放时类型也必须一致。 */
 private enum AdjustmentKind { ROLE_LEVEL, CHAPTER }

 /** 注入同库角色、主线、图鉴和资产入口，读取原策划配置及游戏时钟。 */
 public GmService(@Value("${mxzg.gm.enabled:false}") boolean enabled, SessionService sessions,
     RoleRepository roles, JdbcTemplate jdbc, InventoryService inventory, TimedInventoryService timed,
     SpiritInventoryService spirits, TavernPointService tavernPoints, AssetSyncService sync, HeroGrowthRules growth,
     HeroCapacityService capacity, HeroRepository heroRepository,
     com.funsgamex.mxzg.lineup.MainFormationStateService formations,
     ObjectMapper mapper, MainChapterService chapters, GameClock clock) {
  this.enabled = enabled;
  this.sessions = sessions;
  this.roles = roles;
  this.chapters = chapters;
  this.jdbc = jdbc;
  this.inventory = inventory;
  this.timed = timed;
  this.spirits = spirits;
  this.tavernPoints = tavernPoints;
  this.sync = sync;
  this.growth = growth;
  this.heroRepository = heroRepository;
  this.capacity = capacity;
  this.formations = formations;
  this.clock = clock;
  for (var row : rows(mapper, "herotype")) {
   if (row.path("type").isIntegralNumber()) {
    heroes.put(row.path("type").asInt(), row);
   }
  }
  for (var row : rows(mapper, "item")) {
   if (row.path("idx").isIntegralNumber()) {
    items.put(row.path("idx").asInt(), row);
   }
  }
  for (var row : rows(mapper, "timelimititem")) {
   timedIds.add(row.path("item_id").asInt());
  }
 }
 /** 查询实际服务端开关，不能由客户端开启。 */
 public boolean enabled(){return enabled;}
 /** 当前角色锁内原子发放并存回执；真实英雄同步更新图鉴，其余保留原发放保护。 */
 @Transactional(isolation = Isolation.READ_COMMITTED)
 public Result grant(String token, String requestId, String kind, int configId, int quantity) {
  requireEnabledRequest(requestId);
  boolean walletCurrency = "item".equals(kind) && (configId == GOLD_ITEM || configId == DIAMOND_ITEM);
  if (quantity < 1 || (quantity > MAX_ITEM_GRANT_QUANTITY && !walletCurrency) || configId <= 0) {
   throw rejected("GM_INVALID");
  }
  if (!"hero".equals(kind) && !"item".equals(kind)) {
   throw rejected("GM_INVALID");
  }
  String role = authorizeAndLock(token);
  var result = new Result(requestId, kind, configId, quantity);
  var previous = jdbc.query("SELECT kind,config_id,quantity FROM game_gm_grant WHERE role_id=? AND request_id=?",
      (row, index) -> new Result(requestId, row.getString(1), row.getInt(2), row.getInt(3)), role, requestId);
  if (!previous.isEmpty()) {
   if (!previous.getFirst().equals(result)) {
    throw rejected("GM_REQUEST_CONFLICT");
   }
   return previous.getFirst();
  }
  if (kind.equals("hero")) {
   var rule = heroes.get(configId);
   if (rule == null || quantity > 20) {
    throw rejected("GM_INVALID_HERO");
   }
   int star = rule.path("star").asInt();
   growth.stats(configId, star, 1, 0);
   int owned = jdbc.queryForObject("SELECT COUNT(*) FROM game_hero WHERE role_id=?", Integer.class, role);
   if ((long) owned + quantity > capacity.current(role).capacity()) {
    throw rejected("GM_CAPACITY_FULL");
   }
   for (int index = 0; index < quantity; index++) {
    jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star) VALUES (?,?,?,1,?)",
        UUID.randomUUID().toString(), role, configId, star);
   }
   heroRepository.recordIllustration(role, configId, star);
   formations.refresh(role);
   sync.changed(role);
  } else {
   if (!items.containsKey(configId)) {
    throw rejected("GM_UNKNOWN_ITEM");
   }
   if (items.get(configId).path("type").asInt() == 8) {
    if (configId != SUPPORTED_SPIRIT_ITEM) {
     throw rejected("GM_UNSUPPORTED_ITEM_TYPE");
    }
    if (quantity > MAX_SPIRIT_GRANT_QUANTITY) {
     throw rejected("GM_SPIRIT_LIMIT");
    }
    spirits.grant(role, configId, quantity, ThreadLocalRandom.current());
   } else if (items.get(configId).path("type").asInt() == 11) {
    if (configId != 900401) {
     throw rejected("GM_UNSUPPORTED_ITEM_TYPE");
    }
    tavernPoints.creditForDevelopment(role, quantity);
   } else if (timedIds.contains(configId)) {
    if (quantity > 100) {
     throw rejected("GM_TIMED_LIMIT");
    }
    long now = clock.epochSeconds();
    for (int index = 0; index < quantity; index++) {
     timed.grantOne(role, configId, now);
    }
   } else if (walletCurrency) {
    roles.creditCurrency(role, configId == GOLD_ITEM ? quantity : 0, configId == DIAMOND_ITEM ? quantity : 0);
   } else {
    inventory.credit(role, configId, quantity);
   }
  }
  jdbc.update("INSERT INTO game_gm_grant(role_id,request_id,kind,config_id,quantity) VALUES (?,?,?,?,?)",
      role, requestId, kind, configId, quantity);
  return result;
 }

 /** 设置角色等级并将本级经验归零，不触发升级赠钻；重放只返回原回执。 */
 @Transactional(isolation = Isolation.READ_COMMITTED)
 public Adjustment setRoleLevel(String token, String requestId, int level) {
  return adjust(token, requestId, AdjustmentKind.ROLE_LEVEL, level);
 }

 /** 设置下一次挑战的全局关卡，写入目标之前的通关进度，不代打或发奖。 */
 @Transactional(isolation = Isolation.READ_COMMITTED)
 public Adjustment setChapter(String token, String requestId, int stage) {
  return adjust(token, requestId, AdjustmentKind.CHAPTER, stage);
 }

 /** 在当前角色锁内保存进度和回执；同一请求不能改参数或覆盖更晚的成功操作。 */
 private Adjustment adjust(String token, String requestId, AdjustmentKind kind, int value) {
  requireEnabledRequest(requestId);
  String role = authorizeAndLock(token);
  var previous = jdbc.query(
      "SELECT kind, target_value FROM game_gm_adjustment WHERE role_id=? AND request_id=?",
      (row, index) -> kind.name().equals(row.getString(1)) && value == row.getInt(2), role, requestId);
  var result = new Adjustment(requestId, value);
  if (!previous.isEmpty()) {
   if (!previous.getFirst()) {
    throw rejected("GM_REQUEST_CONFLICT");
   }
   return result;
  }
  applyAdjustment(role, kind, value);
  jdbc.update("INSERT INTO game_gm_adjustment(role_id, request_id, kind, target_value) VALUES (?,?,?,?)",
      role, requestId, kind.name(), value);
  return result;
 }

 /** 将领域的拒绝原因转换成 GM 业务码，其他失败按原事务规则回滚。 */
 private void applyAdjustment(String role, AdjustmentKind kind, int value) {
  switch (kind) {
   case ROLE_LEVEL -> {
    try {
     roles.setDevelopmentLevel(role, value);
    } catch (IllegalArgumentException error) {
     throw rejected("GM_INVALID_LEVEL");
    }
   }
   case CHAPTER -> {
    switch (chapters.setDevelopmentStage(role, value)) {
     case INVALID_STAGE -> throw rejected("GM_INVALID_CHAPTER");
     case PENDING_SETTLEMENT -> throw rejected("GM_CHAPTER_PENDING");
     case APPLIED -> { }
    }
   }
  }
 }

 /** 校验本机开发开关与持久幂等键，拒绝不完整的客户端请求。 */
 private void requireEnabledRequest(String requestId) {
  if (!enabled) {
   throw rejected("GM_DISABLED");
  }
  if (requestId == null || !requestId.matches("[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}")) {
   throw rejected("GM_INVALID");
  }
 }

 /** 获取当前角色写锁；等待中退出的会话不再能修改旧角色。 */
 private String authorizeAndLock(String token) {
  String role = sessions.requireRole(token);
  roles.lock(role);
  sessions.requireRole(token);
  return role;
 }

 /** 读取构建时打包的共享配置，缺失拒绝启动。 */
 private static JsonNode rows(ObjectMapper mapper,String file){try(var in=GmService.class.getResourceAsStream("/gameplay/"+file+".json")){if(in==null)throw new IllegalStateException("GM 配置缺失");return mapper.readTree(in).path("rows");}catch(java.io.IOException e){throw new IllegalStateException(e);}}
 /** 生成稳定业务错误码。 */
 private static ResponseStatusException rejected(String code){return new ResponseStatusException(HttpStatus.BAD_REQUEST,code);}
}
