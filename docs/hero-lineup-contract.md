> 当前主线阵容保存已使用WS＋Protobuf接入。下方早期HTTP合同仅为历史参考，不得恢复；英雄升级、战斗、挂机及其他阵容模式仍暂停。

# 英雄与主阵容：第一批接口与复用边界

> 当前这些玩法入口已暂停，旧 HTTP 合同不再提供；本文保留原规则/资源参考，恢复时采用新的 WS＋Protobuf 模板。

## 2026-11-02 普通升级（当前契约）

本节优先于后文历史“仅只读英雄/养成未接入”。只开放实例单次普通升级，不含突破、升星、装备或技能。客户端英雄列表点击自己的英雄进入已有 HeroInfoUpLevelLayer；HeroInfoUpgradeLayer 是突破窗口，本批不接入。英雄和资产仍归原名册、AccountModel、BagModel 所有。

### 规则与来源

只读旧服 server/mxzg-server.git HEAD 672293145b4da0f87b87bad9826432e04d6402c0、旧端 client/cocos_mxzg.git HEAD 6276cbe47b939ce161aaefaa93bb6f83a0a253af。路径均相对旧仓库；未引入旧业务框架。

| 项目 | 采用规则 | 精确来源 |
| --- | --- | --- |
| 实例/次数 | 会话角色自己的英雄 UUID；固定 +1，不接收模板替代实例或客户端成本 | 旧服 module/hero/handler/HeroHandler.heroUpLevel（gameserver 模块）；旧端 layer/heroinfo/HeroInfoUpLevelLayer.lua 的 GReqHeroUpLevel；本批限制为一次一级 |
| 消耗 | 当前等级行 herolevel.exp_need/gold_need；英雄经验库存 900101、金币钱包 900001；不是角色经验 900003 | HeroHandler.heroUpLevel 的 level+i 循环与 thingService.cost；旧端同窗口成本展示；当前 herolevel.xlsx 字段 |
| 等级限制 | 当前等级 < heroupgrade 最后等级阈值 140 时用自身 stage 的 level；否则用 herostar.level_limit | HeroHandler.heroUpLevel；heroupgrade.xlsx、herostar.xlsx。新英雄 stage=0、level=1；0 阶最多 30，不能因 1 星上限 40 而越过突破 |
| 初始阶 | 持久 stage=0；旧已存英雄迁移补 0，本批只在专用测试库验证，不迁移玩家库 | HeroService.createHero(rid,type) 调用 (rid,type,0,0,0)；V4 |
| 角色等级等 | 普通升级 handler 没有角色/world 等级或品质附加条件；herostar 的角色条件属于其他成长，不套用到普通升级 | HeroHandler.heroUpLevel 与独立 heroUpgrade 分支对照；当前仅初始英雄，特殊魔方英雄未开放 |
| 基础/成长 | herobase 按 type+star；heroupgraderate 按 hero_id+grade；差值 d=level-heroupgrade.begin_level | template 模块 module/battle/BattleTemplate.convertFrom；旧端 data/HeroData.getHeroAttribute；当前三张同名 xlsx |
| 取整 | hp/atk=截断(base×rate/10000 + base×d×grow/10000)；def/spd 先截断基础倍率项再加成长并截断；倍率不是加上 10000 | BattleTemplate.convertFrom、battle 模块 util/AttributeUtil.addPercent/calPercent；旧端中间浮点展示不代替服务器取整 |
| 战斗 | 玩家使用持久阶、等级和星级的同一四属性；NPC 取 begin_level≤等级的最高阶。基础攻击战斗仍不包含技能/装备加成 | BattleTemplate.convertFrom、HeroUpGradeSysCache；当前 HeroGrowthRules 与 CampaignService.unit 共用 |

2026-11-02 五张源表与全部导出行逐项一致：herolevel 400、heroupgrade 7、heroupgraderate/Sheet1 791、herobase 1582、herostar 14。当前最小普通升级无需要另定的实质规则冲突。初始 10101001 从 1→2：金币 53、英雄经验 12，hp/atk/def/spd 从 238/56/24/45 到 253/59/25/46。未接入突破，30 级明确提示上限，不能静默跳过。

### 请求、并发与重试

- GET /api/v1/heroes/{heroId}/level-up：Bearer 鉴权，返回 hero、stage、levelLimit、current/next 四属性、cost(gold/experience)、持有 gold/experience、status、configVersion。满级 next/cost=null。
- POST 同路径：`{"requestId":"UUID","expectedLevel":1}`；固定 +1，不接受可信消耗或属性。
- 成功返回 operation 原操作收据（requestId、heroId、fromLevel、toLevel、configVersion），以及 preview、heroes、role、inventory **当前事务内最新完整快照**。重复标识返回原收据及最新状态，而不是旧资产快照。
- 角色行锁串行化升级与其他资产写；expectedLevel 过期返回 409 HERO_LEVEL_CHANGED。同一角色/请求键跨重启只执行一次；同键不同英雄/原等级 409 IDEMPOTENCY_CONFLICT。V4 的 game_hero_level_request 存收据，扣金币、扣 900101、等级及收据同事务，失败全部回滚。
- 401 无效/过期会话；404 HERO_NOT_FOUND 统一隐藏他人实例；400 INVALID_UPGRADE_REQUEST；409 LEVEL_LIMIT、INSUFFICIENT_GOLD、INSUFFICIENT_HERO_EXP；503 HERO_CONFIG_UNAVAILABLE。缺配置不按零消耗继续。客户端不显示原始异常正文，仅映射稳定错误码。
- HeroLevelController 使用 BagController.runInventoryUpdate 串行资产入口，提交前后作废旧英雄查询；完整库存/钱包/英雄提交后才通知 UI。关闭页面不取消会话操作；换号作废旧回包。超时保留原 requestId，按钮“确认上次升级”允许在最新余额不足/满级时确认原操作，不误发新升级。
- 当前仍沿用现有手写 DTO + 运行时校验；没有宣称 OpenAPI 自动生成已完成。维护入口：HeroGrowthRules、HeroLevelService/Controller、HeroLevelApi/Controller、HeroInfoUpLevelLayer.ts 与同名 Prefab。

### 验证范围

正常首胜奖励足够升级：金币 4000、900101=550；升一级后 3947/538，无须改奖励或合成充值。H2 与独立 MySQL HTTP 已覆盖奖励→升级→第二次战斗→独立 JVM 重启/重登；第二关真实战败保留，不要求制造胜利。客户端页面验收与后端链分开，最终实际状态见 development-progress.md。


更新：2026-10-29。对应 P3-02、P4-01/P4-02/P4-03，当前为实现中的最小契约。客户端只读英雄列表已接入现有 Prefab，视觉与三端运行待验收；接口类型生成尚未完成。

## 2026-10-30 更新（优先于下方历史状态）

- Start 后的一次性服务器初始化会为无英雄角色发放三名初始英雄并保存默认阵容；开发登录本身不发英雄。已存在英雄/阵容保留，初始化可并发重试。
- 客户端已通过独立 LineupApi / FormationController / FormationView 接通出阵读取、元素筛选、上阵/撤下及 PUT 版本保存；复用 FormationView 与 HeroIconCellView，不写旧 GameStore/WireSession。
- 挂机页点击战斗必须先打开出阵；空阵容不可确认，确认保存成功后才创建服务器主线战报。取消不保存；保存期间拦截连点/取消；409 或不确定的保存结果必须重新读取，不覆盖其他操作。
- 基础主线结果领取后返回挂机，挂机人数与当前服务器阵容一致。完整解锁/阵法/助阵、技能与养成尚未完成；独立 MySQL 已有历史验证，三端仍待验收。
- Formation 检查覆盖 PUT 契约、草稿不提前写、空阵容、防重复提交、保存中取消与版本冲突；实际 H5 点击已验证取消/保存、主线和返回。下方“出阵未接入”描述为 10 月 29 日历史批次状态。

客户端分层以 [模块级 MVC 基线](architecture.md) 为准。英雄名册已迁移 HeroRosterController/HeroRosterModel，列表已使用 SuperScroll；阵容仍待迁移。下列 HTTP 接口是当前实现契约，WebSocket 迁移前继续有效，不能先删接口破坏可运行基线。

## 原英雄/阵容接口（继续有效）

四个接口都需要 `Authorization: Bearer <accessToken>`。角色从服务端会话确定，不接受客户端指定别人的 roleId。

- `GET /api/v1/heroes`：返回当前角色的英雄数组；新角色目前返回空数组，不在登录时伪造或赠送英雄。
- `GET /api/v1/heroes/{heroId}`：读取自己的英雄；不存在或属于别人统一 404。
- `GET /api/v1/lineups/main`：返回主阵容 version 与 slots；初始值为 version=0、slots=[]。
- `PUT /api/v1/lineups/main`：按 expectedVersion 替换完整主阵容，返回保存后的快照。

HeroProfile 字段为 id（英雄实例 UUID 字符串）、templateId（配置类型整数）、level、star（正整数）。当前没有战力、技能等级、装备等字段，不应由客户端补造。列表当前按实例 ID 排序，未做分页。

英雄实例 UUID 与旧协议的数值 hero_id 是不同类型，不能把 templateId 当成实例 ID，也不能把 UUID 强转成数字塞进旧 GameStore。

## 保存示例

```json
{
  "expectedVersion": 0,
  "slots": [
    { "position": 2, "heroId": "00000000-0000-4000-8000-000000000001" }
  ]
}
```

示例 UUID 只是字段形状，实际必须是该角色拥有的数据库英雄。响应的 slots 按 position 升序，version 在有实际变更时递增；空 slots 明确表示撤下全部英雄。

- 校验失败返回 400：缺字段、null 条目、错误 UUID、重复站位/英雄、非拥有英雄、非法站位。
- 小数和字符串不会自动转换成整数字段；请求 JSON 的数值类型必须正确。
- 未提供/失效会话返回 401；英雄不可见返回 404；expectedVersion 过时返回 409。
- 同一版本的并发写入只有一个可以改变状态；过时请求不会覆盖已保存阵容。
- 版本正确且阵容内容相同的保存不重复增加版本。
- 超时后先 GET 确认当前快照；409 后重新读取并让用户确认，不盲目重试旧请求。当前没有单独的幂等请求键。
- 保存先完成结构、版本和拥有权检查，再在同一事务中替换槽位和更新版本。数据库同时约束一个英雄不能占两个位置、不能跨角色引用英雄。

## 当前站位政策与旧规则证据

当前最小主阵容接受 2、3、5、6、7、8、9，对齐已有真服路径 wireLineUpSave.ts 的阵法 1 映射；最多七项。旧 Mock 的 localLineup 有“最多八个”的另一套行为，不作为新服务端规则来源。

日服 LineupData.lua 将返回英雄按 position 索引并补齐空槽，支持“实例和站位分离”的数据结构。此次没有宣称已验证其他阵法、助阵、站位解锁、所有模式限制或旧服战斗数值；这些仍需规则样本与配置对照。battleformation 的 idx 是模式相关配置，不能未经核对当作格子编号。

以下为 2026-10-29 历史范围，已由初始化及普通升级新节部分替代：新手赠送、召唤、养成和配置模板绑定当时还没有业务入口。测试种入的英雄仅存在于隔离 H2 测试库，不写入用户 local 数据库，不开放客户端任意发英雄接口。

## 持久化与维护入口

- hero/HeroController、HeroRepository、HeroProfile：身份隔离的只读英雄数据。
- lineup/LineupController、LineupService、LineupRepository、Lineup：版本与站位策略、事务写入、DTO。
- Flyway V2：game_hero、game_lineup_slot，以及 game_role.lineup_version；不改已执行的 V1。
- local CORS 增加 PUT，继续只允许已有两个 Creator 本地来源。
- 测试 HeroLineupTest：新角色空数据、拥有权、非法输入不修改已有阵容、重登、版本冲突、并发、真实 HTTP、PUT 预检及 V1→V2 迁移保留数据。

H2 验证不能替代 MySQL。独立 MySQL 已覆盖阵容并发、升级/领奖回滚和进程重启，证据见 [开发进度](development-progress.md)；正式身份和生产容量仍待验收。

## 当前客户端数据与界面

- HeroApi：校验英雄列表/详情响应，区分实例 UUID 和模板 ID。
- HeroRosterModel：模块唯一不可变名册及同步状态，不持有 token 或派发事件。
- HeroRosterController：应用 initialize/dispose，负责鉴权读取、请求去重、会话/查询代次与名册事件；页面关闭不销毁模块。原 HeroRosterService 已删除。
- AccountService.authenticated：统一会话校验，旧角色 401 不清除新角色。
- HeroListView：开页监听 HeroRosterEvent.Updated，关页解除本页监听；SuperScroll/SuperContent 维护列表布局和 Cell，固定参数在 HeroListBoardView.prefab。
- HeroLevelController：会话级升级请求与不确定结果确认，通过 BagController 提交关联钱包/库存/英雄快照。
- HeroInfoUpLevelLayer：当前点击英雄打开的普通升级窗口；HeroInfoView 是未接入旧详情，列表上的无效 infoPrefab 绑定已清理，二者 UUID 不重复。
- FormationController/FormationView：已有草稿/版本保存行为，尚待模块职责和 SuperScroll 迁移。取消不保存、冲突重读的规则保留。

主城通过 RemakeNavigation/HomeFeatureNavigation 管理页面意图和关闭取消；不恢复旧 Boot/GameStore/WireSession。HeroResources 按需加载列表资源，普通升级资源在实际开窗时加载。服务器 Start 初始化会为无英雄角色发放三名初始英雄；开发登录本身不发放。

现有 hero、hero-roster、hero-level、formation、formation-view 检查分别覆盖列表、名册、升级及阵容边界，历史结果不等于本次运行。真实长名册、更多尺寸和完整英雄详情仍待验收。契约生成/漂移检查尚未完成，新通信契约须同时解决该缺口。

## 2026-11-04 主线阵容规则核查与基础实现

前批共享战斗输入已提交本机main：`c3e0d82d`，未推送。本批新增MainFormationRules纯规则；尚未替换历史LineupService.save，尚未开放阵容网络协议/页面，不把保留领域测试当作原版规则已全部接入。

旧源码根目录：G:/work/FsGame/Demo/mj/program。以下路径位于server/mxzg-server：

| 核查项 | 证据 | 当前结论 |
|---|---|---|
| 实际配置 | mxzg-config/.../excel/cache/BattleMatrixSysCache.getFileName；gameserver/.../battle/service/FormationService | 读取battlematrix（8行）及battlematrixaddition（72行），不是另一张formation（9行）；两表门槛不同，不混用 |
| 基础阵型 | FormationService.getFormation | 阵型1默认解锁，即使空名册也保留；battlematrix六星条件对应阵型2 |
| 永久解锁 | FormationService.checkUnLockFormation、battle/domain/Formation；config/struct/UnlockCondition | 登录/升星检查星级>=阈值、元素包含及数量，已解锁ID只增加；不能因消耗英雄取消 |
| 助战 | hero/service/HeroService.assistanceUnlock与selectHeroListBy；HeroObserver、RoleObserver；RoleConst与system表 | 至少6名十星及以上英雄实例；不按模板去重计数。持久assistanceUnlock一旦true不回退；9号位未解锁则跳过 |
| 保存顺序 | hero/service/HeroLineUpService.saveLineUpFormation | 未知/未解锁阵型拒绝；未知位置拒绝；关闭位跳过；已接纳位置重复拒绝；助战未解锁跳过；非所属英雄跳过；同模板后续英雄跳过；等级不足拒绝 |
| 主线等级 | config/struct/LineUpType.MAIN=0与battleformation[0] | 主线最低英雄等级1；不要将其他玩法等级限制混入主线 |
| 站位属性 | battlematrixaddition | 基础阵型2/3位减伤291=300，5位生命102=300，6位205=500，7/8位攻击201=300；9位无加成，1/4位关闭。保留全部编号，战斗应用时序还需接线 |

实现提供unlock(previous,heroes)、normalize(formation,unlocks,owned,requested)和position查询。永久语义通过显式previous输入保留；调用方后续必须持久化结果，本批没有用“每次从当前名册重算”代替持久解锁。normalize按请求顺序处理同模板，只返回不可变副本，不清理/改写当前阵容。严格缺表/引用校验，使用真实配置测试默认阵型、六星阈值、六名十星边界、解锁保持、同模板/助战/归属/等级、重复站位和不可变属性。

下一批：持久保存选中阵型、已解锁ID及助战状态；在登录/合法英雄变化的现有事务中更新，并统一revision同步。之后迁移保存协议与Model/View。旧LineupService固定位置、同模板未过滤、助战无限制的历史行为不能直接对外开放。对现有测试阵容迁移需保留数据并单独验收，不通过清库解决规则差异。升级、穿脱、其他模块维持关闭。

本轮后端80/80通过，日志backend/target/main-formation-rules-test.log；其中新增4项真实配置规则测试。本批无迁移、无前端/协议变更，未重跑MySQL或画面、未重启日常后端、未修改玩家资产；规则批次尚未提交。

## 2026-11-04 V14永久阵型状态与统一同步

规则批次已提交`b1261431`。本批新增game_role.main_formation_id默认1、assistance_unlocked默认false，以及game_formation_unlock的角色/阵型唯一记录；基础阵型1隐式永久解锁，不为每次登录重复写默认行。迁移保留原game_lineup_slot和阵容版本，不删除或重新排列历史站位。

MainFormationStateService.refresh必须在现有事务中执行并持有角色行锁。它在旧持久集合上只追加解锁，助战仅false→true；新增时调用AssetSyncService.changed，同角色同事务仅一次资产revision及提交后通知。无变化不写、不递增版本。统一登录/恢复快照执行检查，当前已开放的GM英雄发放在同一发放事务内检查；以后正式升星/获取英雄需复用此入口，不能在客户端推算或仅依赖重连补齐。历史领域服务仍暂停，不将其视为已迁移完成。

Snapshot.main_formation使用新字段7：formationId、unlockedIds、assistanceUnlocked、阵容version和slots。缺失表示未同步；角色/背包/英雄/阵型在应用层先整包校验，再由HeroRosterController.onNotify提交同一HeroRosterModel并通知。阵型只读状态暂归英雄模块，未创建第二份阵容缓存；换号/退出一起清空。不增加查询或保存协议，不开放UI入口。

客户端拒绝非法/重复解锁、选中未解锁阵型、非法版本、重复站位或实例、跨角色英雄；保留真实历史站位（包括尚待后续保存规则整改的同模板/助战配置），不在快照中偷偷归一化。服务端选中未解锁/未知阵型明确拒绝，不替换成默认值。

本轮H2后端83/83、前端hero-state和game-socket、两组类型与协议生成检查通过；含事务回滚、永久解锁保留、无事务拒绝、角色隔离、重复快照revision不变及Protobuf往返。独立MySQL18/18通过，run=9dfe3a64d6a943b78e77814538627dca，state=stopped，日志backend/target/formation-state-mysql.log；覆盖V14迁移、选中阵型重启和英雄减少后永久解锁不回退；无新增可见界面，未重跑Creator画面。日常后端未更新，日常玩家库未迁移；本批尚未提交。

下一批先将持久阵型和规则接到阵容保存事务，再实现WS请求、持久幂等/并发版本、统一推送与页面；保存前后的旧站位差异需明确记录。共享战斗输入仍有战斗专属属性/触发等pending，不能直接开放简化战斗。

## 2026-11-04 主线阵容最小保存闭环

用户已确认上一批Creator页面验收，本批直接恢复主线阵容。旧规则依据仍为HeroLineUpService.saveLineUpFormation（270～399行）：按请求顺序跳过关闭位、未解锁助战、缺失/非所属英雄及同模板后续项，未知位置/未解锁阵型/等级不足拒绝；归一化后空阵拒绝。不将客户端草稿当服务器资产。

协议formation.save使用Frame的新字段22/23：FormationSave(requestId,expectedVersion,formationId,slots) → FormationSaved(requestId,version)。MainFormation新增options字段6，由同源阵型表及永久助战状态下发当前允许位置，不让客户端复制配置规则。协议目录、两端Codec和生成代码已同步，无HTTP或查询回退。

MainFormationCommandService使用现有角色行锁；先查V15的game_formation_save回执，再检查阵容版本和原版归一化。相同请求返回原版本，不重复修改；同键换参数拒绝。选中阵型和站位同事务写入，有实际变化才递增阵容版本并调用AssetSyncService.changed，同事务仅一次资产revision。无变化保存只写回执；回滚不留回执、站位或推送。旧LineupService仍用于暂停的历史领域测试，不作为新WS入口。

HeroRosterController仍负责统一state.changed/登录恢复中的唯一Model。FormationController只持有页面草稿和未确认请求，接收FORMATION_SAVE回执后等待Model达到确认版本；不写Model、不持有账号/凭证、不查询英雄或阵容。断线不自动重放，页面确认可原样重试；关闭/换号后不绘制迟到回包。版本冲突使用已恢复的权威状态重新选择；同阵容版本下名册新增或属性变化更新可选英雄，同时保留草稿。

入口为英雄列表原布阵按钮，UIManager弹出FormationView。选英雄后点击允许位置放置，无选中英雄时点击位置撤下；阵型按钮循环已解锁阵型，确认后才保存。SuperScroll＋SuperContent保存五列格子布局，专属FormationHeroCellView继承通用显示组件，0.85缩放保存在同名Prefab，不运行时手排坐标或改content高度。英雄菜单层级已修正，避免被名册底板盖住。

本次实际验证：后端88项通过，独立MySQL19项通过（包含V15、同回执应用重启恢复）；前端formation-state覆盖草稿隔离、真实协议路由、等待统一同步、原请求重试、同版本名册刷新、关闭和换号；formation-view读取真实Prefab验证Inspector值、两列临时布局参数及损坏绑定。独立内存预览run=3f05bc64554b495b93edc9ad6b423363，实际完成版本0→1、移动至7号位并切阵型2后版本2、刷新重登恢复、未保存关闭重开保持旧数据，警告/错误0。仅本次合成账号，宿主已停止；没有更新日常数据库或开启其他玩法。

证据：[保存完成](images/formation-save-20261104.png)、[刷新恢复](images/formation-recovery-20261104.png)。截图仅证明当前393×852预览中的操作，不替代完整正式服视觉或小游戏真机验收。

下一批：让共享战斗输入消费持久选中阵型及站位加成，再对照旧版补技能/状态处理与战斗入口；本批不直接开放原简化普攻战斗。

## 2026-11-04 模块与页面解耦

上一节的页面控制器结构已收整：FormationController不再拥有View、catalog、selected、草稿或页面show/close。它继承BaseController，应用单例初始化一次，按真实FORMATION_SAVE回执更新FormationSaveModel并发事件；权威阵容仍由HeroRosterController更新唯一HeroRosterModel。

FormationView在onOpen读取这两个Model，绑定自己的按钮并维护草稿；同版本名册变化保留草稿，服务器阵容版本变化载入最新状态。onClose只解除本页监听，关窗期间保存仍由模块完成；未确认请求可跨窗口重开重试。换号/退出由AssetStateBinding先关闭旧角色页面再统一resetSession；请求成功及失败是否交付由应用的AccountService.deliverAuthenticated决定，模块和页面不再比较会话代次或角色键。

此处会话隔离只阻止旧角色结果更新当前客户端状态，不撤销已提交的服务端保存，也不把关窗视为换号；这是通信异步边界，不是新增玩法规则或已发现串号故障的描述。


## 2026-11-04 战斗输入接入阵型与站位加成

旧源码依据：gameserver/module/battle/receiver/FormationReceivers.java的setAttribute按HeroLineUp.formationId和HeroDo.position读取BattleMatrixAddition.ability，再调用AttributeInfo.addAllAttribute，并把阵型ID写入QueryBattleCommand/CreateBattlerCommand。AttributeInfo.addInitAttribute按属性编号累加，百分比在后续战斗计算中使用。

新版HeroBattleInputService在现有角色锁事务内读取MainFormationStateService.current，Input新增formationId，lineupVersion和assetRevision保留。复用MainFormationRules的已解析站位配置，先按保存规则验证持久阵容；若需要过滤关闭位、未解锁助战、缺失英雄或同模板重复项则拒绝，不在读取时默默修复、保存或递增版本。空阵保持空，待挑战入口决定是否允许发起战斗。

属性由基础、装备、技能和进化重新组装，再加入当前阵型/位置的原始属性；每次读取新建不可变结果，不使用上次战斗输入或四维面板作为基础。英雄快照中的panelStats保持原面板语义。本批使用的旧表例子：阵型1位置2/3为291最终减伤300，位置5为102生命比例300，位置6为205治疗比例500，位置7/8为201攻击比例300；阵型2位置2为291最终减伤800；助战9号位合法且无阵型属性。

已移除pending中的formation_unlock_and_template_limits。灵魂技能/天赋/符文/觉醒、账号与队伍来源、战斗特殊属性与触发仍列为缺口，不将本批输入标成完整战斗能力。本批无协议、迁移、客户端或玩法入口变更。


## 2026-11-04 战斗属性折算与技能触发核查

上一批阵型/站位加成已本机提交10555373。本节以旧mxzg-battle源码为依据，区分已落地的输入规则与尚待恢复的执行链。

### 已固化的入场属性规则

依据model/AttributeInfo.java的initMaxHp、getRate、getAttribute，以及util/FightUtil.java实际攻击读取点：

| 属性 | 旧计算顺序 |
| --- | --- |
| 普通新战斗初始HP和MAX_HP | `(long)(rawHP * (1 + hpPercent / 10000D))`，生命比例不封顶50000 |
| 攻击、防御、速度 | `(long)(raw * (1 + min(percent, 50000) / 10000D))`，只折算一次 |
| 负比例 | 旧getRate没有零下限，不自行夹到0；此处保留数值，行动/伤害限制由后续规则处理 |
| 取整 | Java double计算后向零截断，不改成四舍五入或整数除法；超出long范围明确拒绝 |

旧AttributeInfo.getAttack还有一次攻击比例折算，但本次核对的伤害入口FightUtil与AbstractBaseDamageBuffHandler使用getAttribute(ATTACK)，不能仅凭方法名称调用getAttack并重复加成。HeroBattleAttributeUtils只提供普通满血入场的基线，不处理固定血量回放、续战当前血量、动态最大生命、一次性属性消费或临时Buff。

Unit新增opening与skillSchedule；attributes保留全部原始编号，HeroProfile.panelStats仍独立。opening每次从该次原始属性新建，不能再次作为原始属性参与折算。技能元数据从HeroSkillPanelRules已有精确type/level索引解析，按进化覆盖后的引用取值，不复制配置加载器。

### 已固化的技能候选排期

依据model/SkillDo.java:isCanRelease、model/SkillInfo.java:createOf/getSkillBy、model/HeroDo.java:getSkill：active_type为0被动、1主动、2普攻、3光环，不能颠倒主动与普攻。主动按已有列表顺序选第一个可释放项；无可释放主动则普攻。追加行动优先于“只能普攻”，后者优先于正常排期；候选选择不等同于允许行动。

可释放条件是`(currentRound - initialRound) % (coolRound + 1) == 0`；配置initial_round为0时使用实例初始回合，普通英雄实例为0。真实技能101050081等级5配置初始1、冷却3，因此回合1/5/9命中。旧方法没有`currentRound >= initialRound`保护，负差整除也会命中；本批忠实保留并增加特征测试，不能作为“修复”自行改变规则。神龙实例初始回合仅在工具参数中支持，本批不恢复神龙玩法。

### 已核对、尚未实现的执行/触发链

- BattleService.executeRound：助战效果、回合加成、回合开始/固定回合/按回合治疗、死亡回合处理、移除Buff、女神/神龙行动、英雄行动、回合结束。
- 英雄行动：先选候选技能，再BT_BEFORE_ACTION，再HeroDo.canAttack。死亡直接禁止；skillEnergy=9999、先手技能和不同active_type的禁止Buff集合有独立分支，不能用一个“沉默就普攻”的判断替代。
- executeSkill按art_list顺序执行动作并restore；普通攻击/主动技能且非反击时，依次触发对应USE类型、BT_ATTACK、主动技能伤害类型事件。
- BattleTrigger.trigger在被触发者为空或封印时返回；监听Buff排序后逐项执行并restore。BuffDo.compareTo先执行非自身Buff；自身Buff按类型priority降序，不能按ID重排。
- 攻击侧触发涉及暴击、技能伤害类型、造成伤害、击杀；防守侧死亡分支先处理死亡触发/清理并返回，存活侧再按各事件与固定伤害条件推进。反击资格、目标选择、随机概率、Buff条件/持续时间及递归行动仍须逐处理器核对。

本批HeroBattleSkillUtils只复现候选排期，不执行上述触发，不伪造胜负、战报或奖励。pending中的battle_special_attributes_and_triggers继续保留；已有count_stats面板被动不因提供skillSchedule而再次执行。下一批优先核对并恢复行动资格与最小Buff事件状态机，再接伤害和目标选择。


## 2026-11-04 行动资格与最小Buff事件

上一批属性折算/技能排期已本机提交6614b7f5。旧依据为HeroDo.canAttack/isOnlyAttack/getSkill/restore、BuffType三个控制集合、HeroSkillSysCache.checkFirstSkill、BattleTrigger.trigger、BuffDo.isSelf/isTriggerType/compareTo、AbstractArtTriggerBuffHandler.trigger/getTarget和UseSkillBuffHandler.checkCondition。

### 行动资格

HeroBattleActionUtils沿旧编号使用只能普攻集合1001/1011/1013/1015；主动禁止1003/1004/1005/1006/1010/1012/1014，普攻另受1002缴械限制。候选选择在行动前事件之前，事件中新加沉默不会重新选择该次候选；事件中新加眩晕会在随后的资格检查阻止行动。死亡总是优先拒绝，能量9999和先手技能才可绕过控制集合。封印1007/挂机封印控制触发，不直接代替行动禁止判断。

先手不是表中默认布尔字段：沿旧HeroSkillSysCache从技能art_list到buff_list检查260号Buff。新增Skill.first，由现有配置索引解析，并随内部skillSchedule传入；不修改协议。

### 四类最小事件处理

HeroBattleEventProcessor是每场新建的内存对象，Actor只保存本场单位编号、控制集合、监听实例、中断标记及候选技能，不持有账号或数据库。支持197行动前、172使用普攻、173使用技能、170攻击后。正常流程为选候选→197→资格判断→技能执行器→172或173→170；追加行动按旧反击路径跳过使用/攻击后事件。返回true只表示本批范围的技能执行器被调用，不表示完整战斗、伤害或奖励已完成。

配置解析复用HeroSkillPanelRules已有buff/buffart索引。173仅沿旧处理器检查value0技能ID（0不限）；不根据注释擅自增加value1伤害类型条件。各监听保留art_list顺序：source_type=0使用原施加者，1使用携带者；有target配置时以携带者作为选目标上下文，无target时自身Buff沿用传入目标、外来Buff使用携带者。传给执行器的是目标上下文，不伪称已完成完整目标筛选。

监听按事件开始时的快照筛选和稳定排序：外来Buff先执行，自身其次；本批四种类型在旧枚举priority均为0，同组保留安装顺序，不按ID排序。执行期间新增/移除监听只影响后续事件，本次快照继续。封印只在该次dispatch入口判断；每个监听处理后restore只清中断标记，不清控制/Buff。战斗结束时处理器不执行后续监听动作。异常向上传播，不吞掉未实现效果。

### 本批边界

技能动作与触发动作通过必需Executor接口交付；没有默认空执行器或假伤害结果。当前已落地的是内存事件处理与行动资格，并可从真实配置解析四类触发定义；尚未自动安装所有技能Buff，未实现持续时间、叠层、别名listenType/listenType2、其他优先级类型、条件概率、完整目标筛选、物理/法术技能后事件、伤害及死亡/反击递归链。未知事件/触发类型明确拒绝，不按无效果成功处理。battle_special_attributes_and_triggers仍保留，战斗入口仍关闭。


## 2026-11-04 动作目标选择第一批

旧依据：BattleService.selectTargets、CBuffArt.isLastType、BattlerDo.getHeros，以及Self/Friend/Enemy/RemoveSelf/Survive/Position/AttackPositiveSelector。新增HeroBattleTargetUtils，HeroSkillPanelRules.battleTargets复用已有buffart索引解析真实动作；目前是动作执行前的独立规则入口，尚未接入完整技能效果执行器，不代表技能已造成伤害。

支持选择器0移除自身、1添加自身、2添加友方、3添加敌方、4按原顺序截取、10位置排序、12当前攻击降序。友敌名单由调用者按战场顺序提供；旧getHeros由战场维护存活状态，4号选择器本身不额外判死。自身选择实际也是添加，不能只按枚举注释写成筛选。配置非空时清除目标上下文；配置为空时保留；普通反击已有目标时直接保留。

目标数量仅用于支持截取的选择器，0转99；中间步骤用99。旧isLastType按类型值等于末项判断，重复出现末项类型时也会截取。位置每排4个，优先级为10×(行×10+与施法者列距)−列号，沿用TreeMap同优先级覆盖；攻击降序同值保持输入顺序。返回不可变目标列表，未知选择器整份计划拒绝，不回退为敌方默认目标。

边界：调用方须提供同一战场的单位及上下文；暂不支持死亡选择、前后排、随机、混乱/离间/挑衅改选、临时增加目标数、保存技能目标、伤害/治疗及Buff实际应用。当前没有将该子集接到开放战斗接口，battle_special_attributes_and_triggers继续保留。真实动作2114201验证[2,4,12]选友方攻击最高两名；其后续Buff效果仍未实现。


## 2026-11-04 血量条件效果前置处理

依据旧HpCheckerBuffHandler、AbstractConditionBuffHandler、HeroDo.getHpRate、AttributeUtil.calPercent和BattleService.executeBuff，新增HeroBattleConditionUtils.apply；HeroSkillPanelRules.battleHpCondition读取原218号Buff的前三个value参数。真实1083201为3000|0|0：目标血量严格小于30%才通过，等于30%失败。

比较参数0为小于，其他整数为大于等于；来源0取目标，1取施法者，其他整数取施法者阵营存活单位总血量/总生命上限，不取个人比例平均。保留旧double除法，包括0/0产生NaN后两种比较都失败。条件失败调用同一个Actor.interrupt(targetId)，通过不清已有中断；既有事件处理器在监听结束后restore清理中断。

这是效果处理中的条件分支，不是完整动作执行器：调用前仍须由动作层检查命中、既有中断、非英雄和死亡执行限制。工具不读取数据库、不改血量，不自动执行buff.art_list。旧1083201的后续动作1083301以及所属1083101整组动作尚未恢复，不得将条件解析/通过宣称为该技能成功。当前命中概率、效果递归、伤害、治疗和战报仍有缺口，战斗入口保持关闭。


## 2026-11-04 首个实际治疗动作

HeroBattleHealingExecutor实现既有Executor.art，以真实1063201为验收案例：buffart.target=[1]、buff_list=[1063201]，130号Buff按当前施法者攻击的5000/10000治疗自身。HeroSkillPanelRules.battleHealing预检整组配置，限定必中特效、effecttype=0、round=0、无后续art_list，目标选择继续复用已核对规则；不支持的类型整组拒绝。

依据旧ReplenishHpBuffHandler、AbstractReplenishBuffHandler、BattleContext.replenish、HeroDo.replenish、AttributeUtil和BattleService.executeBuffArt。计算顺序为基础攻击比例治疗（向零取整）→加固定治疗→加治疗比例（再次取整）→加受治疗比例（再次取整）。生命按缺失量封顶，但旧BattleContext返回并记录的是封顶前治疗值，因此Recovery分别保存base、reported和actual，不把三者混成一个值。基础量<=0或1009禁疗不生成治疗记录；既有中断、死亡目标也跳过。每个Buff后旧restore清除中断，本执行器暂存这一阶段状态，全部计算成功后提交生命、记录并清理真实中断集合。

执行器每场独立创建，State只保存场内生命和已折算属性，输入快照不回写，记录不可变。来源/上下文缺失、重复单位、未知效果、控制改选、溢出或负治疗跨越死亡边界明确失败，不留下半次回血。测试组合“1083201条件失败→1063201治疗跳过”验证共用同一Actor中断集合；这是人为组合的规则集成测试，不宣称两者在原配置中直接相连。

范围仍有限：仅普通动作，无临时属性消费、临时目标数、目标重定向、反击，以及186治疗/206受治疗/311治疗后监听；当前事件定义本身尚不允许安装这些治疗监听。当前输入必须是这类状态不存在的独立子集。skill入口显式拒绝整组技能调度；未把1063201的上游技能/触发链宣称完成。没有战报协议、奖励结算或对外战斗接口，未开放战斗。后续优先补治疗事件及上游真实技能，再接入伤害与死亡链。


## 2026-11-04 治疗事件与真实受击被动链

前述目标选择、血量条件及治疗动作三批已本机提交a8b1bb7c。本批补通的真实配置链为heroskill 101050063:1（active_type=0、count_stats=0）→入场buffart 1063101（自身）→安装Buff 1063101（事件171、round=999、必中）→受击时执行1063201→130号自疗。旧依据为BattleService.initPassiveSkills/executeSkill、BeattackBuffHandler、AbstractReplenishBuffHandler及TreatmentBuffHandler。它不是主动治疗技能，安装时不回血，也不发送普攻/主动技能使用事件。

HeroBattleHealingExecutor.initializePassive先预检全部安装动作与后续效果，只接受自身、长期必中、无冲突的通用监听，按Actor未占用实例号安装；重复技能拒绝，开始动作后禁止追加入场安装。171的value0非0前置Buff条件目前拒绝，不静默忽略。来源技能仍由调用方提供已选定的精确ID/等级；目前没有开放战斗入口或完整技能自动装配。

正常治疗顺序：设置施法者lastTreatment基础量→186(施法者,受治疗者)→206(受治疗者,施法者)→重新读取lastTreatment与当前目标血量→比例折算及回血→311(施法者,受治疗者)。通用186/206监听沿既有来源/携带者与目标上下文规则执行。嵌套动作可能已改变目标血量或施法者最近治疗量，外层不能用旧局部值覆盖。禁疗、基础量<=0和目标资格不满足时无治疗事件；封印阻止事件监听，但不直接阻止治疗本身。

311只落地事件时点，未允许安装清心监听：旧PureHeartBuffHandler是随机驱散负面Buff，不能当作普通art_list执行。200反向契约通过listenType挂到206，涉及契约对象及治疗转移，也仍明确拒绝。真实186配置10011101后续为1008护盾，因此该整链仍不在治疗子集内，不因186通用分发可用就声称护盾已完成。

根调用对场内生命、治疗记录、事件轨迹、Actor中断/监听/lastTreatment和入场安装状态设置回滚点。嵌套未知效果、溢出或循环限制失败时整体恢复，不吞错。当前保护上限为嵌套32层/每次根调用128个事件，超过即失败；这是未完成引擎的执行保护，不是旧游戏玩法上限。

本批测试覆盖真实被动受击自疗、真实2143502跨单位治疗的186/206对调、嵌套事件先后顺序、禁疗/封印、条件状态、错误整体回滚和递归拒绝。人工安装的嵌套监听仅为边界测试，不冒称原配置。现仍缺Buff到期/驱散/叠层、临时属性消费、完整主动技能与反击、治疗特殊监听、伤害/死亡/战报与结算；round=999仅为受限入场配置预检，不代表已实现回合到期。战斗、升级和穿脱入口保持关闭。


## 2026-11-05 Buff生命周期与治疗护盾

上一批治疗事件/受击被动已本机提交f8bb7db9。新增HeroBattleBuffState保存每个单位的独立Buff实例，依据旧BuffsInfo、BuffDo、AbstractBuffHandler、BuffHelper及BattleService.checkExpiredBuff：安装期限为当前回合+round，到期判断为expiry<=当前回合；普通类型按类型+来源计层，属性类型的集合规则按配置ID+来源计层。超层移除最早到期项，同到期保留安装顺序；非0冲突组跨来源替换。冲突与超层命中同一实例时，新版只执行一次实际移除。

已接入的真实链为技能300100001:1→安装186监听10011101→治疗时执行10011201→1008护盾。旧ShieldBuffHandler优先取value0治疗转换比例，读取施法者lastTreatment（基础治疗量），非回血后实际恢复量；10011201按20%转换，结果取绝对值。只支持该治疗转换分支，伤害/生命/攻击生成护盾仍拒绝。1008不属于治疗，不受1009禁疗自身检查影响。

旧AbstractBuffHandler.addBuff先寻找目标的首个1008护盾；存在时直接复用。因此再次生成护盾覆盖数值，不叠加，不刷新到期，不改原来源/配置/实例编号；这优先于通常冲突/叠层规则。无旧护盾才生成新实例。实例编号本场单调增长，删除后不复用，事务失败时回滚编号。

HeroBattleHealingExecutor将被动监听同步存入实例集合，expireAt只在战场显式给出的旧到期检查时点移除当前支持实例及对应监听；不是完整回合驱动。dispel沿旧规则筛选effect相等、dispelled=true且绝对expiry<999，不将剩余时间当永久标志。移除原因/原实例单独记录，场内Buff集合、编号、回合和移除记录均纳入根动作回滚。

当前运行接入限于通用监听和治疗护盾。集合层测试了属性Buff的分层规则，但属性效果及移除属性回调尚未接入，不能因此宣称属性Buff已恢复。209到期触发、周期伤害/治疗、死亡与光环清理、清心随机驱散、反向契约转移、护盾抵挡伤害仍未完成；未知类型继续拒绝。现有手工Actor.control测试入口不属于本批自动管理的持久Buff实例，不将它算作完整控制生命周期。


## 2026-11-05 清心、反向契约与移除语义

上一批生命周期/治疗护盾已本机提交77e80d3c。旧依据：PureHeartBuffHandler、ReverseContractBuffHandler、SoulContractBuffHandler.handle、BuffType.listenType、BuffsInfo.getBuffersBy、BuffHelper.removeBuff和BuffHandler.removeBuff默认实现。200通过listenType监听206，311与200覆盖普通trigger，不执行配置art_list；新版通过Executor.special分流，不将其视为普通动作列表。

清心真实技能150300001:1→Buff8301101。治疗后的311事件先判断命中，再筛选携带者己方全部单位中有可驱散DEBUFF(2)者（包含死亡单位；不混入敌方与CONTROL(3)）；按旧RandomUtil.randomList无放回选择，选中英雄的全部可驱散负面实例经统一removed入口移除。保留旧expiry<999、dispelled及效果类别筛选。真实必中禁疗1151503可安装为实际实例，清心/到期移除后，治疗资格查询不再受该实例影响，不误清其他来源或手工测试状态。

**待审——清心整数概率算法**：当前旧源码缺少RandomUtils.isHit(int)，已确认RandomUtil是另一个类，不能冒称找到原方法。用户于2026-11-05授权先简单推算、标待审、上线前测试。默认参考已存在的RandomUtil.isHit(double)，暂用configuredRate/10000D，非正值不命中，nextDouble<=概率；2000暂解释为20%。RandomDecision可注入固定结果测试，上线前必须核对该换算与边界。随机选人算法已有旧源码依据，不属于这项概率推算。默认随机源不参与场内状态回滚；闭合接口前须结合战斗幂等/随机回放设计，不能把失败重试等同于同一随机序列。

反向契约真实Buff5181503(value0=5000)通过206触发。先从治疗者lastTreatment截取50%并扣除；关联者死亡仍不退回原治疗量。关联者存活时，使用原契约施加者的固定治疗/治疗比例和关联者受治疗比例直接context.replenish语义回血；不再触发186/206/311，也不额外检查禁疗。转移记录与原治疗记录分别保存；原目标继续用扣除后的lastTreatment结算。源码中声明的conflictBuff集合未被使用，不擅自实现清理两端契约。

installTreatmentStatus显式接收来源、携带者与契约对象，仅支持已核对的必中特殊配置。关联值保存在Buff实例及监听快照中，不在触发时猜对象；缺失关联拒绝。契约创建上游的199随机选敌/建立双方关系及伤害转移尚未接入，当前不宣称整项灵魂契约技能完成。清心和反向契约没有独立removeBuff重写，沿旧默认空效果回调；统一移除注销本实例监听、记录原因，既不残留206监听也不擅自连带删除另一端。被移除监听若已进入本轮事件快照，仍沿旧快照语义完成本轮。

测试包括真实清心技能安装、命中/未命中与选人、死亡己方候选与敌方排除、禁疗解除、异常随机输入整体回滚、真实契约转移数值/原施加者归属/禁疗差异、死亡对象仍扣减、不可驱散与到期注销、非法安装和待审概率边界。伤害吸收、199上游、209到期事件、属性移除副作用和完整战斗仍在后续范围。


## 2026-11-05 契约建约与105伤害子集

上一批清心/反向契约治疗已本机提交b497f328。新增establishContract沿旧SoulContractBuffHandler.handle执行199建约：随机选择施法者阵营的存活敌人，先在指定携带者安装关联敌人的199，再在敌人安装关联值0的199，value2非0时在敌人安装指回原携带者的200。真实5181303的40%伤害与5181503的50%治疗转移已能共用这组关系。随机取敌采用已核对的均匀下标选择，不使用清心概率推算。无存活敌人/缺失对象拒绝，不安装半组关系。

199经listenType监听189；关联值0或关联者死亡时不分摊，否则从当前伤害量扣出value0比例，用原契约施加者作为额外伤害来源。额外伤害走护盾/扣血/死亡清理，不再次分发189，避免重入契约；转移的治疗仍按上一节200执行。value1上限在旧处理器中未使用，不擅自增加。建约入口对应199处理器本身。后续复核纠正：虽然buff.art_list引用5181403（160号属性291），但199的notTrigger=false且专用trigger不调用该列表，因此不能按“漏接属性”自动补上；详细证据见下节。整组英雄主动技能仍未完成。

最小伤害选择旧DamageRealBuffHandler的105号配置，例如9011201：攻击×value0万分比，向零取整、必中、fixedAttack=true。执行187→计算伤害→188→189→契约分摊→护盾消耗→扣血→死亡记录/清理；105及契约额外伤害不触发171自疗/反击。普通物理/法术命中、暴击、防御折算和整组技能排期仍待恢复。

**源码疑点，待正式服复核：护盾记录与扣血不一致。** AbstractBaseDamageBuffHandler.consumeShield先把吸收量加回负伤害，随后BattleContext.heroHurt又调用defender.hurt(result.damage-shieldValue)。因此100伤害/10护盾在当前源码中消耗10护盾、战报记录-90，但实际扣血-100。新版当前忠实保留并分别记录incoming、absorbed、reported与actual，没有擅自把它修成护盾实际减伤；这一项与已授权推算的清心概率是两个不同事项。

护盾按实例安装顺序消耗，耗尽统一移除并记录shield-depleted。致死按当前生命封顶为0，设置Actor死亡状态，记录180时点后移除本批所有已支持且非deathBuff实例/监听，施法者中断该目标。未实现死亡技能、复活/承伤特殊处理、deathBuff保留类型、光环对队友清理和完整胜负结算；这些类型尚未允许安装。当前没有用“清掉全部已支持实例”冒充完整死亡系统。Actor死亡标记、伤害记录、Buff及血量均纳入根动作回滚。

清心概率原“待审”标记继续保留，未将本批护盾源码疑点改作未经授权的新规则。


## 2026-11-05 契约动作选择与源码核查纠正

新增contractArt读取真实5181303动作的[2,4,7,11]选择器，按己方存活→后排优先→血量比例升序选1人；后排为空保留前排集合再继续比例排序。前排定义为1/2/3/4，6/7本身不按target_num截取；11按hp/maxHp而非绝对hp稳定排序。调用时从当前State提取生命快照，不能用入场满血值。目标选好后再执行已支持的199建约处理器，所有Buff配置预检后放入同一事务，未知混合效果拒绝。

**纠正上一批计划：5181403不是已证实漏接的后续效果。** CBuff.notTrigger要求triggerArt=false且listenType/listenType2均为空；199.listenType=189，故BattleService.executeBuffArt不会在安装后递归其art_list。SoulContractBuffHandler覆盖trigger，仅处理伤害转移，不调用父类的art_list执行。当前源码这两条路径均不会执行5181403。新版不擅自补上属性291，测试断言该链只有199/200实例。配置存在不等于运行路径一定执行；若后续正式服有不同效果，再比较版本与策划规则。

护盾源码疑点新增客户端证据：旧client/idle/src/utils/BattleAttrUpdateUtils.lua的223处理直接以update.value累加血条，BattleController.lua分发战报属性更新。因此客户端展示使用战报HP值，不能用“画面显示抵消”证明服务端实际扣血已抵消。本轮只完成源码核查，没有正式服实战验收，不能宣称疑点已排除或已修正。


## 2026-11-05 普通伤害准备：星级防御系数

旧 `BattleTemplate.convertFrom` 按 `heroInfo.star` 读取 `battledefend`，作为基础属性150（DEFEND_RAGE）加入战斗属性；不使用进化等级或强化阶段代替。新版 `HeroBattleDefenseRules` 读取同源14档配置（1星500，10星840，14星1080），缺表、重复星级或缺失星级拒绝组装；`HeroBattleInputService` 每次重建并累加一次，保持面板、资产版本和持久数据不变。

旧 `FightUtil.calDefenseRate` 为 `min(defense / (defense + coefficient), 0.8)`，其中防御是当前已折算属性224，系数是当前属性150。`HeroBattleAttributeUtils.defenseRate` 保留double运算、80%上限和无零下限；分母为零、非有限结果及long加法溢出明确拒绝，不能当作零减伤或默认80%。这是非法输入拒绝边界，非复刻旧Java溢出/非有限数行为。

本批只接入战斗输入系数并提供防御率计算工具，尚未把工具用于普通伤害执行；105真实伤害保持原链路，不额外套防御减伤。普通命中、暴击、格挡、法术防御、破甲、神圣伤害及完整乘区仍待逐项恢复，不用中性默认值冒充完整公式。清心概率“待审”与护盾战报/实际扣血疑点继续保留。


## 2026-11-05 命中、暴击和格挡规则准备

依据旧FightUtil.isHitRate/isCrit/isBlook/calCritRate/calDamage及BattleConstant，本批新增HeroBattleHitUtils纯规则工具，所有比例参数已经除以10000：命中为1-(1-命中226)*闪避227；暴击为暴击207*(1-抗暴208)；格挡为(1-精准211-(元素命中克制倍率-1))*格挡比例。元素配置缺失时旧版直接跳过格挡，不是补默认倍率。公式不加0至1截断；非有限数值明确拒绝。暴伤倍率为1.5+min(暴伤222,1.5)，不加零下限。

旧执行顺序：未命中立即返回，不抽暴击/格挡；命中后即使fixedAttack仍抽暴击。非固定、抽中暴击且未封印时，存在抗暴Buff则移除首个且不读暴伤，否则读取暴伤并标记实际暴击。其他分支仍读取暴伤以消耗一次性属性。新Critical结果只表达分支要求，不实际移除Buff或读取属性；未来执行器必须按顺序落实。格挡只在非固定攻击且双方有元素配置时抽样，减伤30%，原始暴击抽样成功再加20%，即便实际暴击被封印/抗暴取消也是如此。

旧调用的RandomUtils源码仍缺失，本批不实现新的随机适配器，不扩大清心概率推定授权。概率公式及分支通过测试不表示普通伤害已接入；尚需元素配置读取、属性一次性消费、随机抽样、抗暴移除回调及完整伤害公式。105真实伤害保持原实现。


## 2026-11-05 元素克制配置与一次性属性读取

依据旧CHeroElemMul、Element、FightUtil及AttributeInfo：HeroBattleElementRules加载同源herotype/heroelemmul，战斗Unit携带英雄模板真实elem。25组方向配置分开保存伤害与命中克制万分比；火克木、水克火、木克水、光暗互克，配置为[13000,11500]，其余[10000,10000]。普通伤害的元素倍率为配置伤害倍率加攻方对守方元素的增伤，火/水/木/光/暗属性分别251/253/252/254/255。damageMultiplier读取一次对应属性；命中克制值供精准/格挡公式使用，不直接乘基础命中概率。

当前英雄输入要求1至5元素及配置完整；不支持将缺元素英雄伪装为中性。旧CHeroElemMul对未知目标编号返回10000，旧FightUtil缺双方元素时还分别跳过格挡、返回伤害倍率1；本批没有开放无元素单位，这些特殊入口需后续显式建模。

HeroBattleAttributeState从Unit.newAttributeState创建独立读取状态。旧getAttribute先remove一次性值，存在则直接返回（包括0），不再读取比例或效果属性；没有覆盖时原始值按攻220/201、防224/202、速101/204折算并向零截断；205治疗比例、219控制率再读取10号效果比例进行第二次截断。HP223在此不重新乘生命比例，入场最大血量仍由已有opening负责。

旧getRate先完成上述读取，再min(value,50000)/10000，无零下限。setOnce覆盖下一次读取；addOnce先读取当前折算结果（会消耗其递归依赖的一次性值），再加数并重新覆盖。不是普通Buff叠加，也不是基础值加临时值。一次性快照不可变，可供后续动作事务恢复；addOnce自身失败恢复消费状态。get/rate失败后的整体恢复由动作调用边界负责，不能捕获后继续使用部分消费的状态。超界明确拒绝，与旧溢出/饱和转换区别单列。

本批接入战斗输入元素及独立状态创建口，完成配置倍率/读取规则及组合测试；现有最小治疗/105执行器尚未迁入该状态，不声称普通伤害已串通。基础属性更新、动态Buff属性、完整生命状态、随机适配和普通伤害执行仍待接入；不在此伪造无来源加成。清心概率待审及护盾源码疑点不变。


## 2026-11-05 普通伤害读取顺序与计算动作回滚

新增HeroBattleDamageAction，按旧FightUtil.calDamage读取双方独立HeroBattleAttributeState并产出扣血前Result。上下文必须明确双方元素、物理/法术、技能系数、是否主动技能、能量、固定攻击、封印、抗暴状态、守方职业对应增伤属性，以及由实际目标状态判定激活的负面状态增伤属性。当前未自动从Buff执行器装配这些上下文，不代表游戏战斗入口开放。

读取顺序：攻击220、固定伤害221、破甲203、最终增伤270、对元素增伤、守方防御224/系数150、减伤291、主动技能加成200、精准211、虚弱230、伤害类型抗性、伤害类型增伤，最后才读取226/227判定命中。未命中返回旧-1标记并停止，标记不是实际扣血量，之前的读取消费保留。

命中后读取207/208判定暴击；固定攻击仍抽暴击但不实际暴击，读取222以消费一次性暴伤。正常格挡会再次读取211及210，不能复用前一次精准值。神圣伤害也再次读取220及225，不能复用最初的一次性攻击值。旧属性枚举顺序260至265、301至306的状态增伤都要读取，哪怕目标没有对应状态；之后读职业281至285对应项、效果10、物理驱使340或法术咒术341。物理抗性241/增伤271，法术抗性240/增伤272。固定攻击能量乘区保留旧常数1，普通攻击为0，主动技能为max(0,(energy-100)/100)。

本批计算旧伤害乘区，未接扣血、护盾、受击、死亡及战报。抗暴Buff需移除的分支明确拒绝，不仅更改暴击标志冒充回调已执行。无元素单位继续拒绝；随机判定由调用方明确注入，无默认推定实现。

execute对整组目标先按对象身份保存一次性快照，再依序计算；任一RuntimeException恢复全部参与者（包括已成功的前一个目标），不返回部分结果。成功则保留消费；不会回滚随机源的抽样进度，不能直接据此重放/自动重试。当前事务只涉及属性读取，尚未与治疗/105执行器的血量、Buff和信号事务合并。非有限伤害、驱使/咒术负值及溢出拒绝整组计算；不复刻非法数值饱和转换。清心概率待审及护盾源码疑点保持原状态。


## 2026-11-05 抗暴移除与普通伤害运行时接入

旧FightUtil的抗暴分支调用HeroDo.removeBuff，实际为BuffsInfo.removeBuff：删除首个实例并保存lastExpiredBuff，并不调用BuffHelper的通用移除/到期效果。本批真实1251配置19004303为无art_list的状态，新增安装及首层移除，记录counter-crit原因并同步清理实例监听；不伪发209或执行额外配置动作。当前移除记录保留完整实例，尚无依赖lastExpiredBuff的后续处理器接入。抗暴取消暴击时不读取222一次性暴伤；未取消时沿原分支读取。

执行器增加bindCombatData(Unit)及模板/原始属性装配口，元素和职业来自同源herotype；每个单位有独立HeroBattleAttributeState，禁止动作开始后重新绑定。ordinaryDamage从当前单位Buff/控制状态计算封印、抗暴和负面状态激活集合，读取同源100号配置系数。伤害类型、主动技能标志、能量及目标序列由当前动作调用方显式提供，完整技能调度仍未恢复。

本批只接受attach_percent=10000、value[1]=1（旧NOT_COUNTERATTACK）、无art_list的100号配置，例如1011401=4800|1|0|0。完整反击条件和攻击方/受击方后置技能链未完成，其他配置明确拒绝，不只扣血省略事件。未命中记录-1标记及204事件时点，不扣血；177/204仅开放事件记录，计数型监听仍未安装，不能当完整MISS/BLOCK统计恢复。

普通伤害按目标顺序执行187→计算（必要时移除抗暴）→188→189契约分摊→护盾消耗→血量→死亡180及实例清理；存活者记录177时点。复用当前105/契约的扣血路径，保留护盾源码疑点：吸收减少报告值但实际扣血仍含吸收量。不开放普通反击链，也未改105规则。

根事务现在同时保存一次性属性、Actor/中断/死亡状态、Buff实例、血量、移除/伤害/治疗/判定/事件记录。后目标失败会撤回前目标已发生的死亡、护盾消耗和抗暴移除。随机抽样仍不回滚；不得自动重试并声称确定性重放。清心概率待审不变，未使用该推算作为普通伤害默认随机。


## 2026-11-05 反击资格与合法出手边界

核对旧BattleTrigger.isCounterattack：同时满足非固定伤害、Buff允许反击、当前不是队列反击、当前出手未关闭该目标，才允许攻守后置事件。该条件不只是反击技能是否入队，也决定暴击/造成伤害/击杀/受击等事件。HeroBattleEventProcessor.Actor新增canTriggerDamage与finishDamage，目标标记按单位隔离；关闭目标仅在伤害后置处理成功后调用，未命中不关闭。

旧BattleService.executeRoundAttack在行动前事件及canAttack之后才openCounterattack。本批act在197及行动资格通过后、执行技能前清空目标标记；不能每段或每个目标清空。队列动作设置当前反击标志，下一次普通合法出手恢复普通标志。动作Checkpoint纳入目标集合、反击标志、当前技能、控制和挂机封印，使已有根事务可以恢复这些临时状态。

后置顺序依据已核实：攻方174(实际暴击)→181或182→194→190(守方死亡)；随后守方死亡时180并清理，否则177→资格检查→175(实际暴击)→184及BLOCK计数/204→176→178或179→171。此处仅记录源码顺序，尚未开放这些全部监听及计数处理，不把事件编号列出当作执行完成。

本批资格入口已接入行动调度，但普通伤害仍只允许不反击配置，finishDamage尚待完整伤害后置事件链调用；不能以资格测试通过开放可反击Buff。下一步逐项恢复各后置处理器的参数、次数和回合限制，再连接目标关闭和反击队列。清心概率待审及护盾源码疑点保持。


## 2026-11-05 最小真实普攻与被暴击反击链

新增attack根动作入口：使用Actor当前真实普通攻击计划，预检技能art_list和100号伤害；暂只接物理普通攻击及5号投射表现，主动/混合效果不支持。投射5经旧BuffHandlerHolder/ClientBuffHandler确认为非逻辑表现，保留配置/来源/目标记录，不静默删除；动画与协议播放尚未接入。

根技能入口允许100号可反击配置；原ordinaryDamage独立入口仍拒绝，防止绕过行动生命周期。按旧顺序执行攻方174→181/182→194→190，再执行守方死亡180清理或177→175→184/204→176→178/179→171；事件根据暴击、格挡、死亡及反击资格分支触发，不预先生成整条列表。finishDamage在后置处理成功后关闭目标。105与契约额外伤害的死亡时点保持原实现。

真实1093101（175，value=0|0）→1093201（1301）使用单位普通攻击入队；队列先进先出，队列普攻固定原反击目标，不再次触发可反击的攻守事件，也不发送普通出手的172/170。根动作结束前排空队列；任一反击失败回滚原攻击及所有反击的血量、属性、Buff、事件和表现记录，队列不跨根动作残留。动作/事件/队列均有显式循环上限，超出拒绝，不截断为成功。

本批174/175只支持无回合/来源/次数限制参数，其他参数仍明确拒绝；176/177/204为时点记录，分层血量和计数型监听未恢复。其他后置通用监听的动作仍必须落在已支持治疗/1301等范围，未知动作使事务失败，不冒充完整反击生态。当前只测试真实技能片段，不是整场真实关卡完成。

下一阶段验收目标固定为独立测试环境真实关卡：先按关卡敌方及测试阵容列出技能/效果依赖，再补缺口、敌方输入与整回合调度、胜负和回合上限；最后生成可回放战报。不开正式入口、不发奖励，不用简化规则替代配置。清心概率待审、护盾疑点保留。
