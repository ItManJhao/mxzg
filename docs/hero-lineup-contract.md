# 英雄与主阵容：第一批接口与复用边界

更新：2026-10-29。对应 P3-02、P4-01/P4-02/P4-03，当前为实现中的最小契约。客户端只读英雄列表已接入现有 Prefab，视觉与三端运行待验收；接口类型生成尚未完成。

## 2026-10-30 更新（优先于下方历史状态）

- Start 后的一次性服务器初始化会为无英雄角色发放三名初始英雄并保存默认阵容；开发登录本身不发英雄。已存在英雄/阵容保留，初始化可并发重试。
- 客户端已通过独立 LineupApi / FormationController / FormationView 接通出阵读取、元素筛选、上阵/撤下及 PUT 版本保存；复用 HeroSelectLayer 与 HeroIconCell，不写旧 GameStore/WireSession。
- 挂机页点击战斗必须先打开出阵；空阵容不可确认，确认保存成功后才创建服务器主线战报。取消不保存；保存期间拦截连点/取消；409 或不确定的保存结果必须重新读取，不覆盖其他操作。
- 基础主线结果领取后返回挂机，挂机人数与当前服务器阵容一致。完整解锁/阵法/助阵、技能与养成尚未完成；MySQL 与三端仍待独立验收。
- Formation 检查覆盖 PUT 契约、草稿不提前写、空阵容、防重复提交、保存中取消与版本冲突；实际 H5 点击已验证取消/保存、主线和返回。下方“出阵未接入”描述为 10 月 29 日历史批次状态。

客户端分层以 [2026-10-30 模块级 MVC 基线](architecture.md) 为准。本文后续关于 Service/Controller 注入的叙述是英雄现有过渡实现，英雄与阵容尚未按背包样板迁移；协议、409 和保存规则继续有效。

## 当前已实现的接口

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

新手赠送、召唤、养成和配置模板绑定还没有业务入口。测试种入的英雄仅存在于隔离 H2 测试库，不写入用户 local 数据库，不开放客户端任意发英雄接口。

## 持久化与维护入口

- hero/HeroController、HeroRepository、HeroProfile：身份隔离的只读英雄数据。
- lineup/LineupController、LineupService、LineupRepository、Lineup：版本与站位策略、事务写入、DTO。
- Flyway V2：game_hero、game_lineup_slot，以及 game_role.lineup_version；不改已执行的 V1。
- local CORS 增加 PUT，继续只允许已有两个 Creator 本地来源。
- 测试 HeroLineupTest：新角色空数据、拥有权、非法输入不修改已有阵容、重登、版本冲突、并发、真实 HTTP、PUT 预检及 V1→V2 迁移保留数据。

H2 验证不能替代 MySQL 8.4 的迁移和并发验证。重登一致性已有测试，完整进程重启与真实渠道身份仍需后续证据。

## 客户端数据层与待接界面

客户端列表数据层已装配到 RemakeApp，由主城底栏英雄进入：

- HeroApi：GET /api/v1/heroes 的运行时校验，UUID 实例 ID 与整数模板 ID 分离；拒绝坏结构、重复实例和小数/字符串数值。
- HeroRosterModel：只存 idle/loading/ready/error 与不可变英雄快照，不含 token。ready + [] 是有效空名册，不回退旧 Mock/图鉴。
- HeroRosterService：鉴权读取、并发请求去重、失败后重试；退出、换号、关闭和销毁均作废迟到结果。普通网络错误保留会话，当前会话 401 清理身份与名册。
- AccountService.authenticated：各功能共用的会话能力；请求前和返回后检查有效期，旧账号的 401 不清除新账号，不允许各页面自行读本地 token。
- HeroCatalog：独立投影 herotype/item 的名称、元素与图标，不写旧 GameStore、WireSession 或全局 gameCatalog。英雄实际等级/星级以服务器为准。

HeroRosterController 在开页前为已有 HeroListView 注入展示数据源，再由 UIManager 驱动 show/close。这个分支不读取旧 GameStore、不订阅 WireSession，也不把新 UUID 转成 StoreHero 数值 ID；旧 Boot 未注入时保留原行为。已复用 HeroListLayer、HeroListHeroLayer、HeroIconCell 和原页面背景，不新造列表美术。

只读列表支持加载、真实空名册、元素筛选、筛选空态、错误和点击上方“英雄”重试。显示已拥有数量，不猜测旧服容量。实际等级与星级来自实例；未知模板保留明确名称和默认头像，不伪造完整配置。图鉴、圣龙、永久皮肤和进化按钮在重做路径隐藏，点击格子仅提示详情尚未开放，不打开旧 HeroInfoView。

列表接口 404 会显示“英雄接口不存在，请更新并重启新后端”，保留 HTTP 状态，不当成空名册。用户截图中已确认旧 Java 进程可登录但缺少后来加入的英雄/阵容接口；启动脚本增加端口与接口检查。空态 Label 调整为 24 号字、32 行高、480×112 文本框，容纳错误原因与操作提示，避免多行被压进原 28 高度后自动缩小。

RemakeNavigation 保留主城根及顶底栏，把英雄页挂在主城内容宿主；底栏主城或 UIManager.back 只关闭英雄页并恢复地图，退出登录则清理英雄页和主城。HomeFeatureNavigation 单独记录功能打开意图；加载中点主城会取消，快速“英雄→主城→英雄”会在旧任务取消后重开最新意图。它不替代登录页的显式 Start 校验。

最小 hero 配置组已登记 herotype/item，按需准备，登录和主城不提前请求。HeroResources 为五项原有 Prefab 提供作用域持有。详情所需品质、技能、职业等依赖、动态图标释放和页面实际运行仍待继续。初始英雄发放方案未完成，新账号应显示“尚未获得英雄”。

检查入口：`node client/tools/check-project.mjs --suite hero-roster`。可用 MXZG_REMAKE_API 指向隔离测试后端，实连执行开发登录、读取空名册、无效 token 401 与恢复会话再读。此模式会创建测试账号，应使用隔离库；本轮以随机端口和 H2 内存库执行，不连接用户文件库。

当前只开放底栏英雄的只读列表。详情、出阵和养成尚未接入；不要用旧详情的写操作替代新后端用例。hero 检查覆盖新数据源绘制、空态、失败重试、筛选、隐藏按钮、迟到回包与旧状态污染隔离；remake-navigation / feature-navigation / home-presentation 覆盖返回、退出、取消重进与共享顶底栏。它们不能代替实际渲染验收。

OpenAPI/客户端代码生成与接口漂移检查仍待 P3-02 后续实施，本 Markdown 不能替代机器可读契约。
