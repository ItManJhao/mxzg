# 战斗预制体整理与正式服对照

## 挂机布局补充（2026-11-09）

BattlePage的IdleLayout保存Ally1至3、Enemy1至3静态锚点，以及ModelScale、HpOffset。位置依据旧BattleUtils.getHangHeroPosition及BattleInfoFactory的队伍顺序；保留服务端position身份，仅显示时映射。正式战斗继续使用原8槽布局，不共享挂机坐标。当前实际遇敌仅一名敌方，额外锚点不代表开放多人挂机敌队。

负责人已验收出场连续性、攻击完成回待机、挂机模型放大及独立站位。挂机0.60是本次反馈确认的体验调整，不宣称与旧骨骼缩放完全等价；正式战斗0.48保持。下方2026-11-06状态为历史导航，当前模块状态以development-progress.md为准。

## 当前基线（2026-11-06，覆盖下方历史判断）

负责人已授权清理重复和不可用预制体，并按旧项目和正式服恢复整个战斗入口流程。保留现有服务端权威、持久战报、幂等结算；升级、穿脱和其他模块不动，推送等待通知。

### 页面职责与资源处置

| 资源 | 处置与依据 |
| --- | --- |
| MainChapterView | 正式主线唯一入口，重构为挂机主页；当前挑战/重播/奖励操作布局只是临时实现，不能签署正式还原。 |
| CampaignView | 暂停旧链路，保留底部面板的资源来源；迁完资源和调用后退役，不再恢复第二套主线业务。 |
| BattlePage | 保留真实播放器资源；逐步拆清战场、头顶信息、特效与开发控件，正式挑战嵌入主页中央。 |
| MainChapterBattleView | 已改为主页BattleHost内的战场组件，UIManager管理开关；删除全屏背景和输入遮挡，仍保留播放器与结算生命周期。等待Creator实际验收。 |
| BattleInfoLayer | 旧双方信息栏模板，恢复名称、回合、光环/契约、跳过与倍速时复用，不能当无引用垃圾删除。 |
| BattleEndLayer | 旧主线胜利模板。BattleResponse.chapterEnd实际调用BattleEndCtr，先前“仅通用结算”的判断错误。 |
| ChapterEndView / ChapterEndLayer / ChapterEndLoseCell | 当前结算与旧失败来源；胜败分支分别恢复，不将通用胜负壳当作完整旧胜利页。 |
| BattleDetailLayer / BattleDetailCell | 战斗统计待恢复的旧资源，保留；列表接入时迁移SuperScroll。 |
| BattleEditLayer | 已删除：无业务脚本或场景/Prefab引用，布阵统一使用FormationView；删除前保留精确备份。 |
| BattleReportLayer | 已删除：仅空根节点，无业务引用，不可充当完整战报页；删除前保留精确备份。 |
| SkillAuditView / SkillAuditCellView | 有效开发验收入口，保留；不作为玩家主线界面。 |
| HangMissionChipView | 保留现有模块单元，待主页关卡组件整合后再判断是否退役。 |
| chapter目录奖励、预览、额外奖励资源 | 后续配套流程的旧资源，当前不因未开放而删除。 |

### 负责人观察与正式服核对后的状态顺序

1. 进入战斗即挂机主页：当前账号三名英雄跑步，显示等级、元素和血条，背景连续滚动；英雄有对话。人数选取规则待查，不能固定为三人。
2. 挂机遇敌：停止行进，敌方出场特效、怪物显示、交战；敌方死亡后继续跑步。
3. 宝箱特效点击领取挂机收益；底部为挂机时间、金币、角色经验、英雄经验收益及球形关卡进度。收益种类来自旧BattlePanelLayer，最后一种图标仍待复核。
4. 三按钮为战力提升、战斗、快速战斗；战力提升旧onLineup实际打开HeroSuggestCtr，不是布阵。
5. 战斗→HeroSelect布阵→出阵→清除挂机单位→开始特效→双方信息栏（跳过、倍速）→双方每个英雄出场→交战。
6. 战斗结束清除单位→胜利或失败结算→恢复挂机；共享顶部账号栏和底部导航保留。
7. 胜利旧BattleEndCtr包括最高伤害英雄、角色经验变化、奖励、战报详情、确认及倒计时；失败由chapterend/ChapterEndCtr处理。旧胜利界面调用证据已核实，本轮正式服胜败逐项截图尚未完成。

### 实施顺序及验收边界

A. 引用审查与退役清理（进行中）：保留资源UUID，备份删除项，检查全库绑定和生成目录；不等同视觉通过。
B. 挂机主页和收益面板：静态结构保存在Prefab；读取服务端权威挂机数据，演出不自行发奖；恢复跑步、滚动、遇敌、对话与宝箱。
C. 内嵌挑战：沿用现有WS＋Protobuf和布阵保存，恢复开场时序、信息栏和出场，移除正常入口的演示按钮。
D. 胜败结算与返回：按旧模板恢复，保留重复结算保护、断线恢复和资产一致性；完整清理后恢复挂机。
E. 正式服标准/窄长/平板尺寸逐项对照，独立测试环境验证挑战、领奖、恢复及资源清理；不足明确记录，不以测试通过代替视觉验收。

当前只完成首轮两个无引用资源的退役。挂机主页、内嵌挑战和旧胜利窗口仍未恢复完成。清心概率待审、护盾疑点继续保留。

## 历史实施记录（以下不作为当前验收结论）


更新：2026-11-05。当前仅整理战斗表现，不开放挑战、领奖、升级或穿脱。

## 依据

- 正式服 hao1：主线战斗在宫殿挂机场景内播放，回合显示在战场下缘，双方信息在其下方；不是独立森林战场。
- 旧 BattleLayer.lua 组合 BattlePanelLayer、BattleMissionLayer、BattleIdleLayer；不能用一个旧 Layer 代替整个页面。
- BattleHeroInfoNode.lua 使用 hero/progress-hp-bg、green，背景缩放 0.5，显示等级与元素；能量条初始化被注释。
- BattleMissionLayer.lua 主线失败进入 ChapterEndCtr，胜利请求 ChapterEnd。BattleEndLayer 是通用结算，不是已证实的主线最终模板。

## 资源盘点

| 当前预制体 | 状态与处理 |
| --- | --- |
| BattlePage | 独立真实战报的当前显示壳。本批复用宫殿远景与地板、旧紧凑血条，回合栏移至下方，隐藏占位技能条与未接通倍速。保留原 UUID。 |
| CampaignView | 暂停的主线页面壳；后续按旧 BattleLayer 组合恢复，不在本批开放。 |
| BattleInfoLayer | 旧双方对阵信息资源，待接入真实双方名称、阵型与回合数据。 |
| BattleEndLayer | 暂停链路的通用结算，暂不冒充主线 ChapterEnd。 |
| BattleDetailLayer | 旧统计页，含两处原生 ScrollView；接入时迁移 SuperScroll，当前不开放。 |
| BattleDetailCell | 上述统计页单元，随统计协议一起恢复。 |
| BattleEditLayer | 旧布阵容器；当前已恢复布阵走英雄模块 FormationView，不新增第二套入口。 |
| BattleReportLayer | 只有根节点，不能当作可用完整战报页；先保留来源及 UUID，待引用退役检查后决定删除。 |
| HangMissionChipView | 当前关卡显示单元，保留。 |

## BattlePage 节点契约

- Bg：map01_B 远景；CampaignFloor：map01_F 地板，位于角色之前。
- LayerField/AllySlots、EnemySlots：角色与头顶 Buff 的父层。
- LayerHud/HpBars：旧血条资源，Fill 使用水平 FILLED 裁切，更新 fillRange 不重新拉伸图片。Label 显示等级，不显示剩余血量数字。
- LayerHud/TopBar/RoundLabel：暂保留绑定路径，位置已移至下方；名称迁移需同步所有引用。
- LayerHud/BtnSkip、BtnRetreat：当前独立测试的开始、退出控件；不表示正式服有这两个按钮。
- LayerFloat：真实伤害飘字。静态占位数字清空；LayerAppear、SkillBars 默认隐藏。
- HeadAnchor/BuffRow：Buff 实例图标；默认隐藏，由真实事件开启。

## 尚未完成的对齐

本批不是完整正式服等价验收：当前显示壳已补齐每侧八槽及头顶挂点；当前独立战报仍仅双方各一名一级英雄，多人战报播放尚未验收。等级暂依据该固定场景，正式入口必须携带真实单位等级和元素，不可泛化硬编码。

八站位、模板元素和双方信息底条已接入独立预览；后续按 ChapterEnd 资源恢复主线结算与统计。正式服本次战斗过程中曾出现角色未显示，不能用这一异常作为隐藏角色的依据；继续以旧源码和可见挂机角色信息交叉核对。

清心概率待审、护盾疑点继续保留。独立战报不连接玩家数据库，也不发奖励。


## 640设计与九宫格整改（2026-11-05）

- 项目设计设置为640×1280、Fit Height。BattlePage根节点已由用户改为640；本批补齐内部11个遗留720宽容器。可见宽度与设计宽不同，结算遮罩使用实际视口尺寸。
- 保留用户设置的win-bg_msg-bg四边10像素边距和LogBg的Sliced模式；补齐BannerBg及隐藏面板占位的Sliced模式。Buff图标是运行时替换的完整图标，继续使用Simple，不按底板处理。
- 删除BattlePage中没有调用者的旧森林背景加载、1.85倍放大及代码生成背景分支，避免后续误用。保留实际使用的预制体绑定。
- tools/check_battle_prefab_layout.py 检查设计设置、战斗目录残留720宽、Sliced资源边距及提示底板模式。本批9份预制体、22处Sliced组件通过；只证明静态资源约束，不替代正式服视觉验收。
- 背景、角色、图标不能为了拉伸方便统一改九宫格；边框资源需同时核对SpriteFrame边距、Sprite模式、目标尺寸和运行时代码覆盖。

## 正式服录像参照方法

建议用正常1倍速、固定窗口和完整游戏区域录制，从点击挑战前开始，到结算关闭后结束。保存原始声音，30或60fps均可；注明关卡、阵容、等级、窗口尺寸和是否手动切换倍速。不要只提供语音转写，语音转写不能描述画面运动。

视频理解可用Google AI Studio/Gemini，官方支持画面分析与时间戳问答：
https://ai.google.dev/gemini-api/docs/video-understanding

自动视频理解可能漏掉瞬间动作，保留原视频、关键帧和文字记录。争议片段按实际帧号复核，未知规则标“无法从画面确定”，不依据视频猜伤害公式或技能概率。

可复制给视频分析工具：

> 这是旧游戏正式服战斗录像，用于1:1恢复界面和表现。请按时间顺序输出表格：时间段、对象、起止位置（以游戏区域宽高百分比表示）、动作/朝向、技能文字与特效、血条/等级/元素变化、Buff出现消失、音效、界面切换、证据关键帧时间、置信度。分别覆盖进场、普攻、主动技能、受击、死亡、回合切换、胜负结算。区分直接观察与推测；看不清或未出现的写“未确认”。不要猜伤害公式，不要概括为“角色互相攻击”。对快速动作指出需要逐帧复核的时间段，并说明录像中是否发生倍速变化。

分析结果回到仓库后，逐条映射到预制体、资源或播放器差异，不将模型生成的描述直接视为规则事实。


## 八站位与对阵栏（2026-11-05）

- BattleStageUtils逐项还原旧BattleUtils.getHeroPosition的高度档位、两列四行及左右镜像；主线按BattlePanelLayer的300底部高度、BattleLayer的637战场高度换算到640×1280中心坐标。
- Slot_A0..7、Slot_E0..7及独立血条/元素/HeadAnchor均保存于预制体。预览根据战报position=2选索引1，不再固定使用索引0。当前单位和血条容器统一0.9缩放以保留窄屏外侧头顶信息边距，此适配不是旧公式的一部分，完整多人密度仍待录像比对。
- Hero模板元素从同源herotype读取，经ResourceCatalog加载完整元素图标；不以元素图标冒充团队光环。血条与元素在独立播放时挂到对应英雄槽，跟随近身移动。
- MatchInfo复用BattleInfoLayer的蓝红底条与VS，纠正旧蓝底条锚点；独立测试名字明确标“独立测试阵容/主线第1关”，不冒充真实账号名。契约和光环没有权威数据，暂不显示。
- ChapterEndCtr核实：主线胜利用chibang骨骼动画，胜负音效battle-end-1/0；旧奖励使用scroll_view；ChapterEndCtr自身倒计时需startTimer调用，但默认失败ChapterEndLoseCell.reset会独立启动5秒关闭。战报按钮依detail存在显示。只读恢复见下节，不使用通用BattleEndLayer或伪造奖励。
- 旧client/tools/gen_battle_prefab.py会重建720森林与已退役WireBattlePage，已停止生成，改为明确失败提示；现有资源保留人工编辑和UUID。


## ChapterEnd 主线只读结算（2026-11-05）

- 新 ChapterEndView.prefab 从旧 ChapterEndLayer/ChapterEndLoseCell 的资源与坐标恢复；旧两份预制体及 UUID 保留。新 View 与预制体同名，经 UIManager 的 Popup 宿主打开，预制体保存静态布局与组件绑定，节点使用英文名。
- 胜利播放 chibang/idle 循环并隐藏静态翅膀标题；失败使用 spr-wing-0 与 lbl-result-0、四个只读养成图标，修复旧导入乱码。音效分别使用 battle-end-1/0。
- Tools.layerEnterAction：主体 1.01→1，0.15 秒 backOut；透明度 0→255，0.08 秒；effect2[73] 彩带 0..10 帧、scale=2。anim/EffectFactory 将 speed=8 除以100，因此是每帧0.08秒，不是每秒8帧。
- 失败沿用 ChapterEndLoseCell 的5秒倒计时；胜利不自动关闭。点击遮罩关闭，暂停时引擎倒计时暂停；关场时关闭弹窗、音效、动画和定时器。播放动画结束与整个战场销毁分开，不能提前注销结算注册。
- 当前 BattleReplay 不含奖励/结算回执，只显示真实胜负与只读说明；不构造奖励，不发送挑战结束或领取协议。旧奖励 ScrollView 没有接入新 View；后续有权威奖励数据再接 SuperScroll。战报详情、养成、装备等跳转未开放。
- 正常独立战报入口在完整播放后显示结算。`?battleReplay=1&chapterEnd=defeat` 只验证失败样式、音效与关闭流程，明确标“失败样式验收”，不改真实战报、不宣称跑通真实失败关卡。
- 自动回归：`node tools/check_chapter_end.cjs` 覆盖真实 View 的胜败分支、音效选择、翅膀播放、彩带结束、5秒关闭、提前关闭及迟到资源、英文节点和组件引用。真实 Creator 视觉验收状态见开发进度，不以模拟生命周期测试代替画面验收。

## 页内挑战迁移（2026-11-06，本批画面待验收）

- MainChapterView序列化BattleHost位于背景之上、Panel之下，注册main-chapter-field宿主。正式挑战不再挂到全屏remake-modal，不隐藏底部面板。
- MainChapterBattleView移除重复宫殿背景和BlockInputEvents，保留原UUID与UIManager关闭清理。BattleReplayPreview的正式分支隐藏背景、测试日志、撤退和关闭按钮；技能验收台不受影响。
- 保留持久战报、正常结束结算、历史重播不发奖、提前退出不发奖和迟到清理，未改服务端资产逻辑。
- 客户端类型、main-chapter与bindings检查通过；实际预览尚未包含main-chapter-field代码，等待Creator刷新，不能算视觉验收。
- 旧BattleIdleLayer证据：挂机使用GReqChapterReport(firstPos,chapterIdx)与缓存；开启英雄对话，保留我方角色循环行进；近景速度120、远景20。当前WS契约尚无挂机同步，不能将旧暂停CampaignApi.current接回或用客户端假收益填充。

## 主页可见面板恢复（2026-11-06）

- MainChapterView从旧CampaignView迁入完整底部四项收益框、资源图标和球形关卡，三个按钮恢复战力提升/战斗/快速战斗。节点英文命名，保留主线Prefab及meta UUID。
- 移除临时主页奖励列表、背包详情依赖和重播按钮。确认的奖励仍由ChapterEndView展示；待结算使用战斗按钮恢复持久战报，播放后按既有幂等流程结算。
- 挂机协议尚未接入，时长显示未接入，三项速率显示—/分；不将通关奖励当作挂机收益。战力提升、快速战斗和挂机领取仅明确提示尚未恢复，不触发旧暂停API。
- 独立预览已观察新面板，最后修正旧关卡Label零尺寸；仍待最终数字显示复验。中部挂机英雄、滚动、遇敌、对话、宝箱动画仍未实现，不能签署正式主页完成。


### 2026-11-09 主线对话与开场

MainChapterView 内的 HeroTalkTemplate 保存旧气泡九宫格与 RichText，运行时只实例化、填字和跟随英雄槽；旧台词颜色标签转换为 Creator 富文本。BattlePage 新增 ChapterMatchInfoAnchor / ChapterTopBarAnchor，仅正式主线使用，避免信息栏被下方面板盖住；技能演示原布局不变。ZDKS 为一次性开场特效节点，正式挑战双方出场帧与挂机仅敌方出场分开。资源 UUID 保持不变。

本批通过旧资源开场、双方信息栏和返回挂机验收；跳过/倍速仍未恢复完整业务条件，不能据此称旧战斗界面全部完成。对话在密集站位下与其他单位头顶信息的避让、更多屏幕比例仍需后续复验。

### 2026-11-09 旧胜利布局收口

ChapterEndView保留普通失败/演示底板，新增静态MainVictoryPanel复用旧BattleEndLayer布局；最高伤害英雄挂点、头像、经验条、四列奖励、确认按钮均保存在Prefab，原资源UUID不变。经验条采用水平FILLED，不将无九宫格边距的贴图改为SLICED。奖励继续使用SuperScroll/SuperContent，不运行时另造布局。

正式主线结算使用已有remake-modal宿主，防止被主页收益面板遮挡；战场仍使用main-chapter-field。最高伤害模型1.065包含旧C++创建时0.5基础缩放。胜利主体在异步加载期间隐藏，资源就绪后统一淡入。主线胜利原点为(-320,-365)乘等比缩放，普通底板仍为(-320,-200)。

浏览器实际复验393×852、360×720、360×840；同一真实第三关结算暂停留图后恢复倒计时返回挂机，不算三次发奖。平板768×1024仅自动几何检查，未声明Inspector、真机或正式构建验收。详见[胜利页记录](validation/victory-review-20261109.json)。

### 胜利骨骼坐标换算

最高伤害英雄旧容器为140×120、中心锚点，骨骼局部(70,0)且导入缩放0.5，外层缩放2.13。展平到Prefab后缩放1.065，挂点须保留(0,-127.8)位移；因此HighestHero=(110,607.2)，不是直接复制show_hero=(110,735)。横向70与容器半宽抵消，不补149.1。数据及源码链见validation/victory-anchor-20261109.json；大型翅膀左边界表现仍待审。
