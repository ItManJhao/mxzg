# 断线后的页面与战斗恢复

更新：2026-11-19。普通断线按现有连接流程重新鉴权，资产通过统一快照恢复。业务请求由对应 Controller 发送和接收。挂机、独立首通和里程碑每次确认发送一次。主线结算保留原战斗编号与展示所需的回执，布阵等待服务端阵容版本，两者均未接入缺推送后的主动鉴权。

后文的2026-11-16本机记录保留旧实现的验证范围。当时使用过的主动补快照或自动重取回执已退役。当前开发顺序见[实施路线](restructuring-plan.md)。

## 先区分两种恢复

| 情况 | 旧版行为 | 新版应保留的边界 |
|---|---|---|
| 同一次应用仍在，短暂断线后自动连上 | 原主场景有效时通常不切页面；已收到战报可继续演出，未收到仍受原等待超时影响 | 鉴权统一快照刷新唯一Model，保留页面和仍有效的临时交互；不重新挑战、不重播普通写请求 |
| 完整回登录、刷新或重启后进入 | 清旧场景/控制器，默认进主城；首次创建/打开主线页时补领未结算首通，下一次挑战也优先补领 | 不持久恢复旧弹窗栈或动画位置；进入主线页后用原battleId确认，复用通用奖励窗；不因主城就绪提前领取 |
| 顶号、封禁或明确身份失效 | 停游戏，停止自动重连，回登录 | AccountController 与 AssetStateBinding 结束旧身份，丢弃旧请求结果 |
| 挂机行军、遇敌、对话 | 冷进入重新组织演出；累计来自服务器时间，不因原演出丢失而清零 | 从最新快照读挂机累计。宝箱本机 local 服的入口按现有配置开放，断线后不自动领取 |

旧源码没有主线跨进程续播、播放帧或原弹窗栈恢复协议。保留原场景是短断线时内存仍在的结果，不能解释为旧版会重建战斗进度。当前正式服H5的断线行为未做故障实测；本批结论限定于指定旧源码与当前源码。

## 旧版真实调用顺序

以下客户端路径相对 G:/work/FsGame/Demo/mj/program/client/cocos_mxzg/client/idle；服务端路径相对 G:/work/FsGame/Demo/mj/program/server/mxzg-server。

### 短断线自动恢复

1. SocketClient接收失败或关闭后，NetManager每7秒尝试连接；成功时清发送缓存，只重发登录。恢复普通业务缓存的代码已注释，不能照搬成自动重发队列。
2. Native.sendReqLogin发送原登录凭据；RoleResponse.login请求角色信息。
3. RoleResponse.roleInfo在MainScene仍运行时更新余额和经验；没有跨reset_time通常直接返回，不切场景、不重新请求整套初始化。跨重置时间会继续初始化请求，但仍没有重建当前页面的调用。
4. 连接连续失败达到hosts数量乘2后停游戏，弹框确认再回登录，进入清理旧场景的完整登录流程。

依据：frameworks/runtime-src/Classes/AutoRun/NetManager.cpp:42–107、226–271；src/native/Native.lua:421–439；src/net/RoleResponse.lua:28–57、72–145；frameworks/runtime-src/Classes/Model/Game.cpp:108–130、492–505。

旧心跳每5秒检查，20秒未更新发心跳，超过40秒且不在支付时关闭连接；实际条件优先于旁边的旧注释。AppDelegate切后台/前台只停启动画及音频，没有直接重登或切场景。依据：frameworks/runtime-src/Classes/Model/Game.cpp:430–479、frameworks/runtime-src/Classes/AppDelegate.cpp:275–317。等待战报还有7000毫秒超时，见src/comp/BattleReportBaseLayer.lua:72及src/layer/battle/BattleMissionLayer.lua:51。

### 完整重新进入

1. stopTheGame停止网络；Update/Logo流程清角色、控制器和缓存，再进入Loading。
2. 登录初始化分别请求角色、背包、英雄、阵容、关卡和挂机信息。
3. MainSceneCtr.enter默认主城，并登记主线为保留页面类型。addKeepLayer在当前不是该页时直接返回，不创建隐藏BattleLayer。
4. 玩家首次打开主线页时，changeLayer才通过createLayerWithType实例化BattleLayer；其onCreate先创建挂机层，再发送3002主线结算。没有内存战报时，BattleResponse.chapterEnd在非引导状态打开通用ItemRewardCtr；有非nil战报则走原胜利页，但该分支没有严格校验是否属于当场战斗。

依据：src/native/Native.lua:192–219；src/scene/LogoSceneCtr.lua:95–102、750–781；src/scene/LoadingSceneCtr.lua:173–175、213–252；src/scene/MainSceneCtr.lua:889–905、1044–1053、1260–1264；src/config/mainscenepage.lua:233–236；src/layer/battle/BattleLayer.lua:202–207；src/net/BattleResponse.lua:18–46。3002的初始化发送者是实际创建的BattleLayer，RoleResponse只请求3007关卡与3004挂机信息。登记保留类型不能证明登录时已创建该页面。

### 主线胜负、结算和战报

| 节点 | 旧实现 | 恢复含义 |
|---|---|---|
| 3001挑战 | 服务端一次算完整战斗；胜利先保存chapterId和receiveReward，再回战报 | 断线不撤销已经保存的胜利；不能重新挑战来猜上一次是否执行 |
| 3001遇旧待领奖 | 直接调用missionEnd后返回 | 新请求不得绕开上一次未结算奖励直接跨关 |
| 正常演出胜利 | 发3002，每2秒重发，收到BATTLE_END才停止；3002响应后才开胜利页 | 页面确认按钮不承担资产结算；旧无限重试机制不照搬 |
| 3002领取 | 无待领直接忽略；有待领清标志、发首通、回奖励 | 旧版没有持久结果回执，成功后丢响应只能靠重登读当前资产，不能称为可靠反馈恢复 |
| 冷重登后首次打开主线页 | 创建BattleLayer时发送3002补领；没有战报且非引导时走通用奖励窗 | 不要求玩家点击恢复并重看战斗才拿奖励；回主城本身不触发此创建链 |
| 查看旧战报 | 通用3102需显式battle_id/type，主线挑战路径没有保存到该通用链 | 不能把竞技等模块回放当作主线自动续播依据 |

依据：mxzg-gameserver/src/main/java/com/ayjs/mxzg/gameserver/module/battle/handler/BattleHandler.java:253–317、722–755；mxzg-gameserver/src/main/java/com/ayjs/mxzg/gameserver/module/battle/domain/RoleMission.java:21–45；客户端src/layer/battle/BattleMissionLayer.lua:34–51、src/layer/BattleEndCtr.lua:34–61、513–515、src/layer/battle/BattleReportCtr.lua:7、54–67。旧DAO/actor在进程崩溃边界的原子性本批未证明。

挂机3006只是演出战报，3005才按服务器startTime结算；冷进入BattleIdleLayer重置缓存和首场行军，不持久化对话或战斗帧。依据：mxzg-gameserver/src/main/java/com/ayjs/mxzg/gameserver/module/battle/handler/BattleHandler.java:323–410；客户端src/layer/battle/BattleIdleLayer.lua:44–116。

顶号有明确GResOffline→stopTheGame→确认回登录链。旧客户端loginExpired检查已注释，所核旧登录服务只校验签名，不能将新版明确的令牌过期处理称为旧版已存在机制。依据：src/net/RoleResponse.lua:665–724；frameworks/runtime-src/Classes/Model/Game.cpp:445–455；服务端mxzg-gameserver/src/main/java/com/ayjs/mxzg/gameserver/module/role/handler/LoginHandler.java:93–104、137–145。

## 当前实现入口

| 能力 | 职责 |
|---|---|
| 连接与重新鉴权 | `GameSocketClient` 负责正常重连、前后台和连接代次 |
| 身份 | `AccountController` 与账号连接通道向当前登录交付响应，退出和换号后撤销旧结果 |
| 权威角色、背包、主线和阵容 | `AssetStateBinding` 校验并批量提交统一登录首包、重新鉴权首包和 `state.changed`。各 Controller 更新自己的 Model |
| 主线协议与奖励 | `MainChapterController` 处理挑战、结算、战报、挂机和独立通关奖励。`MainChapterSession` 负责装配，`IdleClaimBinding` 负责宝箱点击和满额确认 |
| 阵容 | `FormationController` 发送保存、记录成功版本，`HeroRosterModel` 持有快照中的权威阵容。`FormationView` 管理未提交草稿 |
| 通用反馈与窗口 | 通用奖励队列按回执编号去重，等对应资产版本和界面就绪后展示。页面关闭时清理自己的监听和子窗 |

## 主线结算

1. 正常演出结束后，主线控制器按原 `battleId` 结算。在当前应用内等到同一编号的 SETTLED 回包与足够新的统一快照后确认，原结算历史的余额和经验只用于展示。正常胜利页显示基础奖励与经验，关闭后将原回执的附赠交通用奖励。
2. 收到 SETTLED 回包但缺状态推送时，等后续正常推送或重新连接后的鉴权首包。缺回包时，玩家可返回主线确认原结算。主线不为丢包主动重连、发送新挑战或自动重取回执。
3. 冷登录先到主城。只在首次打开主线页且首包仍有当前待结算编号时，才按该编号结算。其实际基础量和附赠由通用奖励窗展示一次，和正常胜利页的归属互斥。已提交且服务端已清待结算时，冷首包会恢复真实资产，应用没有原编号和历史展示内容。
4. 通用奖励已排队但未显示时，可以通过原入口重试展示。开窗成功才确认展示，关页清理本页视觉状态，重复快照及通用奖励通知不会再开同一结果。

`ChapterReceipt.actual` 保存新结算的实际发放及升级附赠，老回执缺明细时展示原 `rewards`。第15关里程碑是独立领取，直接用真实回包交付通用奖励。[旧源码审计](validation/chapter-reward-legacy-audit-20261116.json)及[原首次进入验收](validation/chapter-reward-preview-20261116.json)

## 布阵保存

点击确认只发送一次草稿。成功回包记录服务器阵容版本，等正常推送或重连首包中的权威阵容达到该版本才结束等待。没有成功回包时，提示查看同步的阵容。快照保持唯一权威，没有客户端持久原单、查询回执、主动补快照或自动重发。

未保存草稿在同一窗口和阵容版本下可保留，离开页面清理本页提交后出战意图。只在原点击仍然有效且最新阵型、站位与草稿匹配时继续一次出战。冷重登重建页面，显示完整快照下发的阵容。

## 普通领取后的断线

挂机、首通和里程碑由 Controller 处理一次即时请求，正常推送与鉴权首包更新已领状态、钱包和库存。领到的即时回包可以正常进入通用反馈。挂机同笔实时奖励通知仍可进入队列，按原回执编号去重。原回包与通知都丢失时，重连恢复实际资产，没有旧结果补播。更多例子见[挂机累计与领取](main-chapter-idle-settlement.md)。

## 历史检查记录

以下为2026-11-16各批次的原实现证据。历史记录中的定向故障注入、主动鉴权、重试同步或自动取原回执描述的是当时版本。当前提交和分支以 Git 为准。各批次的真实浏览器、控制台与测试范围分开记录，实际 OS 切后台、小时级离线、真机、MySQL、APP、微信及崩溃断电未在该矩阵验收。[旧方案审计](validation/reconnect-recovery-audit-20261116.json)、[历史首次进入专项](validation/chapter-entry-recovery-review-20261116.json)及[历史双确认专项](validation/battle-settlement-review-20261116.json)

### 统计与详情叠窗检查

#### 已修正的关闭与迟到边界

- ChapterEndView原先在关闭时无条件按bag-info全局id清理，会误关其他来源持有的详情；奖励、背包和英雄详情的父关闭也缺少统一的在途子窗取消。本批用现有UIManager.openChild/closeChildren收敛归属，父页只清自己仍持有的意图或实例。普通open或其他父页后来接管后，旧父页不能误关；已关父页的迟到调用在接管前拒绝。
- 同id在途打开共用一次加载，但原来只保留最早参数；调用方open.then(runOpen)又让旧续段覆盖后来选择。现在末次参数由框架提交，结算/奖励、背包三类详情及英雄技能入口去掉重复runOpen和全局按id误关，旧成功、失败及finally均按意图或任务身份收口。
- BaseView.onViewClose复用EventScope，子窗关闭或转交时提前解除父页登记，不因反复打开积累监听。统计仍使用独立open，不随结算倒计时关闭；BattleDetailLayer静态按钮和视口绑定仅onBind一次，子节点已销毁时不再访问其输入处理器。
- onOpen内部beginOpen后同步关闭时，业务可能不会兑现ready；waitResidentReady在登记等待前检查已关闭状态，避免错过取消出口而一直挂起。该叠窗批次只有反例覆盖；后续主线奖励本机批次已确认这一保护编译为true，验证范围仍按各自记录区分。

#### 实际浏览器分钟级离线与多次重连

Creator本机预览连接随机独立内存H2、真实WS＋Protobuf。浏览器CDP离线使用真实墙钟等待，不推进虚拟时间；两次分别为118.0458秒和97.5371秒。该模拟只改变本测试浏览器网络条件，后续主动关闭的也只是本测试Socket，不等于操作机器网络设备或OS后台。

| 场景 | 已观察结果 | 打开与验证边界 |
|---|---|---|
| 首关真实结算后，现有ReportButton派发两次CLICK | 只保留统计Comp.4888；父结算倒计时关闭后统计仍在。离线118.0458秒后自然恢复，再三次Socket关闭/自动鉴权，始终同实例、同冻结units/names，资产版本5不变；主动关闭后resident和打开意图为0 | 通过现有报告按钮处理函数触发，没有另建统计入口，不重算或重新挑战 |
| 背包900102详情上叠当前真实战报统计 | BagInfoView为Comp.12435，上层统计为Comp.12511；离线97.5371秒后恢复，再三次Socket重连，两窗实例及内容均不变，共享modalNodes始终1。关上层统计后下层详情保留；用现有UI导航进入英雄，Bag父页关闭后子详情及意图均清空 | 上层统计使用既有UIManager入口传同一真实冻结报表进行调试调用，不代表新增业务按钮或伪造资产 |
| 英雄详情内打开实际技能说明 | 实际按钮点击后，再重复CLICK两次及三次Socket重连，仍是HeroSkillView Comp.13207。全局事件listeners=3、targets=3不增长；返回英雄列表关闭父页后，resident/opening/pending/意图/modalActive均为0 | 技能内容来自当前真实英雄与既有配置，只检查显示与关闭，不开放升级或其他养成 |

从第一次离线开始计数，鉴权回包共11次，即两次离线后的自然恢复及三组共九次主动重连；该区间challenge、claim、新结算页和通用奖励窗打开均为0，没有重复发奖/结果展示。离线期间记录20条预期挂机遇敌NOT_READY警告，约每6秒一次，没有清理错误；不将其写成全程零告警。对应[统计恢复截图](images/overlay-statistics-reconnected-20261116.jpg)、[详情叠窗截图](images/overlay-stack-reconnected-20261116.jpg)、[技能恢复截图](images/overlay-skill-reconnected-20261116.jpg)，完整实例、计时和计数见[本机证据](validation/overlay-lifecycle-preview-20261116.json)。

#### 专项结果、编译范围和未完成项

最终十五套相关专项及严格Creator类型通过；overlay-lifecycle为10/10，page-lifecycle-recovery为9/9，后者新增两组连续三次BUSY鉴权失败后恢复。针对同步onOpen关闭的第十组反例，临时编译输入移除waitResidentReady入口保护后按预期失败，工作区源码没有回退。详情归属转交、同id末次参数、旧失败不清新选择、加载失败后解除父登记、节点先销毁、迟到图片与重复打开等受控分支和实际浏览器主路径分别记录，见[最终检查记录](validation/overlay-lifecycle-review-20261116.json)。

该叠窗批次唯一一次刷新后的Creator编译包含openChild、closeChildren及“已关闭owner在转交前拒绝”，实际浏览器证明以上主路径。同步onOpen关闭ready保护在该批次写入更晚，最后重载的编译特征仍为false，因此当时仅记录专项通过。这一历史范围不修改；后续主线奖励批次已读到保护为true并完成正常/冷恢复关闭链限定复验，不能将其混写成原长断线矩阵已按新源码全部重跑。

网络配置与临时钩子已还原，临时浏览器标签已关闭，自有独立服PID3652已核归属停止。本批源码修改仅七份现有UI生命周期文件，没有新增协议、Prefab、UUID或资源清单；没有Maven、集中构建、提交、推送或main合并，领取入口及日常开关继续关闭。小时级离线、OS后台、真机、MySQL、原生APP/微信、崩溃与断电仍未验证；下一步按实际目标补这些边界，不扩展未授权玩法。

### 前批页面切换与前后台矩阵

Creator本机预览连接独立内存H2及真实WS＋Protobuf，沿用既有页面、原回执和唯一快照。各组分别记录请求与窗口数，不把第一关的历史结算和第二关冷恢复混为同一次操作。完整原编号、实例标识及计数见[本机记录](validation/page-lifecycle-preview-20261116.json)。

| 本机场景 | 实际结果 | 本组边界 |
|---|---|---|
| 未保存布阵草稿后重复hide/show | 服务器站位2、本页草稿3；同一FormationView、元素1筛选及当前英雄选择均保留。一次鉴权，零保存、零挑战 | 只恢复同身份同阵容版本的内存草稿，不把它写入服务器 |
| 关闭布阵后切背包，主动关闭本测试Socket，再切英雄 | 自动重连只一次鉴权，没有保存或挑战；重开布阵回到服务器站位2，旧草稿不复活 | 此组关闭的是独立测试环境的真实本地连接，不是切断机器网络 |
| 首关结算已提交，SETTLED回包在Socket接收前丢弃，并触发重复hide | 真实提交快照版本5已到而内存回执仍为BATTLE。切背包再show后，按原battleId重取SETTLED，版本仍5且confirmed，背包不弹结果、presented仍false。再跨主城/英雄返回主线明确确认，只开一次胜利页 | 阶段共一次初始challenge、两次claim请求（原提交与原编号重取，只有重取回包交付）、两次鉴权、一次只读replay、一次胜利页，零通用奖励窗；不能把原回执重取写成二次发奖，也不能把replay记为零 |
| 第二关已有pending后真实重载，再首次进入主线恢复 | 原pending编号和资产版本6保留；冷主城不claim，首次进入主线才一次原编号claim至版本7，经真实RewardBinding打开一个通用奖励窗。窗口前后台后仍同一实例；显示中和关闭后各重复restore同份历史反馈两次，并重复交付同一真实鉴权首包三次，acceptedCount始终1。最终队列为空、residents=0、modalActive=0 | 此恢复阶段claim一次、鉴权两次、通用奖励窗一次，challenge/replay/胜利页均零；重复的是已确认反馈，不伪造reward.granted事件 |

第三组胜利页打开后立即重复hide/show，返回前台仍为同一结果实例；再把该真实鉴权首包经既有onReady回调重复交付三次，没有新claim或第二次开窗。第四组反馈重放使用真实RewardBinding.restore并保留原回执内容；实时reward.granted重复事件另由通信组合专项覆盖，两种证据分开记录。

[草稿保留画面](images/page-recovery-draft-20261116.jpg)、[待确认结算画面](images/page-recovery-settlement-pending-20261116.jpg)及[通用奖励画面](images/page-recovery-reward-20261116.jpg)分别对应本批检查过程，不替代完整计数和实例证据。

本批新增page-lifecycle-recovery七组通信组合：真实GameSocketClient、AccountService交付、AssetStateBinding与生产Controller共同处理重复hide/show、无ACK保存中断（提交前/已提交）、ACK后鉴权被再次hide、无回执结算中断、结算回执后的鉴权中断和反馈去重。其Socket替身只控制真实Protobuf信封的交付顺序，不复刻业务计算或数据库事务；页面宿主可用性单独控制，不在hide中另改ready。反馈组合只证明原RewardController/Model队列去重，实际RewardBinding归属、onPresented和真实窗口收口由本机第四组及原装配专项证明。新增真实Prefab检查另覆盖未保存草稿的站位、选择和元素筛选在同版本名册提交及重复通知后不变，零保存/鉴权；关闭重开回权威站位，旧submitted不复活。含上述检查在内十套相关专项及严格类型通过，见[本批检查记录](validation/page-lifecycle-review-20261116.json)。

自有独立测试进程PID5720已核归属停止，故障探针和监听已还原。本批没有修改业务、协议、Prefab或Java，没有重跑Maven、集中构建、提交、推送或合并main；领取入口及日常开关继续关闭。

这些前后台由引擎EVENT_HIDE/SHOW模拟，不是实际OS切后台；主动关闭本地Socket也不等于物理弱网。中断注入会产生预期SUSPENDED，本批没有逐条审计全部控制台警告，因此不宣称全程零warn/error。真实OS前后台、长时弱网、MySQL、APP/微信、目标真机、进程崩溃，以及统计页/叠窗等剩余组合仍待后续；已提交且pending已清、内存编号又丢失的跨重启历史定位仍是缺口。

### 前批布阵专项与限定本机复验

formation-recovery专项26/26及原formation-state、formation-view专项通过。已覆盖ACK/统一状态两种先后顺序、失败及旧首包、每轮一次鉴权、同步回调重入、重复点击合并、原编号和参数保留、ACK后的同步重试不再保存、页面编辑锁定、关页与刷新在途重开，以及换号、退出、同角色重登后的旧续段隔离。真实Prefab专项还核对“重试同步”可用和真正双确认后只继续一次出战。

Creator本机预览连接独立内存H2及真实WS＋Protobuf，第二轮把原版本2的站位3改至2，在GameSocketClient.onState交付边界仅丢弃一条真实state.changed版本3，不修改请求、权威Model或服务端数据。ACK版本3到达时本地权威阵容仍为2，pending保留；随后一次session.authenticate首包使权威阵容达到3，ACK与pending清空，busy=false。该故障轮仅一条保存回包、一次鉴权、一次战场和一次胜利页打开，warn/error为0；探针已还原。证据见[布阵确认本机记录](validation/formation-confirm-preview-20261116.json)、[恢复后画面](images/formation-confirm-recovered-20261116.jpg)。第一轮版本1→2仅属于准备和正常保存路径，不计作缺推送故障证据。

本机复验仅覆盖应用交付边界单条推送缺失，不等同于实际网络丢包。鉴权失败、旧首包、并发重试、关页重开及身份切换组合仍仅由专项覆盖，未完成真机、MySQL、实际OS后台、APP/微信或进程崩溃验证。下列首次进入和主线双确认记录保持各自原验收范围。领取入口及日常开关继续关闭，没有集中构建、提交、推送或合并main。

### 前阶段首次进入验证

新增入口专项22/22，奖励装配专项21/21（新增9组、原12组保留）；相关客户端回归及严格类型见[本批记录](validation/chapter-entry-recovery-review-20261116.json)。已覆盖冷候选、暖状态排除、实际View路由、双确认、反馈入队/真正展示、原队首重试、空结果、投影失败和旧作用域迟到。

Creator独立内存H2/真实WS中，真实挑战保存battleId后立即重载：首包pending原编号/版本4；登录及主城停留时没有claim，队列为空。首次进入主线页才一次claim，原回执与快照同为5，只打开一个RewardView；该恢复阶段零新挑战、零chapter.replay、零战场/胜利页。空白关闭后回主城再进入，版本5、acceptedCount=1均不变。随后正常第二关仍以battle归属开ChapterEndView，版本7，通用队列仍只接纳前一笔；无新warn/error，独立服已停。见[真实重载记录](validation/chapter-entry-preview-20261116.json)。

本批未修改Java或协议，后端复用前批已编译的独立宿主，未重跑Maven。没有执行或验收新的集中发布包；预览失败重试/换号/单独丢包由专项覆盖，不冒充Creator故障注入。真机、MySQL、实际OS后台、APP/微信、崩溃断电及其他页面恢复仍未完成；领取入口及日常开关继续关闭，未提交推送。

### 前阶段双确认验证与限制

原核对阶段六套既有专项的结果继续保留。本批新增main-chapter-settlement共17组反例；原main-chapter窗口测试改为独立交付回执与状态，不再用同步写两者的替身掩盖缺口。包括该两套在内七套客户端专项、严格类型通过；两个既有Java领域/Socket类11项本次通过，真实三关回执与快照版本4/4、6/6、8/8，重复claim不再次改资产。

Creator 393×852选项、1280×720浏览器与随机内存H2/真实WS完成两场：正常结算版本5/5；第二场服务端已保存战报后发送引擎EVENT_HIDE，演出结束保留同battleId、pending/version6，不开结果窗；EVENT_SHOW后重新鉴权，以同battleId结算至版本7并实际打开一次结果窗、返回挂机。两场各一条成功claim回包、各一个ChapterEndView打开记录，没有新warn/error。用的是引擎事件模拟，未操作系统后台；预览后续重进主城仍为最高2/版本7，不再次结算。独立测试进程已核归属停止。

未在Creator注入单独丢回执/推送，未完成正式服H5、真机、MySQL、原生/微信后台、崩溃断电或完整页面恢复；没有集中构建。领取入口及日常开关仍关闭，全部新增修改留hao本地，未提交、推送或合并main。
