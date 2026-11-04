/** 本机开发 GM：服务端配置校验、持久幂等与事务提交后同步；生产环境不装配。 */
package com.funsgamex.mxzg.gm;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.context.annotation.Profile;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import tools.jackson.databind.*;
import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.hero.*;
import com.funsgamex.mxzg.inventory.*;
import com.funsgamex.mxzg.network.AssetSyncService;
@Service @Profile("local & !production")
public class GmService {
 /** 服务端显式开关，默认关闭。 */
 private final boolean enabled;
 /** 当前连接身份验证入口。 */
 private final SessionService sessions;
 /** 角色锁与钱包唯一写入口。 */
 private final RoleRepository roles;
 /** 发放回执与资产使用同一数据库事务。 */
 private final JdbcTemplate jdbc;
 /** 普通库存写入口。 */
 private final InventoryService inventory;
 /** 逐件期限库存写入口。 */
 private final TimedInventoryService timed;
 /** 递增资产版本并提交后同步。 */
 private final AssetSyncService sync;
 /** 英雄初始属性校验规则。 */
 private final HeroGrowthRules growth;
 /** 持久英雄容量查询。 */
 private final HeroCapacityService capacity;
 /** 英雄新增后在同事务内更新永久解锁。 */
 private final com.funsgamex.mxzg.lineup.MainFormationStateService formations;
 /** 启动加载的可信配置索引，不存玩家资产。 */
 private final Map<Integer,JsonNode> heroes=new HashMap<>(),items=new HashMap<>();
 /** 需要逐件发放的期限配置 ID。 */
 private final Set<Integer> timedIds=new HashSet<>();
 /** 成功回执；资产仍由 state.changed 更新。 */
 public record Result(String requestId,String kind,int configId,int quantity) {}
 /** 注入现有资产服务并读取同源策划配置。 */
 public GmService(@Value("${mxzg.gm.enabled:false}") boolean enabled,SessionService sessions,RoleRepository roles,JdbcTemplate jdbc,InventoryService inventory,TimedInventoryService timed,AssetSyncService sync,HeroGrowthRules growth,HeroCapacityService capacity,com.funsgamex.mxzg.lineup.MainFormationStateService formations,ObjectMapper mapper) {
  this.enabled=enabled;this.sessions=sessions;this.roles=roles;this.jdbc=jdbc;this.inventory=inventory;this.timed=timed;this.sync=sync;this.growth=growth;this.capacity=capacity;this.formations=formations;
  for(var row:rows(mapper,"herotype"))if(row.path("type").isIntegralNumber())heroes.put(row.path("type").asInt(),row);
  for(var row:rows(mapper,"item"))if(row.path("idx").isIntegralNumber())items.put(row.path("idx").asInt(),row);
  for(var row:rows(mapper,"timelimititem"))timedIds.add(row.path("item_id").asInt());
 }
 /** 查询实际服务端开关，不能由客户端开启。 */
 public boolean enabled(){return enabled;}
 /** 当前角色行锁内原子发放和保存回执；同请求不重复发放，复用 ID 改参数拒绝。 */
 @Transactional public Result grant(String token,String requestId,String kind,int configId,int quantity) {
  if(!enabled)throw rejected("GM_DISABLED");
  if(requestId==null||!requestId.matches("[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}")||quantity<1||quantity>9999||configId<=0)throw rejected("GM_INVALID");
  if(!Set.of("hero","item").contains(kind))throw rejected("GM_INVALID");
  String role=sessions.requireRole(token);roles.lock(role);
  var result=new Result(requestId,kind,configId,quantity);
  var previous=jdbc.query("SELECT kind,config_id,quantity FROM game_gm_grant WHERE role_id=? AND request_id=?",(r,n)->new Result(requestId,r.getString(1),r.getInt(2),r.getInt(3)),role,requestId);
  if(!previous.isEmpty()){if(!previous.getFirst().equals(result))throw rejected("GM_REQUEST_CONFLICT");return previous.getFirst();}
  if(kind.equals("hero")) {
   var rule=heroes.get(configId);if(rule==null||quantity>20)throw rejected("GM_INVALID_HERO");
   int star=rule.path("star").asInt();growth.stats(configId,star,1,0);
   int owned=jdbc.queryForObject("SELECT COUNT(*) FROM game_hero WHERE role_id=?",Integer.class,role);
   if((long)owned+quantity>capacity.current(role).capacity())throw rejected("GM_CAPACITY_FULL");
   for(int i=0;i<quantity;i++)jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star) VALUES (?,?,?,1,?)",UUID.randomUUID().toString(),role,configId,star);
   formations.refresh(role);
   sync.changed(role);
  } else {
   if(!items.containsKey(configId))throw rejected("GM_UNKNOWN_ITEM");
   if(timedIds.contains(configId)){if(quantity>100)throw rejected("GM_TIMED_LIMIT");for(int i=0;i<quantity;i++)timed.grantOne(role,configId,java.time.Instant.now().getEpochSecond());}
   else if(configId==900001||configId==900002)roles.creditCurrency(role,configId==900001?quantity:0,configId==900002?quantity:0);
   else inventory.credit(role,configId,quantity);
  }
  jdbc.update("INSERT INTO game_gm_grant(role_id,request_id,kind,config_id,quantity) VALUES (?,?,?,?,?)",role,requestId,kind,configId,quantity);
  return result;
 }
 /** 读取构建时打包的共享配置，缺失拒绝启动。 */
 private static JsonNode rows(ObjectMapper mapper,String file){try(var in=GmService.class.getResourceAsStream("/gameplay/"+file+".json")){if(in==null)throw new IllegalStateException("GM 配置缺失");return mapper.readTree(in).path("rows");}catch(java.io.IOException e){throw new IllegalStateException(e);}}
 /** 生成稳定业务错误码。 */
 private static ResponseStatusException rejected(String code){return new ResponseStatusException(HttpStatus.BAD_REQUEST,code);}
}
