# 当前项目进度

更新：2026-11-13。代码整理已提交为 `dd5822a8`，已推送 `origin/hao` 并合入、推送 `origin/main`；当前回到 `hao` 开发。本轮文档收口随独立文档提交同步两分支，最新顶点以 Git 为准。本次合并授权不代表以后自动合并 main。

本页只维护当前状态、依据和限制；执行顺序见[实施路线](restructuring-plan.md)，接手步骤见[交接文档](handoff.md)。原先累计的批次过程已完整保存在[历史快照](validation/development-history-20261113.md)，其中旧数量、未提交状态和旧方案不再作为当前结论。

## 当前阶段

前三关主线的“挂机→布阵→挑战→结算→返回挂机”已接通；战报与结算由服务端持久化，客户端走WS＋Protobuf及唯一Model。当前仍是分期恢复版本，不是完整挂机收益或全游戏上线版本。

| 模块 | 当前已接通 | 仍未完成/开放 |
|---|---|---|
| 登录、角色、背包 | 统一登录快照、角色只读资料、背包分类与详情、持久版本同步 | 正式身份平台、完整创角、背包使用/分解及真机发行验证 |
| 英雄与阵容 | 名册、基础详情、技能只读、普通四槽关系、进化持久状态及只读技能、主线布阵保存 | 完整属性/技能覆盖不足；升级、穿脱、扩容未开放 |
| 主线挑战与结算 | 前三关真实输入、持久战报、幂等结算、恢复待领奖；开场、最高伤害、经验动画、确认/倒计时及返回 | 更多关卡和技能；大型进化翅膀裁边待审 |
| 战斗统计与历史展示 | 双方伤害/承伤/治疗，冻结名称/头像/星级及胜利骨骼；进化头像、高星样式；缺历史字段明确提示 | 不等同全英雄外观/全技能表现验收 |
| 挂机演出与只读说明 | 最多三英雄持久选择、行军/遇敌/对话；四档宝箱、计时气泡、累计条、阵亡资源飞行；全部850关双页产物及只读详情 | 宝箱领取、快速战斗、完整离线奖励事务未开放 |
| 挂机奖励规则 | 旧随机保底/加成依赖审计；现有基础随机10项边界回归；VIP/世界/礼包/神职纯加成计算及10项测试；输入契约草案 | 权益适用判断、权威输入链及新主线领取事务未实现 |
| GM与技能台 | 当前测试角色隔离数据准备、技能演示和覆盖标记 | 开发工具不等于玩法获取途径；其他玩法/社交不在本批范围 |

## 框架、资源与人工维护入口

- 页面自行通过 `@UIRegistry.view` 定义唯一 Prefab 地址、层级、缓存、模态与配置前置；ApplicationPages 只装配登录/主城 Controller 及宿主。静态布局归完整 Prefab、Widget 与统一比例适配，不再使用 BagMount、HeroMount 或旧页面壳。
- 列表使用 SuperScroll/SuperContent 的 RENDER_ITEM/SELECT_ITEM；View 负责渲染及选择，Cell 负责显示。等尺寸虚拟列表仅创建可见区和缓冲行节点；变高列表、无限循环及父子拖动角度仲裁尚未实现。
- 取图统一为 ResManager，复用 ResourcePool；CommonUiResources、IconCatalog、ResourceCatalog 已退役。动态资源按包名和包内路径获取，缺图打印具体路径及原因，不维护存在性清单。
- 资源均在 `assets/bundles`：resources 下为 audio/chapter/config/effects/font/icons/maps/spine；module 下为 bag/battle/bootstrap/common/gm/hero/home/login。共 **16 包，15 远程＋本地 bootstrap**，32 份 Prefab、31 张实际依赖配置表；两个分类父目录不是 Bundle。common、bag、hero、battle 的现有自动图集继续保留。
- LoadingPlan 是三段加载的唯一人工配置入口；预载页面读取其唯一 Prefab 地址，直接绑定依赖由引擎带入。没有模块额外清单，也不全量扫描目录加载。当前配置如下，具体资源以[LoadingPlan](../client/assets/scripts/app/remake/LoadingPlan.ts)为准。

| 阶段 | 当前显式目标 | 完成时机 |
|---|---|---|
| login | 语言/提示配置、加载动画/背景、登录音乐、选服页 | 登录页出现前 |
| enterGame | 主城及背包所需配置、主城页、背包页 | 登录成功后、显示主城前 |
| background | 背包详情、英雄列表、英雄详情、挂机主页 | 主城显示后后台准备 |

其他资源在实际使用时加载；预载完成不表示所有动态图标、立绘、骨骼常驻或首次显示绝无开销。页面缓存已接入：背包 cache:true，UIManager 闲置 120 秒、最多 2 页；PrefabLoader 闲置 120 秒、最多 16 个可回收项，前台约每 30 秒维护。阶段目标由应用单独持有，仍被阶段、实例或其他拥有者引用的资源不能因闲置维护而释放。缓存条目消失也不等于 GC/GPU 内存立刻下降。维护步骤见[加载与远程资源](staged-resource-loading.md)和[架构](architecture.md)。

## 本轮代码整理结果

- 账号切换与旧回包隔离归应用/连接层；BaseModel 不保存角色键，英雄详情和技能页不再比较 owner。保留页面关闭、绘制代次等自身异步生命周期保护。
- 40 份脚本改名，130 个自由导出 API 整理为所属类方法，18 份无调用旧脚本及 meta 退役。保留的 50 份定义 meta 与原文件一致；有状态的 BattleSpineService、CityMapService 仍由实例管理缓存和节点。
- chapter 整包归 resources，184 份资源/meta 逐字节保持。effects 从 battle 模块拆为独立远程资源包：12,841 份原文件及原 UUID 保留，仅根 meta 新增 Bundle 声明；运行地址统一为 effects/包内路径。加载、生成器、工具及当前指南同步修改。
- 已删除的未实现客户端链不再挂入口，后端领域规则仍保留；删除旧代码和归档资源不等于取消最终玩法目标。

## 验证状态与限制

| 范围 | 最新证据及适用边界 |
|---|---|
| 11-13 代码、目录与绑定 | 52/52 项有效检查、两套类型检查通过，5 组旧检查暂停；162 脚本、33 份 Prefab/Scene、71 处脚本绑定无缺失。见[代码整理](validation/script-cleanup-20261113.json)、[chapter](validation/chapter-resource-move-20261113.json)、[effects](validation/battle-effects-move-20261113.json) |
| 11-11 本机入口与主线 | 已验登录、三段任务、背包、英雄、850 关说明及第二关结算返回。见[目录批次](validation/bundle-directory-groups-20261111.json)、[虚拟列表批次](validation/virtual-list-resource-review-20261111.json)；不替代 11-13 新路径的发布验证 |
| 缓存自然到期与重开 | 既有发布包测量见[加载与缓存](validation/loading-cache-review-20261111.json)；预载持有及闲置回收已有证据，最新改名链未重新签收 |
| 最后实际发布包 | [自动构建](validation/bundles-auto-build-20261111.json)为早期 104 远程包批次。之后资源精简、页面调整和 effects 拆包尚无新发布包证据；旧包体数字不能称为当前 App 大小 |
| 本轮文档收口 | 仅核对源码、更新文档及检查链接/差异，不重复运行浏览器、Creator 或构建。负责人已验收此前功能，下一次集中构建按后续授权执行 |

当前只有本地独立资源服务样板；真实 CDN HTTPS、弱网/离线、原生/微信、真机帧率及长时间内存/GPU 测量未完成。源码整理与有限节点测试不能代替这些结论。

## 已核实的重要边界

- 挂机四项体验修复已获负责人验收：准备期隐藏敌方模型/头顶信息、我方骨骼连续复用、攻击后回待机、独立站位与放大。挂机模型0.60是已确认体验调整，正式挑战0.48不变；正式战斗8槽，不能把当前最多三英雄说成旧版固定六人上限。
- BattleInfo条件已核对：主线隐藏跳过，保持默认1.5倍；后两档待权威羁绊状态，不因已有goddess_vip数据库列就开放。
- 最高伤害沿负责人确认的旧abs(实际血量变化＋护盾吸收)口径；护盾疑点继续保留。历史姓名、进化头像、高星样式、胜利冻结骨骼已完成接入，不再列为未开始。
- 冰晶女巫真实治疗回放与统计26已完成独立环境验证；不代表其他治疗英雄及负治疗死亡边界均已恢复。
- 850关是产物说明配置范围，现有奖励规则投影20关，正常挑战仅前三关；三者不可混写。
- 当前初始星级/强化0直接动作扫描：113模板中51个可解析、62个有缺口，见[扫描结果](validation/battle-presentation-coverage-20261109.json)。不包含全部进化、被动链、声音或实际画面验收。
- 只检查手机竖屏；负责人明确不需要横屏。平板、真机、密集气泡避让与部分大型模型裁边仍待验。

补充：`chapter.claim` 是挑战结算接口，不是挂机宝箱领取。IdleBonusUtils 已有纯计算及取整测试，**尚无生产调用、完整权威输入或新挂机领取事务**。世界等级接线、活动 gain_chance/概率边界、礼包到期秒/active 判断仍待核对；缺依赖不能默认 0 加成。清心概率、护盾、技能资源及大型模型疑点见[待复验问题](battle-known-issues.md)。

## 玩法证据入口

| 内容 | 证据 |
|---|---|
| 真实主线结算、经验、三种竖屏 | [胜利页](validation/victory-review-20261109.json)、[统计](validation/battle-statistics-20261109.json) |
| 进化头像/高星、真实治疗、历史名称 | [高星](validation/battle-high-stars-20261109.json)、[治疗](validation/battle-healing-20261109.json)、[名称](validation/battle-names-20261109.json) |
| 胜利历史模型及挂点 | [外观](validation/victory-appearance-20261109.json)、[挂点修正](validation/victory-anchor-20261109.json) |
| 挂机只读表现与说明 | [宝箱](validation/idle-chest-20261109.json)、[850关说明](validation/chapter-reward-info-20261109.json)、[进度与飞行](validation/idle-resources-20261109.json) |
| 收益规则与后续设计 | [规则审计](idle-reward-rules.md)、[10项边界](validation/idle-rule-boundaries-20261109.json)、[纯加成测试](validation/idle-bonus-20261109.json)、[输入契约草案](idle-reward-input-contract.md) |

上述证据只代表各自批次；原始记录中的“未提交”“本批”“当前”均有当时范围，不推断今天的 Git、资源数量或验收状态。下一步按[路线中的优先顺序](restructuring-plan.md#接下来的执行顺序)推进。
