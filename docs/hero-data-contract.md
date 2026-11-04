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
