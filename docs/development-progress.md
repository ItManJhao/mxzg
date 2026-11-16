# 当前项目进度

更新：2026-11-16。本页维护当前实现、开放边界和验证证据；后续顺序只在[实施路线](restructuring-plan.md)维护，接手操作见[交接文档](handoff.md)。开发分支为 `hao`；本次负责人已授权推送并合并 `main`，实际完成状态以 Git 为准。验证记录中的“本批”“未提交”均是当时状态，不能覆盖今天的分支状态。

## 当前阶段

前三关已经形成“挂机 → 布阵 → 挑战 → 结算 → 返回挂机”的真实闭环。加载、配置、资源池、页面生命周期及断线恢复已有统一入口；当前仍是旧游戏的分期恢复版本，不按文件数或测试数量计算完成率。

| 领域 | 当前已实现 | 尚未开放或尚有缺口 |
|---|---|---|
| 登录、角色与状态 | WS＋Protobuf登录/鉴权、统一持久版本快照、角色只读资料、应用层换号隔离 | 正式身份平台、完整创角及目标平台适配 |
| 背包 | 普通堆叠、期限物品和精灵独立实例；普通装备、道具/碎片、精灵分别按旧表现显示只读详情 | 灵器专页、英雄图鉴；来源跳转、使用、分解、穿戴等写操作 |
| 英雄与布阵 | 名册、基础详情、技能/四槽/进化只读状态，主线布阵保存及回执/状态双确认 | 完整属性与技能覆盖；升级、穿脱、扩容等养成 |
| 主线挑战 | 前三关权威战报、幂等结算、经验/奖励表现、暖恢复及冷重登首次主线恢复 | 更多关卡与技能；主线回执未包含升级赠钻等完整附赠展示信息 |
| 战报与弹窗 | 冻结名称、头像、星级及统计；父页所属详情关闭清理、单实例最后参数、共享模态；统计独立于结算页 | 全英雄/全技能表现、真机布局与长期内存证据不能由当前样本代替 |
| 挂机演出 | 选人、行军/遇敌/对话、四档宝箱、计时、累计条、资源飞行及850关只读产物说明 | 玩家宝箱领取和快速战斗仍关闭；850关说明不等于开放850关挑战 |
| 挂机领取基础 | 完整纯计算/权威输入，V24累计、V25回执，同事务发奖，客户端原请求持久恢复、双版本确认及通用反馈 | 日常服务端新请求开关和客户端策略仍为false；真实开服日期/活动维护配置未启用，玩家按钮未绑定领取 |
| 共享奖励与冒险点 | 可信发奖、实际到账明细、事务后反馈、统一奖励窗/确认框；V26冒险点独立领域及统一快照 | 酒馆任务/扣点及其他玩法仍未恢复；不能把测试发奖视为玩家获取玩法 |
| GM | 本机local默认开启、Creator F9总入口及模块窗口、真实持久发放与统一飘字 | 仅开发数据准备；production不装配服务，不能仅隐藏前端代替服务端限制 |

`chapter.claim`是挑战结算，`chapter.idle.claim`才是挂机领取。两者的回执和恢复用途不同，不以名称相近替换。2000002“月兔精灵·蓝”具备真实独立实例和只读详情，合成、重生、洗练及穿脱继续关闭。

## 本轮代码与文档收口

本轮检查继续收敛既有实现：战场结算页归入openChild生命周期，带结束回调的播放器不再接管结算宿主或全局关窗；共享开窗被其他用途接管后，旧战场不再误记已展示。暂停的Campaign/Idle领域删除重复资产分发，非简化经验奖励复用RewardGrantService，冒险点和精灵分别进入唯一领域，不恢复玩家入口。统一检查工具按全套/单项分别保存汇总，单项复查不会覆盖整轮结果。

文档按“进度记录状态、路线记录下一步、交接记录操作”分工，清掉已经完成的客户端恢复/布阵确认待办、旧发布包结论及旧脚本数量。原始证据和各自限制继续保留，不删除记录来制造整齐的完成率。

本轮统一检查80套通过，5项暂停不计通过；最后结算归属修复后8套相关检查和严格类型复验通过，叠窗专项共11组。后台首轮680项暴露13处失败，修复旧分发/测试基线后30项定向检查及最终681项全部通过；未运行MySQL专项。结果和修改范围见[本轮收口记录](validation/project-consolidation-20261116.json)。本轮没有重跑浏览器或集中构建，不能用这些结果替代画面验收。

## 本阶段已完成的恢复链

| 场景 | 当前处理 | 证据 |
|---|---|---|
| 挂机原请求中断 | 先写原生IndexedDB，再发原请求；按原编号查回执，历史结果与最新快照双确认后条件清理，换号不删除旧角色日志 | [客户端基础](validation/idle-claim-client-recovery-review-20261114.json)、[真实WS/同库只读重启](validation/idle-claim-live-recovery-review-20261116.json) |
| 通用发奖反馈 | 原业务receiptId去重，等待统一资产版本；窗口失败只重试展示，不重新发奖；挂机复用RewardView/ConfirmView | [通用链](reward-feedback.md)、[真实通知](validation/reward-live-notice-review-20261116.json)、[本机画面](validation/reward-preview-review-20261116.json) |
| 冒险点满额依赖 | 独立持久余额及上限随首包/推送恢复；未来65秒点击链复用通用确认，取消不建日志 | [旧依据](validation/tavern-point-legacy-audit-20261116.json)、[实现检查](validation/tavern-point-review-20261116.json)、[真实联调](validation/tavern-point-live-review-20261116.json) |
| 暖重连战斗结算 | 保留原battleId，SETTLED回执和足够新的统一快照均确认后才展示；缺状态每轮一次鉴权，关页不丢模块意图 | [旧链审计](validation/reconnect-recovery-audit-20261116.json)、[双确认](validation/battle-settlement-review-20261116.json)、[本机](validation/battle-settlement-preview-20261116.json) |
| 冷重登首次主线 | 登录主城仅记pending候选，首次进入主线才结算原编号；正常胜利页与恢复通用奖励窗互斥，实际开窗才记已展示 | [入口检查](validation/chapter-entry-recovery-review-20261116.json)、[真实重载](validation/chapter-entry-preview-20261116.json) |
| 布阵ACK到、状态缺失 | 保留原请求与站位至双确认；有ACK只重试同步，不重发保存；真正确认才继续一次出战 | [恢复检查](validation/formation-confirm-review-20261116.json)、[丢推送复验](validation/formation-confirm-preview-20261116.json) |
| 切页与前后台 | 同页未保存草稿保留，关闭重开回权威站位；结算关页后确认原编号，重复首包/历史反馈不重复弹奖 | [组合检查](validation/page-lifecycle-review-20261116.json)、[本机矩阵](validation/page-lifecycle-preview-20261116.json) |
| 统计与详情长断线 | openChild统一归属及最后参数，旧父/旧回调不能误关或覆盖新窗；统计静态监听仅绑定一次，仍可独立保留 | [实现检查](validation/overlay-lifecycle-review-20261116.json)、[长断线实测](validation/overlay-lifecycle-preview-20261116.json) |

前一轮叠窗工作完成15套相关专项及严格类型检查。独立Creator/真实H2与WS下，两组实际离线时长为118.0458秒、97.5371秒，另有9次主动重连；统计、详情叠窗和技能窗保持原实例/内容，关闭后无残留弹窗或打开意图。断线开始后没有新的挑战、结算请求或重复奖励窗。期间20条挂机NOT_READY告警属于已记录断线行为，不能称全程零告警。

最后追加的同步 `onOpen` 关闭/ready入口保护，以及本轮补齐的战场/播放器结算归属，均只有专项证据，尚未进入上述Creator编译；下次正常刷新核对即可，不为此重复安排集中构建。以上是各批已有证据，本轮没有重跑浏览器，也不把历史通过计为本轮新验证。

## 框架、资源与人工维护入口

| 职责 | 唯一维护入口与约定 |
|---|---|
| 页面 | View自己的 `@UIRegistry.view` 保存地址、模态、缓存等参数；Prefab保存布局、Widget及统一比例。ApplicationPages只承担应用装配，配置不再由页面准备 |
| 弹窗归属 | 随父页结束的详情使用 `UIManager.openChild`；独立统计等使用普通 `open`。由框架提交最后参数，不在Promise后再次 `runOpen` 或按全局id误关其他来源 |
| 列表 | SuperScroll/SuperContent、View的渲染/选择事件；等尺寸虚拟列表只创建可见区及缓冲节点 |
| 资源 | `assets/bundles/resources`为通用素材包，`module`为页面模块；父目录不设Bundle。运行时仍用原包名/包内路径，原UUID保留，自动图集继续使用 |
| 取图与持有 | ResManager复用ResourcePool/PrefabLoader；不恢复CommonUiResources、IconCatalog、ResourceCatalog或模块存在性清单 |
| 配置 | 少量启动表由LoadingPlan声明，其余生成一份压缩包；登录后校验安装到唯一GameConfig。页面同步查映射，真实显示计算保留在无状态Utils中 |
| 页面/资源缓存 | 背包短期缓存；页面闲置120秒、最多2页，Prefab闲置120秒、最多16个可回收项。阶段预载持有、活动实例及其他拥有者引用均受到保护，回收不等于GC/GPU立刻下降 |

三段以[LoadingPlan](../client/assets/scripts/app/remake/LoadingPlan.ts)为准，不另建模块清单：

| 阶段 | 当前目标 | 时机 |
|---|---|---|
| login | 语言/提示启动表、加载骨骼/背景/音乐、选服页 | 登录页出现前 |
| enterGame | 统一配置包、主城页、背包页 | 登录成功后、显示主城前 |
| background | 背包详情、英雄列表/详情、挂机主页 | 主城出现后后台准备 |

其余资源按需加载，预载不代表全部图标/立绘常驻。目录与加载维护见[资源指南](staged-resource-loading.md)，状态和生命周期见[架构](architecture.md)。

## 验证边界与下一步缺口

- 最新实际发布证据是11-14[配置包发布记录](validation/config-package-release-review-20261114.json)，包括19:54完整流程与20:14限定增量；此前“effects拆包后尚无发布证据”的旧结论已过时。该包不能证明11-16恢复代码已在发布版验证；负责人已明确本阶段不做集中构建。
- 当前只有本地远程资源样板，真实CDN HTTPS、可信版本发布/回滚、原生App/微信及目标真机仍待实际交付范围确定。长时内存/GPU、物理弱网、系统后台、进程崩溃和断电没有完整证据。
- 挂机持久恢复已验证真实WS、原生IDB及同库优雅重启；不等于MySQL、所有平台持久存储或断电安全已通过。布阵和主线挑战意图仍主要在内存；pending已清且原battleId随冷启动丢失时，历史反馈无法定位。
- 主线当前只保存/返回基础实际奖励与既有经验展示。升级赠钻已真实到账，但其完整附赠明细不在主线历史回执中，不能靠钱包差补猜；这是下一步可核实并收口的具体缺口。
- 850关只读说明、20关奖励规则投影与前三关可挑战范围分开；全英雄/技能、清心概率、护盾、大型模型裁边及额外奖励表现仍见[战斗问题表](battle-known-issues.md)。
- 只做竖屏；不重新安排横屏、无目标全仓改名或专门拆分RemakeApp。已验证的通用恢复主链不继续无限增加重复矩阵，后续检查围绕真实缺陷或明确平台目标展开。

## 既有证据索引

下列保留各阶段原始证据，不把它们的旧文件数量、开关或提交状态当成当前结论。

| 内容 | 证据入口 |
|---|---|
| 配置包与直接查表 | [包实现](validation/config-package-review-20261114.json)、[真实发布](validation/config-package-release-review-20261114.json)、[直接取用](validation/config-direct-lookup-review-20261114.json) |
| 代码、目录与缓存 | [代码清理](validation/script-cleanup-20261113.json)、[chapter迁移](validation/chapter-resource-move-20261113.json)、[effects迁移](validation/battle-effects-move-20261113.json)、[目录分层](validation/bundle-directory-groups-20261111.json)、[虚拟列表](validation/virtual-list-resource-review-20261111.json)、[缓存](validation/loading-cache-review-20261111.json) |
| 精灵与分类详情 | [精灵领域](validation/spirit-instance-review-20261113.json)、[专用详情](validation/spirit-detail-review-20261114.json)、[精灵原图](validation/spirit-detail-assets-20261114.json)、[装备详情](validation/equipment-detail-review-20261114.json)、[装备原图](validation/equipment-detail-assets-20261114.json)、[道具碎片](validation/item-shard-review-20261114.json)、[道具原图](validation/item-shard-assets-20261114.json) |
| GM及提示 | [第三关/GM核对](validation/gm-bag-battle-review-20261114.json)、[local默认](validation/gm-local-default-20261114.json)、[F9与飘字](validation/gm-toast-review-20261114.json) |
| 奖励事务前置 | [同步/钱包](validation/idle-settlement-prerequisites-review-20261113.json)、[共享发奖](validation/reward-grant-review-20261114.json)、[新累计与回执](validation/main-chapter-idle-claim-review-20261114.json)、[事务说明](main-chapter-idle-settlement.md) |
| 完整输入与计算 | [输入核对](validation/idle-input-review-20261113.json)、[VIP/世界](validation/idle-authority-review-20261113.json)、[神职](validation/idle-clergy-review-20261113.json)、[礼包](validation/idle-gift-review-20261113.json)、[活动](validation/idle-activity-review-20261113.json)、[纯装配](validation/idle-calculation-review-20261113.json)、[控制维护](validation/idle-activity-maintenance-review-20261113.json) |
| 主线历史表现 | [胜利页](validation/victory-review-20261109.json)、[统计](validation/battle-statistics-20261109.json)、[高星](validation/battle-high-stars-20261109.json)、[治疗](validation/battle-healing-20261109.json)、[名称](validation/battle-names-20261109.json)、[外观](validation/victory-appearance-20261109.json)、[挂点](validation/victory-anchor-20261109.json) |
| 挂机演出与规则 | [宝箱](validation/idle-chest-20261109.json)、[850关说明](validation/chapter-reward-info-20261109.json)、[累计/飞行](validation/idle-resources-20261109.json)、[规则审计](idle-reward-rules.md)、[取整边界](validation/idle-rule-boundaries-20261109.json)、[纯加成](validation/idle-bonus-20261109.json)、[输入契约](idle-reward-input-contract.md) |

更早完整过程见[11-13进度快照](validation/development-history-20261113.md)及[11-09主线快照](validation/main-chapter-history-20261109.md)。接下来只按[当前执行顺序](restructuring-plan.md#接下来的执行顺序)推进，不从历史待办重新起一条重复链。
