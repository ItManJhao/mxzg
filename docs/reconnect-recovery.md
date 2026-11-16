# 断线后的页面与战斗恢复

更新：2026-11-16。已修正详情归属、准备期末次参数与统计重复绑定，并补战报统计/详情叠窗的实际分钟级断线及多次重连检查，范围见[叠窗检查](validation/overlay-lifecycle-review-20261116.json)、[本机记录](validation/overlay-lifecycle-preview-20261116.json)。最终追加的onOpen同步关闭保护仅由专项覆盖，所记录Creator预览尚未编译到该边界，不将本机主路径写成所有最终源码已验。领取入口继续关闭；本页后文的“本批未提交”等描述保留对应验证批次的历史事实，当前Git状态以实际分支为准。后续顺序统一见[实施路线](restructuring-plan.md)。

前批页面切换、引擎前后台及重复反馈的四组矩阵见[组合检查](validation/page-lifecycle-review-20261116.json)、[本机矩阵](validation/page-lifecycle-preview-20261116.json)。旧依据见[原核对](validation/reconnect-recovery-audit-20261116.json)，同次应用主线双确认见[原记录](validation/battle-settlement-review-20261116.json)；首次进入及展示互斥见[前阶段记录](validation/chapter-entry-recovery-review-20261116.json)、[真实重载预览](validation/chapter-entry-preview-20261116.json)，布阵单条推送缺失见[前批本机记录](validation/formation-confirm-preview-20261116.json)。各阶段保留原指纹和验证范围，不以最新修复替换历史证据。

## 先区分两种恢复

| 情况 | 旧版行为 | 新版应保留的边界 |
|---|---|---|
| 同一次应用仍在，短暂断线后自动连上 | 原主场景有效时通常不切页面；已收到战报可继续演出，未收到仍受原等待超时影响 | 鉴权统一快照刷新唯一Model，保留页面和仍有效的临时交互；不重新挑战、不重播普通写请求 |
| 完整回登录、刷新或重启后进入 | 清旧场景/控制器，默认进主城；首次创建/打开主线页时补领未结算首通，下一次挑战也优先补领 | 不持久恢复旧弹窗栈或动画位置；进入主线页后用原battleId确认，复用通用奖励窗；不因主城就绪提前领取 |
| 顶号、封禁或明确身份失效 | 停游戏，停止自动重连，回登录 | 继续使用AccountService和AssetStateBinding结束旧身份；新角色不能接收旧请求结果 |
| 挂机行军、遇敌、对话 | 冷进入重新组织演出；累计来自服务器时间，不因原演出丢失而清零 | 演出生命周期与资产命令分离，重新读已接纳的挂机状态；玩家宝箱入口仍关闭 |

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

## 当前可以直接复用什么

| 已有能力 | 唯一职责与入口 |
|---|---|
| 连接、前后台及旧通道隔离 | platform/GameSocketClient.ts：自动重新鉴权、连接代次、拒绝旧回包；不自动重放业务命令 |
| 身份交付和失效 | features/account/AccountService.ts：deliverAuthenticated只交付当前身份结果，超时不当成换号 |
| 完整资产与版本 | app/remake/AssetStateBinding.ts：校验完整首包再批量提交；同版本authenticate仍校准时钟；不补查库存 |
| 页面生命周期 | RemakeApp及RemakeNavigation：普通断线不改role/busy，保留页面；身份变化统一关闭旧页并重置模块 |
| 主线结果 | MainChapterService：requestId挑战幂等、持久pendingBattleId/战报、battleId结算幂等；settlement_json存在直接返回原结果 |
| 回执与当前状态分权 | MainChapterController/Model：receipt只供历史结果展示，state来自统一快照；历史经验不覆盖当前角色 |
| 缺状态兜底 | GameSocketClient.refreshSnapshot：有界重建通道并等鉴权首包，不增加inventory.list/session.sync |
| 布阵确认 | FormationController/FormationSaveModel：保留原保存意图与ACK版本，等HeroRosterModel统一阵容确认；有ACK后仅重试鉴权同步 |
| 通用反馈 | RewardBinding、RewardController/Model、RewardView、ConfirmView：排队、去重、主城就绪后显示和关闭清理 |
| 挂机原请求恢复 | IdleClaimBinding/Journal/MainChapterIdleClaimController：持久保存原请求、查询服务端历史回执、等待统一快照双确认；Journal不持久保存回执，也不代表主线挑战已有跨重启journal |

审计、双确认和首次进入各阶段指纹分别保留；首次进入阶段指纹见[前阶段记录](validation/chapter-entry-recovery-review-20261116.json)，不能以旧指纹匹配本批布阵实现。模块文件相对client/assets/scripts；View只展示与提交意图，不比较账号或直接收协议。

## 已接通的同次应用双确认

- MainChapterModel.settlement保存原battleId、确认阶段、presentation归属、通用反馈是否入队及是否实际展示。页面关闭保留，身份重置清空；历史结果仍复用receipt，不保存第二份资产或跨重启journal。
- 演出结束后MainChapterController.claim合并同编号在途任务。只有匹配SETTLED回执、当前快照revision至少达到回执版本、该战斗pending已清及通关进度不倒退，才标记confirmed。pending为空或Promise结束都不单独代表成功。
- 有回执但缺状态，每次确认尝试最多调用一次现有refreshSnapshot；其鉴权同步回调只观察，不递归刷新。仍缺失保留pending，显式重试才再开始一轮。缺回执则鉴权首包被应用完整接纳后恢复原battleId，不发新challenge。
- RemakeApp在assets.apply接纳后调用afterSnapshot，刷新也走deliverAuthenticated。任务对象只合并同一业务操作，重置撤销旧续段；不在模块保存账号键或会话代次。
- MainChapterBattleView等待双确认再开既有ChapterEndView，奖励/经验均来自原回执。重复结束和重复快照只开一次；打开过程中关页会取消准备并关闭迟到实例。实际打开后才登记presented。
- 关页后尚未展示的结算，即使服务器pending已清，主线仍保留“确认结算”入口，只恢复本应用原结算，不强制重播。合法challenge返回SETTLED也走相同确认；原战斗回放及失败不再次发奖。

正常胜利页继续按battle归属展示；冷恢复按下节reward归属交同一通用队列。后端无需变更，原battleId结算本身已经持久幂等。

## 已接通的首次进入恢复与反馈归属

1. 首个已接纳SESSION_LOGIN/AUTHENTICATE只记录entryRecovery候选，不结算。后续推送和暖重连不替换候选；首次打开MainChapterView才调用recoverPendingOnEntry并消费候选。
2. 候选须仍是当前pending，且本应用无挑战编号、战报、回执、既有结算或在途操作，才以reward归属创建意图。已有本地战斗保留原恢复路径，cache:false导致的重新建View也不会抢成冷恢复。
3. 原claim及快照双确认后只交一次通用反馈。RewardBinding.restoreItems合并实际正数量、过滤0，使用原battleId作receiptId及原回执版本；当前角色归属仍由应用读取。没有正奖励则明确完成，不伪造空条目。
4. feedbackQueued只表示交给RewardModel；其队列失败保留、显式retry继续复用。onPresented只在同展示作用域窗口真正打开后回调，应用再按编号和reward归属登记presented。准备失败不假称已展示，按钮只重试显示，不重新claim/replay。
5. battle与reward归属在异步确认前固定，各阶段保留。正常胜利页只消费battle，通用恢复窗只消费reward；错误创建的同编号战场会自行关闭。首次主线已处理后再次开页不会重复弹奖，身份重置清候选和过程，旧请求/窗口不能影响新身份。

恢复窗只使用当前chapter.claim协议已有的基础实际奖励；升级赠钻未在此回执中，不能从钱包差量补猜。跨重启时pending已清且本地编号丢失的纯反馈中断仍不能定位，不在本批宣称恢复。

## 已接通的布阵缺推送确认

1. FormationSaveModel.pending保留原requestId、expectedVersion、阵型与站位参数，直到收到匹配ACK且HeroRosterModel中的统一阵容版本达到acknowledged。ACK只提交保存进度，不写权威阵容；统一状态先到时可在ACK到达后直接确认，无需再次鉴权。
2. ACK已到而统一状态不足时，每轮至多调用一次现有GameSocketClient.refreshSnapshot，复用重新鉴权首包及AssetStateBinding的整包校验、批量提交。同步onReady和名册事件只观察版本，不递归启动下一轮鉴权，也不新增阵容或库存查询。
3. 鉴权失败、仍是旧阵容或未装配鉴权入口时，保留原pending、ACK版本及请求编号，结束本轮busy并显示“重试同步”。明确点击只再开始一轮鉴权，不重发formation.save、不生成新编号。没有ACK的未知结果仍只允许原编号、原参数重试保存。
4. 未确认期间提交参数保持只读，不能改英雄、阵型或站位；同步重试按钮独立可用。FormationView从原pending恢复提交草稿，旧首包不覆盖它。模块先登记任务再交付，重复点击合并同一任务；重置后的旧回调与异步续段不能覆盖新任务。
5. 关页保留模块待确认意图，但清理页面监听及本页出战意图；重开可继续查看原参数和明确重试同步，不自动挑战。身份结束由应用统一关页、重置模块和清空任务，同角色显式重登也不会接续旧身份结果。
6. 主线出战只有当前页面明确提交过草稿，并同时确认匹配ACK、足够新且阵型与站位匹配的权威阵容后，才继续一次出战。单独ACK、Promise结束、关页或重开均不代表可以挑战；确认进度始终归FormationSaveModel，权威阵容仍唯一归HeroRosterModel。

## 原审计问题与当前状态

前阶段主线及布阵问题均已接线并由专项覆盖；布阵单条状态交付缺失已在前批完成一次鉴权确认。本批另验未保存草稿、真实Socket关闭后切页、结算回执交付前中断、胜利页及通用奖励窗的前后台保留和重复反馈，具体范围见下方矩阵。前后台仍为引擎事件模拟，失败、旧首包及身份组合继续按专项范围记录，不能解释为实际网络弱网演练。

| 优先级 | 条件与当前结果 | 必须补齐的行为 |
|---|---|---|
| 1：已接 | 演出完成时连接未就绪 | 保留原battleId与待确认状态，不开假成功页；鉴权接纳后继续原结算 |
| 1：已接 | claim已提交、快照先清pending但SETTLED回包丢失 | 鉴权后按原battleId重取原回执，关闭后也保留确认入口，不依据pending为空猜成功 |
| 1：已接 | BATTLE回执到、挑战推送缺失 | 由原回执定位战斗；演出结束仍确认该战斗，历史state不覆盖当前资产 |
| 1：已接 | SETTLED回包到、资产推送缺失 | 只保存回执，等待足够新快照；一次有界鉴权仍不足则保持pending，不交付奖励/经验完成反馈 |
| 2：已接 | 冷首包有pending且首次进入主线页 | 只确认首包原编号并复用通用奖励窗，不强制回放、不开下一关，也不提前到主城结算；展示归属与正常胜利互斥 |
| 2：已接，单条推送缺失本机已验 | 布阵成功回执已到、提交推送缺失 | 保留原pending与ACK版本，每轮一次统一鉴权；失败或旧首包可明确重试同步，期间锁定提交参数，双确认后才继续出战。失败/旧首包/身份组合仅专项覆盖 |
| 3 | 冷启动时结算已提交且pending已清空，内存battleId也消失 | 当前快照不能定位旧结算。旧版同样无反馈重取；如要求跨重启补显示，须单独明确持久意图及展示确认边界，不能声称现有快照已经能做 |

普通断线时布阵同版本快照保留草稿；没有待确认操作时，外部阵容版本改变按已有FormationView规则载入新状态。有待确认操作则先保留原提交参数，统一版本确认后再处理最新阵容。冷重登清临时草稿符合旧场景清理方向。旧版完整阵容草稿恢复没有逐分支核实，不把现代请求幂等描述为旧实现。

## 按这个顺序接线

1. **同一次应用内的主线双确认已接通。** 原battleId、原挑战requestId和receipt分别确认，缺状态有界鉴权、重连后恢复、关页保留、实际展示去重已限定验证；不把这项扩成所有页面或跨重启恢复已完成。
2. **首次进入主线页的待结算与通用反馈已接通。** 首包候选、进入消费、双确认、原UUID/版本、固定展示归属和实际开窗回调已限定验证；首通服务端仍静默，不伪造reward.granted、不另造奖励窗。跨重启且已清pending的历史定位仍未接。
3. **阵容保存缺推送确认已接通并限定本机复验。** 原保存意图保留至ACK和统一阵容版本确认；每轮一次鉴权，失败或旧首包仅允许明确重试同步。Creator已验单条真实状态交付缺失后的恢复；页面开关、任务重入、鉴权失败、旧首包、同角色重登及旧续段仍按专项范围记录，不增加通用业务重发队列。
4. **本机页面/前后台矩阵及统计/详情叠窗已限定通过，继续补目标平台边界。** 前批覆盖未保存布阵、切页期间真实Socket关闭、结算提交后回执未交付，以及胜利页/通用奖励窗的引擎前后台和重复快照/反馈。本批补浏览器真实墙钟118秒和97秒离线、统计与详情/技能窗口多次重连、父关闭和末次参数归属。真实OS前后台、小时级离线、真机及挂机遇敌/对话的完整组合仍待后续；分别核资产只变一次、反馈只出现一次、没有误出战和旧身份迟到。保持当前玩法范围，集中构建继续按负责人要求跳过。

前三步没有新增协议、资产Model或资源清单。页面矩阵阶段只补检查工具与文档；本批按已发现问题收敛现有UIManager/BaseView及调用页面的生命周期，没有新增业务恢复层。接下来按平台补足实际弱网及剩余页面组合，不扩展养成等未授权玩法。跨重启且已清pending的“补画面”仍不擅自增加journal或协议字段。

## 本批统计与详情叠窗检查

### 已修正的关闭与迟到边界

- ChapterEndView原先在关闭时无条件按bag-info全局id清理，会误关其他来源持有的详情；奖励、背包和英雄详情的父关闭也缺少统一的在途子窗取消。本批用现有UIManager.openChild/closeChildren收敛归属，父页只清自己仍持有的意图或实例。普通open或其他父页后来接管后，旧父页不能误关；已关父页的迟到调用在接管前拒绝。
- 同id在途打开共用一次加载，但原来只保留最早参数；调用方open.then(runOpen)又让旧续段覆盖后来选择。现在末次参数由框架提交，结算/奖励、背包三类详情及英雄技能入口去掉重复runOpen和全局按id误关，旧成功、失败及finally均按意图或任务身份收口。
- BaseView.onViewClose复用EventScope，子窗关闭或转交时提前解除父页登记，不因反复打开积累监听。统计仍使用独立open，不随结算倒计时关闭；BattleDetailLayer静态按钮和视口绑定仅onBind一次，子节点已销毁时不再访问其输入处理器。
- onOpen内部beginOpen后同步关闭时，业务可能不会兑现ready；waitResidentReady在登记等待前检查已关闭状态，避免错过取消出口而一直挂起。该最终追加边界有反例覆盖，未假称本机已经编译复验。

### 实际浏览器分钟级离线与多次重连

Creator本机预览连接随机独立内存H2、真实WS＋Protobuf。浏览器CDP离线使用真实墙钟等待，不推进虚拟时间；两次分别为118.0458秒和97.5371秒。该模拟只改变本测试浏览器网络条件，后续主动关闭的也只是本测试Socket，不等于操作机器网络设备或OS后台。

| 场景 | 已观察结果 | 打开与验证边界 |
|---|---|---|
| 首关真实结算后，现有ReportButton派发两次CLICK | 只保留统计Comp.4888；父结算倒计时关闭后统计仍在。离线118.0458秒后自然恢复，再三次Socket关闭/自动鉴权，始终同实例、同冻结units/names，资产版本5不变；主动关闭后resident和打开意图为0 | 通过现有报告按钮处理函数触发，没有另建统计入口，不重算或重新挑战 |
| 背包900102详情上叠当前真实战报统计 | BagInfoView为Comp.12435，上层统计为Comp.12511；离线97.5371秒后恢复，再三次Socket重连，两窗实例及内容均不变，共享modalNodes始终1。关上层统计后下层详情保留；用现有UI导航进入英雄，Bag父页关闭后子详情及意图均清空 | 上层统计使用既有UIManager入口传同一真实冻结报表进行调试调用，不代表新增业务按钮或伪造资产 |
| 英雄详情内打开实际技能说明 | 实际按钮点击后，再重复CLICK两次及三次Socket重连，仍是HeroSkillView Comp.13207。全局事件listeners=3、targets=3不增长；返回英雄列表关闭父页后，resident/opening/pending/意图/modalActive均为0 | 技能内容来自当前真实英雄与既有配置，只检查显示与关闭，不开放升级或其他养成 |

从第一次离线开始计数，鉴权回包共11次，即两次离线后的自然恢复及三组共九次主动重连；该区间challenge、claim、新结算页和通用奖励窗打开均为0，没有重复发奖/结果展示。离线期间记录20条预期挂机遇敌NOT_READY警告，约每6秒一次，没有清理错误；不将其写成全程零告警。对应[统计恢复截图](images/overlay-statistics-reconnected-20261116.jpg)、[详情叠窗截图](images/overlay-stack-reconnected-20261116.jpg)、[技能恢复截图](images/overlay-skill-reconnected-20261116.jpg)，完整实例、计时和计数见[本机证据](validation/overlay-lifecycle-preview-20261116.json)。

### 专项结果、编译范围和未完成项

最终十五套相关专项及严格Creator类型通过；overlay-lifecycle为10/10，page-lifecycle-recovery为9/9，后者新增两组连续三次BUSY鉴权失败后恢复。针对同步onOpen关闭的第十组反例，临时编译输入移除waitResidentReady入口保护后按预期失败，工作区源码没有回退。详情归属转交、同id末次参数、旧失败不清新选择、加载失败后解除父登记、节点先销毁、迟到图片与重复打开等受控分支和实际浏览器主路径分别记录，见[最终检查记录](validation/overlay-lifecycle-review-20261116.json)。

用户唯一一次刷新后的Creator编译已包含openChild、closeChildren及“已关闭owner在转交前拒绝”，实际浏览器证明以上主路径。最终追加的同步onOpen关闭ready保护写入更晚，最后重载确认该编译特征仍为false，因此只按专项通过记录，不宣称所有最终源码都已在Creator验证；下一次常规资源刷新时自然纳入，无需为这一边界重复要求用户刷新或构建。

网络配置与临时钩子已还原，临时浏览器标签已关闭，自有独立服PID3652已核归属停止。本批源码修改仅七份现有UI生命周期文件，没有新增协议、Prefab、UUID或资源清单；没有Maven、集中构建、提交、推送或main合并，领取入口及日常开关继续关闭。小时级离线、OS后台、真机、MySQL、原生APP/微信、崩溃与断电仍未验证；下一步按实际目标补这些边界，不扩展未授权玩法。

## 前批页面切换与前后台矩阵

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

## 前批布阵专项与限定本机复验

formation-recovery专项26/26及原formation-state、formation-view专项通过。已覆盖ACK/统一状态两种先后顺序、失败及旧首包、每轮一次鉴权、同步回调重入、重复点击合并、原编号和参数保留、ACK后的同步重试不再保存、页面编辑锁定、关页与刷新在途重开，以及换号、退出、同角色重登后的旧续段隔离。真实Prefab专项还核对“重试同步”可用和真正双确认后只继续一次出战。

Creator本机预览连接独立内存H2及真实WS＋Protobuf，第二轮把原版本2的站位3改至2，在GameSocketClient.onState交付边界仅丢弃一条真实state.changed版本3，不修改请求、权威Model或服务端数据。ACK版本3到达时本地权威阵容仍为2，pending保留；随后一次session.authenticate首包使权威阵容达到3，ACK与pending清空，busy=false。该故障轮仅一条保存回包、一次鉴权、一次战场和一次胜利页打开，warn/error为0；探针已还原。证据见[布阵确认本机记录](validation/formation-confirm-preview-20261116.json)、[恢复后画面](images/formation-confirm-recovered-20261116.jpg)。第一轮版本1→2仅属于准备和正常保存路径，不计作缺推送故障证据。

本机复验仅覆盖应用交付边界单条推送缺失，不等同于实际网络丢包。鉴权失败、旧首包、并发重试、关页重开及身份切换组合仍仅由专项覆盖，未完成真机、MySQL、实际OS后台、APP/微信或进程崩溃验证。下列首次进入和主线双确认记录保持各自原验收范围。领取入口及日常开关继续关闭，没有集中构建、提交、推送或合并main。

## 前阶段首次进入验证

新增入口专项22/22，奖励装配专项21/21（新增9组、原12组保留）；相关客户端回归及严格类型见[本批记录](validation/chapter-entry-recovery-review-20261116.json)。已覆盖冷候选、暖状态排除、实际View路由、双确认、反馈入队/真正展示、原队首重试、空结果、投影失败和旧作用域迟到。

Creator独立内存H2/真实WS中，真实挑战保存battleId后立即重载：首包pending原编号/版本4；登录及主城停留时没有claim，队列为空。首次进入主线页才一次claim，原回执与快照同为5，只打开一个RewardView；该恢复阶段零新挑战、零chapter.replay、零战场/胜利页。空白关闭后回主城再进入，版本5、acceptedCount=1均不变。随后正常第二关仍以battle归属开ChapterEndView，版本7，通用队列仍只接纳前一笔；无新warn/error，独立服已停。见[真实重载记录](validation/chapter-entry-preview-20261116.json)。

本批未修改Java或协议，后端复用前批已编译的独立宿主，未重跑Maven。没有执行或验收新的集中发布包；预览失败重试/换号/单独丢包由专项覆盖，不冒充Creator故障注入。真机、MySQL、实际OS后台、APP/微信、崩溃断电及其他页面恢复仍未完成；领取入口及日常开关继续关闭，未提交推送。

## 前阶段双确认验证与限制

原核对阶段六套既有专项的结果继续保留。本批新增main-chapter-settlement共17组反例；原main-chapter窗口测试改为独立交付回执与状态，不再用同步写两者的替身掩盖缺口。包括该两套在内七套客户端专项、严格类型通过；两个既有Java领域/Socket类11项本次通过，真实三关回执与快照版本4/4、6/6、8/8，重复claim不再次改资产。

Creator 393×852选项、1280×720浏览器与随机内存H2/真实WS完成两场：正常结算版本5/5；第二场服务端已保存战报后发送引擎EVENT_HIDE，演出结束保留同battleId、pending/version6，不开结果窗；EVENT_SHOW后重新鉴权，以同battleId结算至版本7并实际打开一次结果窗、返回挂机。两场各一条成功claim回包、各一个ChapterEndView打开记录，没有新warn/error。用的是引擎事件模拟，未操作系统后台；预览后续重进主城仍为最高2/版本7，不再次结算。独立测试进程已核归属停止。

未在Creator注入单独丢回执/推送，未完成正式服H5、真机、MySQL、原生/微信后台、崩溃断电或完整页面恢复；没有集中构建。领取入口及日常开关仍关闭，全部新增修改留hao本地，未提交、推送或合并main。
