> 历史领域规则参考：本文早期升级/阵容接口不代表当前开放协议。当前英雄只读状态见 [英雄数据契约](hero-data-contract.md)，升级与阵容操作仍暂停；重新接入必须使用唯一 WS＋Protobuf 契约，禁止恢复旧 HTTP。

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
