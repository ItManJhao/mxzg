# 英雄模块恢复依据与批次边界

目标仍是完整还原旧游戏，以下基础批次不等于英雄模块完成。

## 已核对的旧实现

旧工程根目录：G:/work/FsGame/Demo/mj/program。

- client/cocos_mxzg/client/idle/src/net/RoleResponse.lua 登录初始化发送 GReqHeroList，page=1。
- mxzg-protofiles/protofiles/game/Hero.proto：4001 请求/返回分页名册，返回 hero_capacity、buy_space_times、list、send_status、page。ResHeroData 区分 hero_id（实例）与 hero_type（配置），并包含 level、stage、star、元素、职业、锁定、战力、皮肤、基础属性与养成扩展。
- LoadingSceneCtr.lua 等待 GResHeroList；HeroResponse.lua 处理名册、英雄增加与删除。旧版不能概括成“所有英雄无需请求、只靠推送”，也不能把新版统一初始化实现说成旧协议原样复刻。

## 本批实现：统一名册基础

延续用户确认的新版 WS＋Protobuf 统一初始化约定：session.login/session.authenticate/state.changed 携带名册。后端 SessionSnapshotService 在角色锁事务中读取 HeroRepository，移除 List.of() 空占位；不发放测试英雄、不新增查询接口。

前端 AssetStateBinding 在任何提交前校验英雄、角色、普通及期限库存，并核对身份和持久版本；HeroRosterController 按 Protocol/onNotify 提交唯一 HeroRosterModel，通知在同一批次资产提交后发出。换号/退出由应用清空名册，控制器不依赖账号或 token，不额外查询。

本批沿用既有 Hero 的四个字段：id、templateId、level、star。协议字段号和 WebSocket 子协议未改。旧版数值实例 ID 与新版 UUID 的差异属于已确认独立新版边界，前端均按字符串处理。未把旧 hero_type 当实例 ID，未用头像或形象配置替代英雄模板。

旧升级控制器不再通过暂停资产回调写名册；升级仍拒绝调用。页面入口保持关闭，避免将 locked=false、deployed=false 等历史展示占位冒充真实服务器状态。

## 后续恢复顺序

1. 核对并补齐名册所需容量、排序、元素筛选、锁定与上阵标记；字段含义、默认值和配置以旧源码/服务端为准。
2. 开放英雄列表：复用 HeroListView/Board/Cell 与 SuperScroll，统一 UIManager、唯一 Model、页面不开查询；对照旧版截图检查格子和分类。
3. 恢复只读 HeroInfoView：核对真实属性、技能、星级和各子页，明确与普通升级面板的关系，不保留临时升级框替代完整详情。
4. 单独接入普通升级的协议、规则、幂等、持久化与服务端变化同步；随后分批恢复其他英雄养成。阵容、战斗等跨模块入口仍不扩展。

## 验证

新增 hero-state 回归覆盖初始化、升级后的服务器快照、删除后的空名册、同版本恢复、旧版本丢弃、重复/非法英雄整包拒绝、退出后的迟到数据。后端新增统一快照只返回本角色持久英雄的用例。运行结果见 development-progress.md；本批不声称完成英雄界面或正式服视觉验收。


## 第二批：锁定、主线上阵与排序

已核对旧 HeroListHeroLayer.editHeroData：上阵优先，其后星级、等级、hero_type 依次降序。HeroData.getHeroByElem 按元素筛选；展示排序不得修改唯一 Model。LineupData.checkChapterTeam 与 ChapterData.setBattleTeam 清空并建立 Promote.battle_list，因此列表标记对应主线队伍，不是任意玩法阵容占用。

HeroService.buildHero 下发英雄自身 is_lock；HeroResponse.heroList 将 1 转为 true。这与分解候选接口合并的“阵容占用锁”不同，也不代表未获得。新版 Hero 新增 optional locked=5、deployed=6，保留已有字段号；V9 持久化自身锁定，主线标记通过同角色 game_lineup_slot 的 EXISTS 查询计算，不新增阵容写入口。旧快照缺字段保持 undefined，不宣称已同步；页面尚未开放。

修正旧展示混淆：拥有但锁定的英雄仍显示正常头像与等级，可同时显示上阵；只有 kind=locked 的未获得图鉴格灰显。列表排序已接入，未开放锁定修改、升级或阵容编辑。

容量证据：旧 LoginHandler 使用 systemSysCache.getHeroSpaceInitial 初始化 role.heroNum；RoleVipService.getHeroCapacity 返回 role.heroNum + goddessvip.extra_bag_space（VIP>0时），HeroData.getCapacity 不再自行加成。新版容量、购买次数及 VIP 加成数据尚未接入，不能用固定数量或当前英雄数替代上限。这是开放完整列表前的下一项。


## 第三批：只读容量接入

V10 在角色持久字段保存 hero_capacity（基础及已购扩容）、hero_capacity_buys、goddess_vip；历史新版角色按已核实的当前初始值 300/0/0 补齐，新角色从共享 system 配置显式初始化容量。HeroCapacityService 在快照角色锁内读取持久状态，叠加共享 goddessvip 表加成；VIP 为 0 不加成，未知等级直接报错。此实现不提供 VIP、扩容写接口，也不代替后续完整 VIP 模块。

Snapshot 新增可选 hero_roster=6，其 capacity 为最终总容量，buy_space_times 为成功购买次数。前端在整包提交前校验，缺失表示未同步，错误数值拒绝整包；唯一 Model 同时保存名册与容量，退出清空。列表显示已有数量/总容量，不重复加 VIP、不按筛选后的数量计算占用、不因超容截断已有英雄。

当前 herospace 导出仅一条：times=1、space=1、消耗 99999 钻石。已核对旧 HeroHandler：按下一次配置扣费、购买次数加一、持久容量加 space。本批不据此开放付费购买，恢复购买前仍须核对正式服当前入口及策划版本，避免把特殊配置当常规设计。

第二批记录中的“容量未接入”已由本批解除。只读列表入口与 Creator 画面仍未验收，详情及写操作仍暂停；后续先接通列表入口并完成独立环境视觉验证。


## 第四批：只读列表入口

RemakeApp 通过 UIManager 注册 HeroListView，按需加载 HeroResources；View 默认绑定唯一英雄 Model/Controller 和共享配置，不注入升级操作。主城允许英雄与背包入口，其他暂停玩法仍被拦截。关页释放监听，应用结束释放资源。

独立 MySQL 夹具 36 个同模板英雄只用于滚动、等级排序和锁定验收，不能用作完整图标映射证据。393×852 预览已验证打开、滚动至末行、空元素筛选、容量不随筛选改变、回城重开。尚有视觉差异：三行半视口与下方大留白、格子名称覆盖头像；下批对照正式服列表后修复，不称为 1:1 视觉完成。详情与全部英雄写操作仍未开放。


## 第五批：列表视觉修正与基础只读详情

对照正式服实际列表与旧 HeroListHeroLayer/UIScrollViewBackpack，移除拥有英雄格子的名称覆盖，扩大四列格子及滚动区域至容量栏上方。复用旧预制体 UUID，继续使用 SuperScroll。旧版空格补齐行为尚未恢复，不能将本批视作完整列表 1:1 验收。

HeroInfoView 通过 UIManager 的 hero-info 页面打开，参数是实例 ID；读取唯一 HeroRosterModel，订阅更新，删除实例或角色归属变化时返回，关闭释放监听与立绘。复用旧详情预制体和 Spine；立绘比例参考旧 HeroInfoLayer.createSpine 的 1.5×1.42。升级、装备、扩容等写入口不开放。

Hero 新增 optional stage=7 和 base_stats=8，原有字段号不变；基础属性由服务端按 HeroGrowthRules 和持久等级/星级/强化计算，随登录、恢复和状态变化快照统一下发。前端严格校验并冻结数据，详情不额外查询。当前只展示名称、元素、立绘、等级、星级、强化与攻防血速基础值；不将这些值称为完整战力。技能、装备、天赋和完整加成是明确缺口，需要继续对照旧协议与配置恢复只读展示。

## 第六批：四个基础技能与只读说明（2026-11-04）

依据旧 HeroData.lua 的 getHeroSkillList/getHeroSkillLevel、HeroInfoUpLevelLayer.updateLevelSkillInfo 和 UIMenuItemSkill，只展示模板 skill_1 至 skill_4；skill_5 普攻不加入四格。HeroUpgrade 控制强化解锁，HeroStar 控制等级；星级不超过 5 且强化低于星级时，按强化 + 1 查技能等级。未解锁技能灰显并显示强化条件，点击明确标记一级效果预览；阶段缺失显示待同步，不当作强化 0。

新增 HeroUpgrade、HeroStar、HeroSkill 的生成配置入口，名称和效果使用同等级技能行的语言 ID。图标在资源生成阶段登记真实旧资源。HeroInfoView 读取唯一名册并刷新四格；HeroSkillView 是独立静态预制体，经 UIManager 打开，订阅名册更新，英雄删除或角色变化时关闭。两页不新增请求、不写资产，不开放升级。

本批只覆盖基础技能。旧 getHeroSkillLevel 另有进化状态替换技能的分支，新版尚无该状态，不能宣称进化技能已恢复。技能文案暂用纯文本保留换行，旧富文本颜色等表现仍待还原。

后续必须补齐的服务端数据边界：

| 内容 | 原项目证据 | 新版缺口 |
|---|---|---|
| 英雄穿戴关系 | HeroResponse.heroEquipData / heroEquipChange；EquipData 按 hero_id 保存槽位、equip_id、equip_type、soul_lv | 背包物品不等于已穿装备；须补英雄实例与装备实例/槽位的持久关系和统一同步 |
| 完整属性 | HeroResponse.heroList 接收 atk/hp/def/spd；HeroAbilityData 的 getAtk/getHp/getDef/getSpd 直接读取下发值 | 当前 base_stats 仅基础属性，不能用前端猜算代替装备、天赋等最终加成 |
| 进化技能 | HeroData.getHeroSkillLevel 的 heroevolvelevel 替换分支 | 先补真实进化状态与配置，再替换基础技能 |
| 星级图形 | HeroInfoLayer.createStar 区分黄星、红星、十星及觉醒 | 当前数字星级准确，但图形和觉醒状态尚未完整还原 |

自动回归覆盖强化解锁、星级等级、语言、空槽、未同步、错误配置和只读结果。Creator 实测树精技能说明、关闭返回和切换布鲁，图标/名称正确更新，无旧实例残留。此次只读使用日常测试角色，未发放资产；未重跑后端/MySQL 测试，不能引用前批结果作为本批新增验证。

## 第七批：普通装备数据边界（2026-11-04）

已核对 CommonDefine.lua:425 的 EquipMaxCount=4，以及 HeroInfoLayer.setEquipBtnEvent / updateHeroEquip：普通装备仅 1–4 槽，空槽资源 other/spr-equip-1 至 4；符文与神器另走独立入口，不能用其锁图标判断普通槽解锁。普通四槽的具体限制仍需继续核对服务端穿戴规则，不凭正式服截图猜测等级门槛。

equipmenttype 表已加入显式生成规范，包含 equipment_type、place、rare、star、合成成本与属性原始文本。HeroEquipment.ts 建立只读校验边界：实例 ID 保留字符串，槽位必须匹配配置；拒绝重复槽、重复实例、非法附魂等级；undefined 不等同空数组。该文件当前是后续快照接入的基础，尚未加入业务协议或运行时 Model，不表示装备已同步或 UI 已恢复。

后续实现顺序：持久装备实例与英雄穿戴关系（角色隔离、一实例一槽）→ 同一事务统一快照 → Protobuf 生成与前端整包校验 → 四槽静态预制体只读展示 → 独立环境验证。禁止用普通库存数量生成虚假穿戴；不增加装备查询接口或开放穿脱操作。

## 第八批：持久穿戴关系与统一四槽快照（2026-11-04）

装备基础已提交本机 main：460a6b6d。本批 V12 新增 game_equipment：字符串实例 ID、所属角色、配置、普通槽位、附魂等级与可空英雄 ID。主键防同实例多处穿戴；英雄/角色组合外键防跨角色，英雄/槽唯一约束防同槽多件。配置槽位在服务端读取时再次核对。旧普通库存不自动转换为穿戴实例，未发放玩家装备。

HeroRepository 在既有角色锁事务内批量读取本角色穿戴关系；HeroProfile.equipment 包含完整 items，未穿戴英雄显式空列表。登录/鉴权恢复与 state.changed 都复用 SessionSnapshotService，不新增装备查询或穿脱协议。protocol/game.proto 的 Hero 追加 optional equipment=9，原字段号不变；实例 ID 使用 string。前端整包校验结构、重复槽和跨英雄实例重复后，HeroRosterController 提交唯一 Model，View 订阅原事件刷新。

HeroInfoView 复用旧 menu_equip 下四槽位置与素材，静态绑定品质框、图标和状态文字。普通槽按钮不可操作；装备星级/附魂以文字展示，尚未达到旧星形叠图的最终表现。缺包装显示待同步，空列表显示对应旧空槽；异步图片加载按详情绘制代次作废。详情加载 EquipmentType，不扩大登录首屏配置组。基础属性依然明确不含装备与天赋加成。

本批不提供装备写业务，故尚无装备事务触发来源；今后穿脱服务必须在角色锁与 AssetSyncService 持久版本事务内修改，提交后统一推送，禁止直接 JDBC 改玩家装备后假定会自动广播。测试夹具只在独立内存宿主通过 --equipment-fixture 显式创建，不进入日常后端。

当前验证：H2 V1–V12、后端 63 项回归通过；包含穿戴持久读取、同槽/跨角色拒绝、空装备、重复恢复及 Java Protobuf 往返长 ID。前端装备/技能/名册、协议、长连接、配置组、绑定、启动及双类型检查通过；生成漂移检查通过。Creator 仍未导入新脚本，实际四槽画面待刷新，不能标记视觉验收完成。本批未重跑独立 MySQL，也未重启日常后端或操作玩家资产。

独立 MySQL 补验：2026-11-04，run=3208d438547b4bdab2bd5d32a490aaa1，16/16，通过 V1–V12、同槽/跨角色约束、装备实例重启恢复和解除关系后的空列表。ownership.properties 已确认 state=stopped。更新了原有测试写死的迁移数量 11 为 12；以上均在新建专用 MySQL 实例完成，未连接玩家库。

最终 Creator 验收已完成：用户两次刷新后已导入最终脚本及预制体。独立内存 run=5e8db5f5a8d34eb381c644009df7121e，equipment_review：独眼梦魇四件装备、绿色品质框、星级/附魂文字正确；点击装备未打开操作窗口；返回列表切换树精，四槽显示旧空槽资源，没有残留装备；符文/神器未恢复节点已关闭。页面 error/warn 为零，截图 images/hero-equipment-20261104.png 与 images/hero-equipment-empty-20261104.png。上文“实际画面待刷新”已解除，日常后端未重启，本批完整接入仍未提交。下一步核对服务端最终属性组成，不能把当前 base_stats 加上装备表就当完整战力。

## 第九批：面板计算核查与同步（2026-11-04，容量待确认）

装备完整接入已提交 5c95c7a6。日常 local 后端已启动，PID 10960，端口 18080，mxzg.protobuf.v2 握手通过，GM 沿用开启；使用 .local/game 文件 H2，启动自动升级 V12，没有发放资产。固定入口 scripts/start-remake-backend.bat，重启用 restart-remake-backend.bat，查看状态用 status-remake-backend.bat；本批修正 control.ps1 已退役的 HTTP 探针为 WS 握手。

旧最终属性依据：HeroService/ HeroHandler 通过 QueryHeroCommand 读取 HeroDo，initAttribute 后返回四属性；HeroReceivers.buildHeroDo 使用实际穿戴和其他来源，BattleTemplate.addEquipmentAttr 累加装备 ability，并按相同 set_type 件数累加所有 num<=件数的套装门槛。AttributeInfo.initMaxHp 先将 HP 与 HP_PERCENT 转为 MAX_HP；getAttribute 对攻、防、速读取对应百分比，getRate 上限 50000，以 double 乘法后向零截断，不能先把每件百分比单独取整。

核查还确认 BattleTemplate.addSkillAttribute 只处理 count_stats=true 技能的属性 buff；附魂可能加技能，并非附魂等级直接乘装备属性。符文、觉醒、进化、外观、宝石、角色级称号/图腾等由独立接收器补入；不能把未恢复的来源默认为已支持，也不能将战斗阵容光环当作单英雄详情必有属性。旧 HeroReceivers 局部 talent AttributeInfo 的创建不等同最终已合并，后续需沿调用和接收器逐项验证。

本批 HeroPanelRules 恢复现有基础、装备、累计套装来源，不新增养成持久状态或写接口。Hero.panel_stats=10 使用 int64 四属性、included_sources/pending_sources 和 complete；当前 complete=false，明确列出技能面板、附魂技能、天赋、符文、觉醒和其他角色/英雄来源的缺口。前端严格校验覆盖声明与安全整数，唯一名册保存面板，不自行叠加装备；详情显示“当前属性（部分加成待恢复）”。这不是完整旧服最终属性恢复。

独立后端回归 65/65：真实 2/3/4 件套阈值、百分比取整、装备取消后的面板变化与现有统一快照；前端协议/长连接/英雄/状态与双类型通过。新增 300 名英雄×四槽×面板统一快照回归发现协议帧超过 64KB，当前容量用例仍失败；不能标记本批全部完成，当前日常进程保留已验收装备版本，尚未切换面板实现。

容量处理评估：
- 统一帧上限 256KB：前后端编解码与 WS 接收限制需同步；延续一次原子快照，继续限制上界与非法消息，单帧输入预算扩大四倍，需要用户确认后执行。尚未修改。
- 分页/专用快照分片：可保留每帧 64KB，但需引入批次 ID、总量上界、超时、丢包重试和整包验证后原子提交；登录与恢复契约及测试范围明显扩大。
- 压缩：需要跨 Creator/小游戏一致编解码及解压上界；仅压缩不能代替解压大小限制，当前没有该基础。

自动审批拒绝 256KB 修改，理由为扩大网络输入/资源消耗边界且用户未明确批准；未绕过。面板实现未提交，保留失败容量回归作为收尾要求，待用户决定容量方案后继续页面验收与服务切换。

## 256KB 容量确认与收尾（2026-11-04）

用户明确回复“同意修改”后，前端 GameProtocolCodec 和后端 GameProtocolCodec 统一为 262144 字节；GameSocketHandler 引用后端编解码常量，避免接收与解码阈值漂移。仍在解码前拒绝超限数据，编码也检查大小，不开放无限消息。上节自动审批阻止事项已获得用户明确授权并执行。

最终后端 66/66；新增真实 WS 300 英雄×4 装备×panel_stats 完整鉴权首包成功，事件快照实际超过旧 64KB 且不超过 256KB，超限消息仍关闭；修正旧超限测试写死 70000 字节，改为上限+1。前端相同容量与双向超限、协议、长连接、名册/视图、绑定、双类型、生成检查通过。300 英雄夹具使用独立内存账号且不调用会额外发放三名英雄的暂停战斗初始化流程。

独立内存预览 run=2b681991f99d4147b2c7a98670f84fd4：带装备独眼梦魇显示攻击110、生命590、防御24、速度45；切换空装备树精显示45/205/20/44，无加成残留，页面明确“当前属性（部分加成待恢复）”。浏览器无 error/warn，证据 images/hero-panel-20261104.png。完整旧服来源仍未恢复，不将本批称作全部最终属性完成。独立 MySQL 16项结果为装备批次，本批没有重跑，不混用验证范围。

日常 local 后端已在测试通过后重启，PID5736，127.0.0.1:18080，GM 开启、文件H2保留，未修改玩家资产；本批无数据库迁移。当前面板及容量代码尚未提交。Creator 仍待导入新的客户端容量常量，已请求资源刷新，刷新后补记最终检查。

最终刷新补记：Creator preview 编译产物已确认262144，客户端常量待刷新状态解除；独立内存预览40392已停止，日常后端5736继续运行。

## 第十批：技能面板加成（2026-11-04）

属性及256KB批次已先提交60c5553c。本批恢复服务端基础技能的面板贡献，不开放升级或穿脱：HeroSkillPanelRules 按旧 BattleTemplate.getSkillsBy 使用真实星级的 HeroStar、持久强化的解锁位及 type/level 技能键；普攻按level=0选取，但按旧SkillInfo分类排除主动/普攻进入被动面板集合。仅count_stats=true处理art_list→buff_list，不执行战斗触发链或递归art。

CBuff属性分支为160、163及BuffType.stateAttributeBuff确认的323/324/330/332；163读取value[0]作为生命百分比，其余读取value[0]属性类型、value[1]属性值。非属性buff忽略，引用缺失报错，不能降级为零。成长率120按旧addInitAttribute对原基础项分别乘比率并截断，不乘已加装备后的值；此次一并修正生命initMaxHp不受攻防速getRate的50000上限影响。

生产HeroRepository在既有统一快照计算技能贡献，included_sources增加skill_panel，pending_sources仍保留附魂技能、天赋、符文、觉醒等。该实现仅基础技能，进化替换仍待真实状态恢复，不能称所有技能系统已恢复。装备独立计算重载没有英雄上下文，仍明确将skill_panel列为待恢复，避免覆盖声明造假。

后端69/69通过：真实10103003模板强化前后生命/防御加成、成长率独立截断、生命上限差异、持久英雄快照与重复恢复，包含既有真实WS300英雄容量回归。前端装备/面板容量与统一名册回归通过。本批没有改变前端源码或协议字段，没有重跑MySQL，不引用前批MySQL作为本批新增结果。独立内存页面使用显式--skill-panel-fixture参数创建30级/3星/强化1英雄，日常资产未修改。

最终页面通过：独立内存run=c05999b68e774c52bb2f4cbe74a49d52，skill_panel_review，30级/3星/强化1灰烬使者。旧基础生命1567、防御145，经“战意”生命+10%、护甲+16%，页面显示生命1723、防御168，攻击221、速度161；技能说明与真实语言表一致，error/warn为空。截图images/hero-skill-panel-20261104.png及hero-skill-panel-description-20261104.png。测试页面关闭，本次内存宿主按身份停止；日常8676继续运行。本批未提交，未开放任何养成操作，下一步先核对附魂技能与进化状态对技能替换/面板的影响。

## 第十一批：附魂只读规则与进化核查（2026-11-04）

技能面板批次已提交dcae541d。本批HeroSoulRules读取同源heroequipsoulextra全局第一行、equipmenttype、heroequipsoul和heroskill引用。旧缓存getConfig()取getAll().get(0)；当前四行need_star均999，need_equip_star=4，客户端原拼写need_euqip_rare=5。旧客户端EquipData/HeroSoulCtr也按该拼写读取，服务器Java实体为need_equip_rare；新版明确沿当前已导出表读取，不偷偷改表或降低门槛。

HeroEquipmentRepository在同一角色读取中联结英雄真实star，校验英雄星级、装备品质/星级、附魂等级后才推导soulSkill。protocol/game.proto在HeroEquipment追加optional soul_skill=5，含skill_id和level；无生效技能则缺失。前端整包校验正整数、附魂等级>0及不可变副本，不依据soulLevel拼出技能。不新增附魂请求或开启按钮，不改数据库结构，不发放装备。

旧HeroReceivers先经BattleTemplate完成基础技能面板，再addSoulSkill，后者只加入SkillInfo，没有再次调用addSkillAttribute。当前附魂技能表count_stats=0，且英雄门槛999，因此正常英雄下发soulSkill应为空；不能给已有附魂等级增加虚假属性。该批不表示附魂战斗触发链、附魂养成界面已恢复，pending_sources的soul_skill缺口仍保留。

进化后续依据：HeroEvolveReceiver在LOWEST阶段对QueryHeroCommand等追加当前heroevolvelevel.attr，再替换/添加技能；未重算新技能的count_stats初始面板。客户端HeroData.getHeroSkillLevel按hero_type/evolve.type/evolve.level查表，匹配skill_old_id后显示新skill_id/skill_level，且仍先判断强化解锁。当前导出174行，全部skill_id==skill_old_id（升级同一技能的等级）。服务端removeIf比较idx、配置值为type，需继续核对SkillInfo.addSkill按类型升级的实际效果，不能将字面removeIf直接照搬成正确实现。下一步先补持久evolve.type/level、统一快照、属性与只读技能替换；不开启进化操作，不默认所有英雄已进化。

本批后端71/71、前端hero-equipment（含生效字段Protobuf往返、冻结及非法值）、hero-state、hero、生成漂移及双类型通过。正常角色门槛关闭在真实统一快照测试核对；999星仅纯规则测试夹具，用于验证达标分支，未创建999星玩家英雄。未重跑MySQL、没有新增UI或进行本批页面验收。日常后端已更新，GM保留，现有玩家资产未修改。本批尚未提交。

## 12. 2026-11-04：进化与战斗输入核查、纯规则基础

前批附魂及文档已提交本机 main `10546843`，未推送。本批不开放进化、升级、穿脱、阵容或战斗，不改数据库和游戏协议。

### 已确认的源码链

路径相对旧项目 `G:/work/FsGame/Demo/mj/program`：

| 规则 | 依据 | 新版处理与边界 |
|---|---|---|
| 基础成长、装备/套装、技能面板贡献 | `server/mxzg-server/mxzg-template/src/main/java/com/ayjs/mxzg/module/battle/BattleTemplate.java`：convertFrom、addEquipmentAttr、addSkillAttribute | 既有面板仅覆盖部分来源；战斗不得把四维展示结果再次作为基础叠加装备 |
| 技能解锁和等级 | 同文件 getSkillsBy：强化控制前四技能解锁，真实星级决定技能等级；skill_5 固定查等级0 | 后续战斗共享此选择规则，不能从文字或前端图标反推；普攻和主动/被动分桶 |
| 技能身份与升级 | `server/mxzg-server/mxzg-battle/src/main/java/com/ayjs/mxzg/battle/model/SkillDo.java` createOf；同目录 SkillInfo.addSkill | skillId 是 type，不是 idx；同类型仅以更高等级替换，没有原技能则添加 |
| 进化属性与技能 | `server/mxzg-server/mxzg-gameserver/src/main/java/com/ayjs/mxzg/gameserver/module/hero/receiver/HeroEvolveReceiver.java` doEvolveHeroDo | 查当前英雄/type/level 行，读取 attr 总量；不能累计各级，也不能用 attr_show 增量代替 |
| 附加效果顺序 | 同目录 HeroReceivers.buildHeroDo：convertFrom 后觉醒、附魂、设置进化；进化接收器 LOWEST | 进化替换后没有在该接收器再次执行 addSkillAttribute；不能自行再加一次进化被动面板贡献。完整接收器顺序仍需战斗集成时核对 |
| 战斗属性与结算 | `server/mxzg-server/mxzg-battle/src/main/java/com/ayjs/mxzg/battle/model/AttributeInfo.java`；`util/FightUtil.java` calDamage | 最大血量初始化、百分比、暴击/格挡、能量、元素/职业/伤害类型等与四维分离；当前新版 CampaignBattle 的攻击减防御不等价 |

### 本批实现

新增 `HeroEvolutionRules` 纯规则基础，构建打包共享 heroevolvelevel 表，精确索引英雄配置/分支/等级，校验技能类型+等级引用。当前真实表174行，skill_id均等于skill_old_id；进化技能 active_type 包含0、1、3。属性包含101、102、201、204、207、220、223、224，保留207暴击率等非四维项。

旧进化删除逻辑比较 idx 与配置的 type，且 getPassiveSkills 返回副本；不能按字面解释为可靠删除。当前表全部同类型，SkillInfo.addSkill 的较高等级覆盖能确定实际结果。本批仅实现这个已确认范围；将来出现不同类型替换配置时显式拒绝并要求重新核查，不静默猜测。

0/0表示明确未进化，部分零值、负值、不存在的进化行拒绝；只返回不可变当前总属性和技能结果。不写持久状态、不接入现有 HeroRepository 或面板；因此玩家当前显示与战斗行为不变。下一批仍需进化持久化、统一快照、技能只读投影和共享战斗输入接线，不能把本纯规则测试称为进化已上线。

### 验证与下一批出口

本轮后端74/74、0失败，日志 `backend/target/evolution-foundation-test.log`。新增3项测试覆盖当前总量而非累计、非四维保留、不可变性、非法状态/缺配置、技能type替换、较高等级保留、不改变输入及重复技能拒绝。未重跑MySQL、Creator或正式服；无前端变更，无玩家数据修改，本批未提交。

下一批先将进化type/level持久化并进入统一快照；同源选择基础/进化技能，保留属性来源与未支持项。阵容/战斗接入前另验：角色归属与站位、战斗专属属性、技能目标/冷却/触发/状态、规则版本与随机记录、待结算战报恢复和唯一领奖事务。逐条恢复，禁止用普攻或零属性代替未支持机制。

## 13. 2026-11-04：进化持久状态与只读同步

前批规则基础已提交本机main：`dac9ef6e`，未推送。本批新增V13：game_hero.evolve_type/evolve_level默认0/0，约束只允许同时为0或同时为正；历史英雄不自动进化。合法配置组合由HeroEvolutionRules精确验证，非法存量记录拒绝构建快照，不伪造普通英雄数据。

Hero.evolution使用新字段11，携带type、level及服务端核验的技能type/level。未同步和0/0明确未进化分离；登录、恢复、state.changed共用现有完整快照，不增加查询和进化写协议。读取仍限定角色归属，进化不另建缓存或持久派生属性。

当前等级的进化总属性在原基础技能面板贡献之后合并，统一计算百分比和取整；includedSources增加evolution，complete仍为false。进化技能替换不重新执行面板被动，避免重复计算。规则保留的暴击等非四维属性仍待未来战斗构建使用，本批面板仅显示四维，不能称为完整战斗属性。

前端严格校验进化与技能字段一致性、冻结数据；四个技能槽在原解锁条件下显示同类型较高进化等级，直接使用已有同等级语言配置。未改头像/进化外观、预制体或养成操作；现有升级、穿脱、阵容、战斗和挂机仍暂停。

本轮后端75/75通过；前端hero-detail、hero-equipment、hero-state、Creator与strict类型检查、协议生成检查通过。新增测试覆盖零状态、非法组合/配置、当前总量、角色隔离、快照重复读取、Protobuf字段保留和技能说明。独立MySQL验证结果完成后追加；Creator真实进化角色画面尚未复验，不把纯投影检查称为页面验收。

独立MySQL最终17/17通过，run=`bc197556f2f94fafb75bd76f2599fc98`，日志`backend/target/evolution-mysql-final.log`。首轮16/17的失败是MySQL约束异常映射不同，数据库实际拒绝成功；最终断言精确检查3819错误及原值不变，未放宽约束。V3合成英雄经V13仍为0/0，进化英雄应用重启后状态/技能/属性一致，测试实例已停止。本批未重启日常后端，未对日常库应用V13、未修改玩家资产；待独立环境页面验收后再更新日常服务。本批代码尚未提交。

### 进化画面验收完成

2026-11-04 Creator预览393×852，独立内存实例ddee0f57b1f0422ba5368602ec63004e，测试账号evolution_review。同模板10105008：进化1/2显示攻击7845、生命46941、防御245、速度168、灵魂窃取Lv.5（209%伤害、70%沉默等）；未进化显示117/574/45/114、Lv.1（145%伤害、35%沉默）。详情→技能说明→返回列表→切换对照英雄正常，未出现数据残留，error/warn为零。证据：[进化面板](images/hero-evolution-panel-20261104.png)、[进化技能](images/hero-evolution-skill-20261104.png)、[未进化对照](images/hero-evolution-control-20261104.png)。测试宿主与页面已关闭，未改日常资产。新增夹具仅测试classpath、显式参数、强制内存库；已完成test-compile和真实启动验证，前批75/75及MySQL17/17结果沿用，未重复运行。
