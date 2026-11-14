# 项目架构与职责

更新：2026-11-14。当前范围与进度见[开发进度](development-progress.md)，字段与时序见[通信契约](network-contract.md)。

## 不随技术重构改变的目标

因旧技术版本老、难以人工维护而现代化；旧玩法、内容、规则、数值、界面和表现以 1:1 还原为目标。内容主要依据 mxzg 旧源码/配置，正式服是效果参考；游爱只参考代码写法与阅读路径。独立新版，不要求旧客户端兼容或迁移旧玩家。

## 客户端统一采用模块级 MVC

Model 保存唯一状态，Controller 明确处理业务协议并更新 Model，View 展示和转交操作。背包作为标准模块；当前维护登录、角色、背包、英雄只读展示、主线阵容保存、前三关挑战/结算及挂机演出。英雄升级、穿脱、宝箱领取、快速战斗及其他未恢复入口仍关闭，不能把暂停解释为删减功能。

- BagController：初始化时登记三个实际消息，onNotify → onInventoryState → BagModel → BagEvent，不持有凭证、查询接口或资产写队列。
- BagModel：唯一背包状态，分别保存普通堆叠、期限物品和精灵独立实例，整批校验/冻结后计算差异；不联网、不依赖View，不按itemId合并精灵。
- RoleController：onNotify → onRoleState → 账号 Model 中唯一角色资料，不处理登录签发。
- AccountService：登录、凭证保存、恢复与失效处理，不拥有第二份角色资产。
- AssetStateBinding：应用层身份/持久版本校验、完整角色与库存批量提交，不保存第二份库存。
- Protocol / ProtocolRouter：消息目录、模块登记与按真实消息定向交付，不保存资产或伪造模块消息。

旧BagApi、BagUpdateCoordinator、bindBagSession与游戏HTTP传输已删除。2026-11-13继续退役无入口的旧Campaign/Idle/HeroLevel API与Controller、未绑定升级页及PausedFeatures；后端领域服务/规则保留，不表示这些玩家功能已开放。

## 基类与监听归属

BaseModel只管理本地展示版本和业务清空，不保存roleKey、凭证或服务端版本；BaseController管理模块初始化、无参重置和监听。连接旧回包由GameSocketClient及AccountService认证交付隔离，整包角色归属与持久revision由AssetStateBinding校验。身份变化时先调用RemakeApp.clearRolePages：结束过渡、同步关闭旧功能页及弹窗、取消在途打开、清理闲置页，再重置模块与提交新快照。HeroInfo/HeroSkill不保存owner，不比较旧账号；closed、paintVersion和选中实例仍负责页面自身生命周期。关页不销毁业务模块。

## 单一全局事件与数据顺序

使用同一 EventDispatcher。应用先校验完整角色、库存、身份和持久版本，再在 batchNotifications 中提交角色、背包和英雄 Model，最后交付界面通知。订阅者不按事件 delta 再次改资产；BagAdd 只表示新增条目，不能推断奖励或获得提示。

服务器 game_role.state_revision 是资产提交版本，与 BagModel/基类本地 revision、连接 connectionId、单次请求 id 均不同。重复/较旧持久版本不提交，旧连接回调由连接代次隔离。非法整包不允许先改钱包；回滚不发送成功状态。

## 共享可信发奖

共享奖励入口为RewardGrantService：只接服务端可信最终理论量，按item.type明确分发、最终合并、实例批量预检后加入外层角色锁事务；RewardGrantResult冻结真实到账、减少原因、前后余额/经验、升级附赠与独立实例。MainChapterRewardService只适配原首通Plan，不维护另一份类型分发表；当前首通协议仍只返回基础实际量与原经验动画。资格、请求幂等和持久回执归调用业务，统一版本/提交后通知复用AssetSyncService，不以共享方法返回代表已经提交。详细边界见[共享发奖](main-chapter-idle-settlement.md#已实现的共享发奖与实际明细11-14)，本批MainChapterIdleClaimService已接共享发奖及真实结果，日常新领取默认关闭。

## 挂机已恢复输入与世界快照

IdleRewardRules只保存不可变配置，IdleRewardInputService在当前角色锁事务中单次读取server_id/role_level/goddess_vip/clergy_level，current(roleId,nowSeconds)显式接收统一服务器时刻。Input冻结VIP、世界、神职、礼包及活动控制/适用结果，同时保存组合rulesVersion与普通idleRulesVersion。主线只读计时上限只使用VIP规则，不因活动未初始化阻断主页。基础rates不混入完整权益，输入准备不等于已接生产领取。

神职复用game_role持久已解锁等级，V19按旧创建/配置的已知零级初始化；不按经验或900007库存推导。IdleRewardRules先筛IDLE_AWARD再校验value/chance，按等级升序累计所有已解锁条目；未知等级拒绝，合法零级明确为空。完整神职升级/经验模块仍未开放。

WorldLevelService是各区服已提交角色等级的公共只读快照：首次及后台每5分钟刷新前50名平均，空服1；独立只读事务成功后发布，失败失效并重试。generation是进程内快照代次，与持久资产revision不同。定时调度在GameApplication启用，合服/跨节点共享另行确认。

礼包由privilege/PrivilegeGiftService读取V20原始持有记录，PrivilegeGiftRules管理配置及纯期限公式。读取不清active/count，过期未知配置先跳过、有效缺配置拒绝；重复配置记录和条目分别追加，原始持有快照及服务器时刻保留在Input。持有表与库存不同，购买/续购/充值流程尚未开放。

活动由campaign/IdleActivityService从V21区服开服元数据及game_idle_activity_control一次联合查询冻结。16/34/44控制必须齐全，空/缺行不能算明确未发布；迁移不seed或默认当前开服时间。Input按同次时刻、上海旧ceil日数、角色门槛准备适用结果，只有全部适用时才查询掉落行；clear不延长记录期。IdleActivityRules读取独立服务端投影并保留旧<=百万纯掉落规则，查询不调用drop。

IdleActivityMaintenanceService是该控制的唯一写入口；IdleActivityMaintenance实际接入启动和定时，可信配置默认关闭，只维护明确列出的区服。每服先锁区服行再锁控制，configure把初始化和可选044发布合成一个事务。ControlRules计算上海首期和单步周期，保留034第9999天及真实maxTurns来源；V22持久next，不在收益读取里换期或用当前时间兜底。PublicationUtils存验旧兑换结构及独立摘要；运营版本、控制revision和期次身份分开，同版本重放不重置。仍不创建角色活动记录或调用回收钩子，不开放兑换/领取；实际配置步骤及边界见[维护指南](idle-activity-maintenance.md)。

IdleRewardUtils是唯一完整纯装配入口，显式传入当前普通规则、冻结Input、奖励关卡/秒数、旧累计窗口/计数和随机源，不注入数据库/时钟或维护玩家状态。先校验完整性、投影版本及冻结状态的一致性，再按三活动→普通随机→神职消费同一随机源；使用冻结Drop，不重新查询活动。神职前拼接基础→普通分窗→三活动，最终才合并；不重复加入ordinary.rewards。Result保留计数前后及各来源，晚期失败无候选、previous不变，不能声称随机源回滚。本批已由MainChapterIdleClaimService在唯一角色锁事务中调用并冻结候选；重放分支不再调用纯装配。

V24累计状态与类别计数、V25成功回执及领取/status强类型WS消息已按[事务说明](main-chapter-idle-settlement.md)接入。MainChapterIdleStateRepository唯一拥有累计，首次挑战创建、消费带旧操作版本条件；快照只读。MainChapterIdleClaimService先查回执再检查开关/版本和前置，冻结同次时间/输入，经完整候选预检→纯计算→真实发奖→累计消费→revision→AuditV1同事务保存；历史回执不依赖当前权益且不能覆盖最新Model。请求默认关闭，客户端仅接claimState只读投影，持久待确认/双向确认与按钮仍待后续接入。

本批通用AssetSync已处理自定义事务资源的suspend/resume，REQUIRES_NEW与外层分别去重，afterCompletion按集合身份解除；提交后通知及日志异常不改变已提交结果。RoleRepository.creditCurrency在真实角色行锁内分别校验两币种精确加法后一次更新，继续使用相同同步出口。独立事务/期限回收及钱包回归见[前置证据](validation/idle-settlement-prerequisites-review-20261113.json)，不表示新领取协议/回执已实现。

## 最小精灵实例与统一背包

SpiritRules读取同源`gameplay/spirit-rules.json`，当前仅为2000002生成一个能力和一个技能，返回不含身份的不可变Generation。SpiritInventoryService加入外层事务并锁真实角色行，逐件生成UUID，写V23的`game_spirit`，通过原AssetSyncService提交版本。每次可信内部发放最多1000件是技术批量保护，不是持有容量；超限整次拒绝，不裁剪奖励。同属性实例仍独立保存，current只读完整持有；缺表、坏技能、未知配置或非默认未开放状态拒绝整包，不从普通堆叠猜补。

SessionSnapshotService在原角色锁事务内读取精灵，Snapshot可选字段10 `SpiritInventory`携带格式1、实例ID、配置ID、能力及技能列表；缺失与已同步空列表分开。首包、state.changed和重连共用同一来源。InventoryService拒绝全部item.type=8的堆叠读写，GM仅允许2000002沿SpiritInventoryService生成真实实例，单次1～1000只，与GM回执及资产版本同事务；当前没有精灵发放/养成/穿脱/洗练/合成玩家协议。

客户端沿原AssetStateBinding→BagController→BagModel链提交整包，精灵用`spirit:instanceId`作为列表/选择身份。BagView按真实实例将精灵格分路到SpiritInfoView，普通mode=1装备打开EquipmentInfoView，其余普通物品仍打开BagInfoView。BagItemCatalog.spiritDetail从唯一`spirit-display`派生表读取精确特性和技能等级；专用完整Prefab保存标题、基础属性、技能图文及旧按钮位置，格子不显示数量，不另建玩家属性。新建的hero_id保持NULL、place/exp/wash_ability_id为0、wash_skills_json为`[]`，未来玩法需另行恢复。领域/WS及393×852独立预览的8格、真实详情和关闭返回已通过，392种全文组合检查通过，见[本批证据](validation/spirit-instance-review-20261113.json)；11-14专用详情和原技能图修正见[11-14专用详情复验](validation/spirit-detail-review-20261114.json)及[资源证据](validation/spirit-detail-assets-20261114.json)；98技能逐项画面和新发布包仍未验收。

## 普通道具与精英碎片只读展示

BagInfoView继续承接普通道具、精英碎片、mode9材料与期限物品，不另造页面。ItemDetailUtils为无状态同源配置投影，读取现有Item/Language；指定英雄碎片通过已准备的HeroType检查itemId减10000000是否命中，不从当前已拥有英雄猜测。mode2/8/9/17共584条配置的类型、正文和按钮条件已接入；缺少必要显示条件拒绝开窗，23条mode9缺正文保留明确提示并限频记录。库存详情只接收原key，从BagModel重读；删除、重置和窗口关闭结束展示，不查询或写资产。

BagItemView的mode8样式来自BagItemCatalog.face中的同源星级/需求数，使用已有Prefab保存的星位和拼图角标。完成度是显式展示上下文：只有BagView启用，文字保存实际持有数，填充比例最多为1；奖励格保留本次数量，产物候选数量0隐藏，详情图标不带进度。mode9的use_value是英雄配置标识，不能当作碎片需求数，也不套mode8样式；真实精灵仍无数量，普通装备仍由EquipmentInfoView分流。

BagInfoView的description来源保留调用方的奖励/产物副标题及确定关闭，不显示库存操作。inventory来源按旧use_type、source、decomposition和具体英雄条件显示按钮，来源、使用、分解、图鉴均仅全局飘字，未恢复写协议或图鉴页面。正文由cc.RichText显示：ItemDetailUtils.richText统一保留旧br/字面量`\n`换行，并把合法font颜色转换为Cocos标记，普通库存和奖励/产物Face都提供richBody，View不再单纯剥标签或二次转换。584条纯投影及文字等值专项通过。单段长说明使用原生ScrollView，60～300高度界限由Prefab参数维护，Layout/Widget管理位置；它没有业务数据Cell，不替代业务列表的SuperScroll规范。本批复用既有View/Prefab/Bundle、LoadingPlan三段及资源池，不维护额外清单；3张原图恢复记录见[资源证据](validation/item-shard-assets-20261114.json)，本机限定复验已完成。

普通无操作详情以Prefab中的NoActionSpacer保留底部留白，留白和注销均已完成本机复验；按钮/输入监听解除前检查节点有效性，关闭时保留绘制代次失效与资源撤回。第一阶段已核道具/碎片、精灵、普通装备和产物说明的共享入口隔离，富文本追加阶段另核换行/颜色、长文首末、随机碎片及关闭注销，不宣称整套矩阵重跑，不表示开放使用、分解、图鉴或领取。第一阶段准备13/鉴权14与富文本阶段准备4/初始化5分别记录，范围见[本批证据](validation/item-shard-review-20261114.json)。

## 普通装备只读详情

BagView以item.mode=1选择EquipmentInfoView，不以装备页签判断类型，mode=18灵器保留独立缺口。窗口只接收当前库存key，通过BagModel和BagEvent重读当前物品；删除、类型改变或换号结束展示，关闭清理监听与赋图作用域。完整Prefab中的有限属性槽、Layout、Widget与统一比例负责布局，View只填值和切换可见分区，模态复用UIManager。

EquipmentDetailUtils是无状态配置投影，读取Item、Language、EquipmentType及新增类型ScoreCount、EquipmentSetType、AttributeShow。装备评分沿旧Lua先将ratio除10000，再乘原值并逐项ceil；没有评分mapping的合法属性贡献0，整张评分配置缺失则拒绝展示。属性图读取attrshow.icon；套装按旧背包传空穿戴列表显示0/4，不从当前英雄猜激活状态。来源与装备按钮仅全局飘字，不发业务请求、不生成玩家实例。独立H2/WS本机限定复验已通过普通、套装及六星双属性样本和关闭/返回/注销；设备选项393×852、浏览器1280×720，正式服只对照银剑，不代表真机或新发布包。范围见[本批记录](validation/equipment-detail-review-20261114.json)。

## 全局反馈与开发入口

RemakeApp持有唯一ToastManager，UIManager.toast是业务反馈出口；登录前和独立技能台也使用Remake.scene已有的ApplicationNotice面板。管理器不创建另一套节点，以应用update推进有界队列、文字去重和上浮淡入淡出，长中文按原宽度换行并撑高背景。页面正文只保留加载进度、玩法状态和固定操作说明；成功、拒绝和网络失败走全局飘字，框架开窗失败只报告一次。换号clear清空当前和排队项，应用销毁dispose终止所有迟到展示。

Creator预览F9松键开关GmView，不再由角色资料设置打开。总菜单只分流，GmGrantView按hero/item固定类别读取配置和发放，GmBattleView选择前三关只读演示，技能入口复用SkillAuditView。应用注入唯一GmController及异步测试动作，View不持有连接或修改Model；关闭子窗返回总菜单，F9/换号清理整条GM窗链。发布版不登记快捷键，production不装配GM服务。详见[开发GM](gm-development.md)。

## Prefab 与通用列表

Prefab保存静态结构、布局、样式和绑定；业务列表使用SuperScroll + SuperContent，View不手排Cell坐标。英雄、背包、产物说明外层/内层及胜利奖励统一监听RENDER_ITEM/SELECT_ITEM，Cell只画图，选择归所属页面或展示组件。SuperContent默认virtual=true、bufferLines=1，逻辑content尺寸按完整数据计算，只为可见范围及缓冲行创建有限节点；Mask继续裁剪，不承担节点回收。

## 当前入口与职责

RemakeApp 装配选服、登录、角色、主城、背包和资源作用域。AccountApi 只调用 WS 登录/恢复；角色/背包初始化在接纳账号的同批通知中交付。背包打开、切分类、同角色再次开始不查询库存。英雄只读列表/详情、阵容编辑、前三关挑战与结算及挂机演出已按后续授权接入；升级、穿脱、宝箱领取和快速战斗仍关闭。资源采用可配置三段加载，实际范围以进度页为准。

页面类通过自身@UIRegistry.view定义唯一Prefab地址、层级、缓存、模态和必要的页面装配prepare，UIManager打开时先执行prepare，再复用统一加载器取得Prefab；预加载只准备资源，不执行页面业务前置或创建页面。配置已在登录后统一准备，页面不再逐表prepare。应用通过UIRegistry.bindViewRuntime只注入createController或确需变化的hostId，不重复登记静态页面定义。ApplicationPages只保留登录/主城的Controller与宿主装配，不再转发英雄选择或包装各页资源地址。

LoadingPlan是三个阶段唯一人工资源配置入口，页面目标使用`{page:BagView}`等View类引用，从@UIRegistry.view读取唯一Prefab地址；图片、骨骼继续显式列目标。login中的配置目标决定启动散表，enterGame的`{configPackage:true}`准备其余配置，background仍仅加载显式目标；不恢复全目录后台加载。已有凭证恢复后仍先停登录页，由LoginEntry记录本次“开始游戏”意图，再通过原路由完成enterGame后开主城；主城显示后启动background，不另增自动进入主城的分支。ApplicationResources调度并报告真实任务进度，ResourceAssetsUtils/ResourcePool共享缓存和请求，Prefab依赖不抄写清单。[前批入口证据](validation/view-registration-list-review-20261111.json)属于虚拟化与资源精简前的调用链，不能替代本批画面验收。

CityHubView与其他页面一样同步查询GameConfig，旧loadConfig异步注入和缺表回退null已移除；缺表使开页等待明确失败。挂机对话通过纯查询回调复用GameConfig的语言主键索引，不在每个页面复制语言Map。必要的美术资源prepare、布局投影与页面资源作用域仍保留。

GameConfig是配置文件和类型化主键索引的唯一所有者。简单字段由使用处直接getConfig；BagItemCatalog、HeroCatalog仅保留无状态静态显示计算，View不new、不保存Catalog，也不把整张Item/Language等表传给它们建索引。SpiritInfoView按当前实例键读取BagModel，再调用BagItemCatalog.spiritDetail；英雄列表、详情、布阵和战报按所需模板调用HeroCatalog.find，不复制全模板Map。原文件名、路径和meta保持，不为改名增加转发层。

EquipmentDetailSource六表传参已删除；EquipmentDetailUtils.read(itemId)直接查询GameConfig并保留旧评分取整、属性顺序和套装显示口径。ItemDetailUtils.read(item, context)直接按语言主键取文字，仍负责mode、上下文、富文本及按钮条件。非主键ScoreCount.mapping、套装type/num组合和未类型化mainlevel.level直接在同一只读行中匹配，不误用主键或新建页面Map。UI筛选结果、库存差异、布阵草稿及战斗单位/血量/Buff、表现资源映射属于运行状态，不按“存在Map”机械删除。

资源统一到assets/bundles，当前16包、36份Prefab、172份脚本；共享目录49份JSON，前批新增attrshow，类型规范20表，Maven共享32表。此前清理90个未实现资源包和64份旧Prefab，并从battle拆出effects；11-14新增精灵专用只读View、两份独立GM窗口和普通装备详情，当前21个独立View。本批只增加ItemDetailUtils、调整既有道具/碎片View与Prefab，37份Prefab/Scene共86处绑定，未新增Bundle或玩法写入口。配置闭包从源码、规则与检查入口求得；三份主城投影差异见[输入说明](../config/client-maincity/README.md)，旧迁移见[清理记录](validation/current-resource-scope-cleanup-20261111.json)与[effects增量](validation/battle-effects-move-20261113.json)。bootstrap本地、其余15包远程；这些数量不等于已验证的新App/CDN下载体积。

bundles/resources收纳audio/chapter/config/effects/font/icons/maps/spine；bundles/module收纳页面模块及common、bootstrap。两个父目录不是Bundle；既有包名、UUID、优先级和远程规则保持，effects原目录UUID保留并新增远程Bundle声明。物理源地址由View定义，运行时仍用“包名/包内路径”；特效地址现为effects/技能目录，旧battle/effects运行地址不保留别名。自动图集和原图继续保留，目录树与人工步骤见[资源维护](staged-resource-loading.md)。

目录：app 负责装配，features 负责功能 Model/Controller/View，framework 负责通用事件/页面/资源，platform 负责 WS/Protobuf/协议路由，config 负责生成配置。通用层不得反向依赖具体业务 UI。

### 按模块查找当前代码

| 目录 | 当前入口与职责 | 保留边界 |
|---|---|---|
| features/account | AccountService 处理会话；AccountController 绑定登录页；RoleController 更新 AccountModel 内唯一角色资料；ui 放登录、选服、资料页 | 正式渠道登录待接入，不新增第二份角色资产 |
| features/bag | BagController→BagModel→BagEvent；普通/期限/精灵快照分开保存，BagView按实例key选择，普通道具/碎片归BagInfoView和ItemDetailUtils，普通装备归EquipmentInfoView、精灵归SpiritInfoView | 关闭不清持有；来源跳转、使用、分解、英雄图鉴和精灵养成穿脱/洗练合成未开放 |
| features/hero | HeroRosterController/Model 保存名册及权威阵容；FormationController/FormationSaveModel 保存提交进度；FormationView 持有未保存草稿 | 详情/技能/四槽/进化状态只读；HeroLevel旧客户端链已退役，升级仍未开放 |
| features/battle | MainChapterController/Model处理主线与挂机快照；MainChapterView组织行军；BattleReplayPreview、ChapterEndView、BattleDetailLayer展示战报、结算与统计 | 旧Campaign四份UI已退役，暂停领域代码不接回导航；BattlePreviewController只供开发试战，不结算奖励 |
| features/home、features/city | HomeController 与 RemakeHomeView 绑定根页；city 提供地图、顶底栏与导航显示 | 地图中旧入口和资源不代表对应玩法已恢复 |
| features/gm | GmController 与 GmView 仅处理显式启用的开发数据准备 | local默认开启、production不装配，仅当前登录测试角色，不能替代正式获取玩法 |
| app/remake | RemakeApp装配模块；AccountComposition、AssetStateBinding处理身份/状态；ApplicationPages只装配登录/主城Controller和宿主，HomeFeatureNavigation处理主城入口；LoadingPlan、ApplicationResources处理三段加载 | 页面静态定义和必要装配归View；配置包由应用统一准备，页面不列配置前置或模块资源清单 |
| platform、core | platform 提供单连接、二进制编解码、真实协议目录与路由；core 提供日志和错误含义 | 不保存另一份业务状态，生成协议禁止手改 |

以上路径相对client/assets/scripts。修改页面先看对应View的@UIRegistry.view与Prefab，查业务从Protocol协议名进入Controller及唯一Model；登录/主城的应用依赖再看ApplicationPages，不需要先遍历整个框架目录。

### framework/ui 人工阅读入口

以下是现有文件的职责导航，不是新增框架层或模块加载清单。修改页面先看对应 View 的注册与 Prefab；只有改变多个页面共用的开关、列表或视口行为时，才进入这里。

| 文件 | 负责什么 | 修改与保留边界 |
|---|---|---|
| UIManager、BaseView、UIRegistry、UILayer、ViewCloseUtils | 页面注册、分层、异步打开、关闭、取消、缓存与生命周期；ViewCloseUtils连接BaseView的关闭动作 | 核心开关入口，不保存角色资产；页面静态节点不在这里另造 |
| SuperScroll、SuperContent | 原生滚动手势与等尺寸虚拟列表：完整逻辑尺寸、视口范围、缓冲行及有限节点池 | virtual默认true、bufferLines默认1；原锚点/Cell正缩放保留，view/content局部缩放为1，业务只提交数据和监听事件 |
| ViewportLayoutUtils、ChromeLayoutUtils | 读取当前可见区域，处理全屏根、背景和顶底栏在不同视口中的尺寸关系 | 运行时可见尺寸与固定布局分开；不能把逐个子节点坐标修补都归为必要适配 |
| PageSlideUtils | 现有底栏切页的方向、缓动与位移计算 | 由应用PageTransitionUtils调用，不负责页面栈或业务操作 |
| ViewportScale | 按外根可用宽度与设计宽度，对一个内容容器等比缩放 | 在Prefab绑定target、designWidth、maxScale；位置、纵向留白与拉伸交给Widget，不识别模块名或机型 |
| UiKitUtils | 现有演出、飘字、动态挂点及旧显示回退使用的节点构造辅助 | 无人使用的输入框链已删除；新页面主体与固定控件继续写在Prefab |
| 骨骼处理位置 | 通用数据转换直接使用framework/assets/SpineJsonUtils；挂机身体位移修正内聚到BattleSpineService | framework/ui/spineUpgrade转发文件已删除，不新建兼容别名 |
| UIOpenLogUtils | UIManager成功打开后的耗时日志 | 只格式化当前完成结果，旧页面计时Map与重复计时链已删除 |
| ModalLayer | UIManager内部的一份动态共享输入层，按当前最上方模态窗口配置绘制蒙版或透明拦截 | 不挂业务Prefab；关闭或隐藏窗口后向下寻找仍显示的模态窗口，最后一窗关闭后脱离场景复用 |

弹窗只在页面注册的ViewSpec设置modal，不再在各Prefab添加蒙版或ModalLayer绑定。省略modal表示不拦截外部；`{mask:false,closeOnOutside:true}`使用透明拦截；`{mask:true,closeOnOutside:true}`显示共享蒙版并点击空白关闭。closeOnOutside可独立设为false，只阻挡外部点击。实际面板背景保留BlockInputEvents，不能给只承载坐标的大节点盲加阻挡。叠窗始终共用一份节点，颜色不叠加。

物品详情、资料、选服、技能、战报、产物说明及原有布阵/结算均使用共享层；关闭仍走各自既有生命周期，布阵空白关闭取消未保存草稿，结算释放和返回回调保持。GM与技能台为`{mask:true,closeOnOutside:false}`，由各自按钮关闭，GM另支持F9开关。8cb60507基线的专项、类型与本机限定预览见[共享层证据](validation/shared-modal-widget-20261111.json)，不作为本批页面注册和列表事件改造的新验收。[旧模态证据](validation/modal-layer-20261111.json)属于被取代的逐窗蒙版实现；未实测窗口不沿用旧画面签收。

framework/kit为空目录的残留meta已清理。DesignResolution只保留实际使用的640×1280设计坐标常量；旧安全区计算和调试函数没有调用，已删除，当前视口读取统一归ViewportLayoutUtils。

背包、英雄列表及英雄详情都是完整Prefab，背景、纸面、页签和列表容器直接保存于页面；HeroBoard只保留静态容器与Widget，HeroListView直接处理列表事件并读取唯一HeroRosterModel。ParchmentLayout、ccbiPlace、heroMount/heroChrome及旧页面壳已退役；本批继续删除旧Campaign四份UI和PrefabLayout，以及失去资源绑定的Common*Shell样板链，不将暂停领域代码重新接回导航。仍用资产保留原UUID。

虚拟列表已实现：滚动时根据Node到当前数据索引映射换绑，仅新进入或刷新条目派发渲染，不停止惯性；数据、视口、模板或几何变化才完整重排并保留合法位置。refresh(index)离屏时延迟到可见再画。1000/10000条六布局、锚点/缩放、resize及51项全量通过；本机850关首屏5节点、拖动和多次跳转后池保持7，背包、三英雄及真实第二关胜利奖励返回通过，见[本批限定证据](validation/virtual-list-resource-review-20261111.json)。不含变高或无限循环，不把节点池约束等同真机帧率或长期内存验收。

固定布局和拉伸由Prefab的Widget维护；ViewportScale只计算`min(maxScale, 可用宽度/designWidth)`并缩放target，默认designWidth=640、maxScale=1。外根fitVisibleRoot仅把没有UITransform的LiveShell视口桥接到完整页面根，避免另加一套竞争根位置的全屏Widget；它不重排纸面、页签或列表，也不保存机型表。

## 后端决定

保留 Java 21、Spring Boot、显式 SQL/JDBC 与版本化迁移。数据库持久化是资产事实来源，内存在线表不保存资产；本机 H2 与独立 MySQL 验证分别记录。不能把技术栈更新解释为改玩法规则。

## 后端一条业务链只有清晰的几层

GameSocketHandler 验证信封、身份、请求阶段并调用服务；Service 组织事务和业务规则；Rules 表达旧规则；Repository 负责明确查询/锁/写入。钱包、库存修改显式接入 AssetSyncService，在同一资产事务内递增版本，提交后通知不决定发奖结果。

SessionSnapshotService 在数据库角色锁内读取完整钱包、背包和版本。AssetSyncService 在写入前要求事务，一事务同角色只递增一次；提交后 GameSocketHandler 读取已落库状态并发送 state.changed。失败不重做资产事务，断线通过新首包恢复。

## 接口与数据

全部游戏业务走 WS＋Protobuf，唯一契约 protocol/game.proto，子协议 mxzg.protobuf.v2。匿名 servers.list、开发 session.login、恢复 session.authenticate、心跳与顶号已接入。登录/恢复回包同时返回角色/库存/版本；没有 session.sync 或 inventory.list 处理，不保留业务 HTTP 回退。

资源下载、WS 的 HTTP 握手与测试上下文的实例身份探针不属于游戏业务 API。测试目标必须匹配独立实例标识和存储前缀，失败禁止回退日常服。

整数、安全范围、空列表/未同步/零/错误必须区分。关键写操作后续恢复时继续保留服务端权威、角色锁、持久幂等与事务，不能靠客户端排队/去重代替服务端正确性。当前同步采用带持久版本的完整快照；旧 5002 提示类型与完整角色字段仍待恢复。

## 旧服取舍与证据

旧版先登录确认，再由客户端请求角色和背包完成加载；后续通过 5002 主动同步增减。新版合并初始化请求，保留服务端变化同步语义。原客户端、服务端、协议路径见通信契约，下方保留最初只读架构核查，不能把当时 HTTP 基线当作当前实现。

## 人如何接手修改

先读[开发约定](development-conventions.md)、[背包模板](bag-mvc-maintenance.md#固定通信与状态模板)，再查 Protocol/.proto 与所属 onNotify、Model、View。中文文件头、属性和函数注释说明具体用途与生命周期；变更时同步更新，不用空注释或大段注释掩盖职责混乱。

## 落地边界

当前支持单进程本机会话与资产同步。正式渠道登录、多实例在线所有权/同步、生产 WSS、三端真机、完整字段/操作及正式服视觉验收尚未完成。暂停模块的领域服务和历史测试不代表玩家入口可用。实现和验收必须分开记录。

## 配置、资源与静态布局

配置以生成GConfig与唯一GameConfig查询。49份源JSON供人工与导出工具维护，当前Language/LoadingTips按LoadingPlan.login独立准备，其余47份自动生成ZIP格式的game-config.bin。RemakeConfigUtils在登录后下载、校验启动同版、逐表解析，由GameConfig原子安装，类型索引和按路径读取共用文件引用。页面不再加载JSON或维护配置组；临时压缩资源持有归还现有资源池，配置对象应用期驻留，不随界面缓存到期删除。生成、版本和构建前检查见[配置管线](config-pipeline.md)。配置包接入批次的真实去重和解压运行已有[发布证据](validation/config-package-release-review-20261114.json)；本轮Catalog/查询整理是之后的源码，不将旧20:14包冒充当前版本，新增预览与发布结果依[开发进度](development-progress.md)分开记录。

包内47份表只对应一个bin正文请求；解析、校验和索引初始化仍逐表计真实完成量。玩家文案不再显示9/47等容易被误认为文件下载的数字，而显示下载配置包、解析配置包、初始化配置；进度不按时间模拟。发布入口统一到scripts/build-remake-h5.bat及其PowerShell/JSON选项，隔离工程复制同一扩展和工具；config-package-artifact-v1 v1.8.0在before核验源，在after对全部Bundle检查两份启动JSON、唯一bin、散表排除及解码模块静态登记。该机制和自动检查不等于实际发布运行通过，真实结果由本批最终证据记录。

资源通过统一目录与作用域管理；界面布局以Prefab和SuperScroll Inspector为准，不用字符串散落或运行时兜底掩盖缺资源。

## 原项目架构核查（2026-11-02）

本节为当时只读核查与差异快照，包含已退役的 HTTP 基线及当时建议；当前实现与优先级以本文前部、通信契约和进度为准。

以下核查记录保留当时源码快照与迁移建议；后续用户已指定先登录/背包模板、再英雄。最新实施结果和顺序以 [开发进度](development-progress.md) 与 [通信契约](network-contract.md) 为准，不把历史差距重复判定为当前未实现。

### 结论与适用范围

用户确认完整重做原游戏，分批恢复玩法与社交；独立新版，不要求旧客户端连接或迁移旧玩家。因此保留玩法/规则/交互语义，允许重新定义协议和数据结构。现有 HTTP 闭环可以作为迁移基线，不能作为完整游戏通信验收。此前把社交/推送当作将来可选项、未明确在线会话/重连/公会共享状态，是前期架构覆盖不足。

本次只读源码，未运行旧服务、抓取正式服业务流量或操作任何数据库。旧服支持哪些入口与正式服当前部署哪条入口是不同事实；下面证明源码能力，不推断 mxzg-test.funsgamex.com 的网关部署。G:/游爱/trunk 是另一个参考项目，其 Sproto 不能作为 mxzg 的协议结论。

### 可复核的原项目证据

版本、80 个旧服一级模块和当前 16 个 HTTP 操作的完整枚举见 [源码核查索引](validation/architecture-source-index-20261102.json)。它是此次只读快照，不是已完成的逐玩法规则清单。

原仓库根：`G:/work/FsGame/Demo/mj/program`。目录是 Git 裸仓库，不能按普通工作树打开文件。固定版本：

| 代号 | 裸仓库相对路径 | 本次读取提交 |
|---|---|---|
| C | client/cocos_mxzg.git | 6276cbe47b939ce161aaefaa93bb6f83a0a253af |
| S | server/mxzg-server.git | 672293145b4da0f87b87bad9826432e04d6402c0 |
| N | server/mxzg-common.git | 8cc02a32cea66df6296eb89b4d2d1b1715e507e7 |
| P | mxzg-protofiles.git | cb410068f579dad2d97e08b45ac008387f946bed |

S 下 `mxzg-gameserver/src/main/java/com/ayjs/mxzg/gameserver/` 简写为 `GS/`；N 下 `src/main/java/com/ayjs/mxzg/common/` 简写为 `COMMON/`。以下行号属于上述提交，不是生成文件或在线站点：

| 证据 | 路径/入口 | 核实内容 |
|---|---|---|
| 原生网络 | C: client/idle/frameworks/runtime-src/Classes/Net/SocketClient.cpp，connect（76 行起） | SOCK_STREAM、connect/send/recv；原生业务是 TCP |
| 原生消息 | C: client/idle/src/autorun/NetManager.lua:91 | sendMessage 写协议编号、序列化消息，交 C++ sendByteArray |
| 平台接口 | C: client/idle/src/net/PlatformApi.lua:47 | luaSendGet/luaSendPost 走平台 HTTP，不等于全部游戏业务走 HTTP |
| 服务启动 | S: GS/infrastructure/netty/SocketServerLifecycle.java:45 | 启动 TCP；配置 WebSocket 端口时额外启用 WS，可配置 TLS，共用 NettyHandler |
| 实际 WS 管线 | N: COMMON/netty/websocket/WebSocketServerInitializer.java:34 | HTTP Upgrade、空闲检测、WebSocketCodec、下游业务 Handler；不是仅凭 WebSocketHttpHandler 文件名推断 |
| 消息编码 | N: COMMON/netty/websocket/WebSocketCodec.java:21 | BinaryWebSocketFrame：4 字节长度 + 4 字节协议号 + Protobuf 包体 |
| 收包分发 | S: GS/infrastructure/netty/PlayerActor.java:38 | 协议号查 HandlerExecutor、登录/开放条件校验、Protobuf parseFrom，再执行处理器 |
| 在线上下文 | S: GS/infrastructure/netty/PlayerContext.java / ContextManager.java | 上下文创建 Akka typed actor 串行处理；在线角色查找、定向/群体广播、离线处理 |
| 登录 | S: GS/module/role/handler/LoginHandler.java:81 | 1001 登录、旧连接下线通知、注册在线角色；1004 心跳/时间同步 |
| 英雄升级 | S: GS/module/hero/handler/HeroHandler.java:365 | 4018 校验拥有权、升级级数与上限，消耗资源并返回等级；支持配置范围内多级，新版当前只做一级 |
| 聊天 | S: GS/module/chat/handler/ChatHandler.java:73 | 6001 发送；频道、等级、禁言和频率条件；6003/6007 历史、6009 未读 |
| 公会聊天 | S: GS/module/chat/executor/ClanSendExecutor.java:71 | 服务端确定公会，按成员/黑名单向在线上下文发送 6001；内存维护最多 100 条记录，不代表可靠离线消息存储 |
| 公会状态 | S: GS/module/clan/service/ClanService.java:569 | 成员集合 writeSome 广播；申请列表向有管理权限成员推送；ClanHandler 有创建/申请/审批/退出/职务/捐献 |
| 主线 | S: GS/module/battle/handler/BattleHandler.java:253 | 3001 校验关卡和条件、服务端 invokePVEBattle、返回 report；3002 领奖、3005 普通挂机领取 |
| 客户端更新 | C: client/idle/src/net/ChatResponse.lua、ClanResponse.lua | 更新聊天/未读/公会数据，再发事件或重新拉取公会快照 |
| 协议源 | P: protofiles/game/{Login,Hero,Chat,Clan,Battle,BackPack}.proto | 旧协议源可作为规则和字段核对材料，不直接假设与每一份生成文件完全一致 |

复核示例（PowerShell，只读）：

```powershell
git --git-dir='G:/work/FsGame/Demo/mj/program/server/mxzg-server.git' show '672293145b4da0f87b87bad9826432e04d6402c0:mxzg-gameserver/src/main/java/com/ayjs/mxzg/gameserver/infrastructure/netty/SocketServerLifecycle.java'
```

旧服 POM 的 Spring Boot 2.1.9 / Protobuf 2.6.1、gameserver/center/cross/large-cross 模块和 common 的 Akka 是源码构建事实，不代表本次已验证线上依赖、吞吐或安全状态。HeroDao 继承旧 BaseRepository；单线程 actor 不等于已证明跨实体资产事务和宕机恢复，不能照搬其一致性假设。

### 当前实现的差距与保留判断

| 能力 | 当前新项目 | 处理结论 |
|---|---|---|
| 请求入口 | JsonClient/XhrAdapter，后端 9 组路由、16 个 GET/POST/PUT 操作 | 暂保留可运行基线；建议逐批迁入统一游戏消息入口 |
| 会话 | SessionService 签发一小时令牌、保存哈希、每次请求鉴权 | 可复用身份验证基础；缺在线连接绑定、撤销/顶号、重连认证和会话恢复 |
| 状态 | Bag 和英雄名册已有唯一 Model、全局通知、旧响应隔离 | 保留；新增推送必须进入同一个 Controller/Model |
| 资产 | 升级/挂机/领奖有事务、锁及持久操作记录；阵容有版本校验 | 保留并重验；业务 requestId 与传输请求序号分离，不能迁移后丢掉重复保护 |
| 业务与传输耦合 | Service 接受 Bearer 字符串，抛 ResponseStatusException | 并非完全独立于 HTTP；迁移时统一身份上下文/业务错误映射，避免 WS 分发再复制一套规则 |
| 主动消息 | 无游戏推送通道，无聊天/公会服务 | 必须补齐，不再作为可选技术增强 |
| 并发 | 单角色写操作使用数据库行锁/版本 | 不能直接推导公会多成员操作安全；需共享实体版本/锁、固定锁顺序和事务后通知 |
| 战斗 | 基础普攻、前 20 关；服务器生成战报 | 结算模式可保留；完整技能、状态、成长与开放条件恢复是独立任务，不能靠换传输解决 |
| 调度/跨服 | 当前没有完整活动调度、跨服服务和社交路由 | 建立可恢复调度、区服/公会域、广播边界；先模块化，不因旧仓库多进程就立即拆服务 |
| 类型契约 | 当前 DTO/运行时校验手写 | 在新消息契约中落实生成和漂移检查；不能继续写成已完成的 OpenAPI 能力 |
| 平台与容量 | Creator 本机验证为主；无完整三端长连接/负载证据 | H5、App、小游戏适配分别验收；单体容量、编码成本和网关部署均不得凭框架名称承诺 |

Java 21 / Spring Boot / JDBC / Flyway 不因需要 WebSocket 就必须推倒。Spring 本身支持 WebSocket Handler；原始 WebSocket 会话并发发送需要序列化与限界处理，不能多线程随意 write。参考 [Spring 官方 API 说明](https://docs.spring.io/spring-framework/reference/web/websocket/server.html)。本次建议保留技术底座，是基于已有业务可复用和可渐进验证，不是已完成生产选型压测。

### 推荐调整方案（待实施，不是完成状态）

- 游戏会话内的请求、回包、推送走同一 WSS 通道；平台身份交换、公告/资源下载、支付回调及管理接口按职责保留 HTTPS。不恢复开发 PowerShell 桥，不为长连接立即引入第二个框架或独立网关集群。
- 首个验证链现已采用 Protobuf 强类型信封和载荷；操作名、协议版本、传输 requestId、业务 operationId、错误码、会话代次、状态 revision 分开定义。命名/字段以契约阶段最终落定为准。Protobuf 编码迁移已落实登录与背包；不因此重做数据库事务、库存 MVC 或其他玩法。
- 连接状态明确为未连接、连接中、鉴权中、同步中、可操作、重连等待、退出/被踢。鉴权完成前不接收游戏写操作；重连只有恢复快照后才重新允许操作。顶号或令牌撤销不能触发无限自动重连争抢。
- 浏览器连接鉴权不能假设可设置任意 Authorization 握手头；选择短期一次性票据或连接建立后的限时鉴权消息，并限制未鉴权连接数量/时间，禁止把长期令牌放 URL/日志。具体方式在三端适配小样确定。
- 读取可以重新查询；提交结果不明的写操作沿用原业务幂等键确认，不自动补发新的操作。原阵容 expectedVersion、升级收据、挂机随机结果和战报领奖身份必须保持。
- 区分可补拉的状态通知与需要历史记录的消息。重连先取权威快照/游标，按 revision 丢弃重复/迟到更新；聊天使用有界历史和消息标识。需要保证投递的关键业务采用事务内持久事件/可查询状态与事务后发送，禁止在数据库未提交时对外宣布成功；不承诺仅靠内存队列零丢失。
- 有界输入/输出队列、消息大小/频率、待回包数量、发送超时、心跳和重连退避必须定义。慢连接不拖住所有玩家；长计算与数据库访问不能无限占用收包线程。指标包含连接数、队列、错误、操作耗时和恢复失败，不记录敏感令牌。

### 实施顺序与出口

1. **契约与身份设计**：盘点当前 16 个操作，定义请求/响应/推送和错误、幂等、状态版本；确定生成方式及平台适配。补登录、踢线、重连、权限变更时序，明确消息恢复策略。此阶段不删除 HTTP 入口。
2. **英雄升级小链路**：新通道调用现有升级事务与 Bag 状态入口；覆盖正常升级、提交前/后断线、重复请求/响应、回包迟到、换号/换服、服务器重启、两端顶号。确认金币/经验/等级/收据一致，不仅测试能收到一条消息。
3. **其他核心业务迁移**：名册/背包/阵容/主线/挂机逐项迁移。短期双入口只能共用同一用例与幂等记录，客户端每项写操作只能选一个入口；通过对应恢复测试后删除被替代的业务入口和兼容配置。
4. **社交闭环**：两名测试玩家验证世界/私聊/公会消息、申请审批与权限变更、退会后的订阅隔离、断线历史补拉和未读；其他玩家不需要刷新页面就看到有效变化。
5. **三端与生产验收**：实际 H5/App/小游戏网络切换、后台恢复、协议/资源版本切换、连接压力/慢客户端、维护停服和恢复。构建仍按用户届时授权执行；没有设备/部署证据的项目保持未完成。

协议不兼容和旧玩家迁移已由用户明确排除为当前要求，不再反复询问。仍待相应阶段确认：首发平台顺序/渠道、预期同时在线与广播规模、聊天保留期与跨服分组。此前不据未知规模承诺单体容量，也不为等待这些数字停止可独立完成的契约和小链路设计。
