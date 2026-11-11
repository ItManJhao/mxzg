# 主线战斗统计

## 旧版依据与口径

旧客户端`client/cocos_mxzg/client/idle/src/layer/BattleDetailCtr.lua`按攻守双方分别横排英雄，名册顺序不按伤害排序。每项从双方全体英雄取最大值，红色为输出伤害、黄色为承伤、绿色为治疗；全0时条形为0。主线只有一份报告，不开放其他玩法的三报告切换按钮。

旧服务端`mxzg-battle/.../model/BattleContext.java`、`HeroDo.java`与`HeroFightLog.java`确认：

- 输出伤害：每次`abs(实际血量变化＋护盾吸收)`后累计，继续沿负责人已确认口径；护盾疑点不因此关闭。
- 承伤：累计实际减少的血量绝对值，过量伤害截到剩余生命。
- 治疗：修正后的治疗数值计入施法者，包含溢出治疗，直接有符号相加；不是受疗者的实际回血量。负治疗显示负数，条形不反向延伸。

旧BattleEndCtr打开独立BattleDetailCtr，没有暂停结算倒计时。新版同样让结算按原定倒计时返回挂机，统计页独立保留，直到玩家关闭或会话页面整体清理。

## 阅读与维护入口

- `HeroBattleChapterScenario.Result.recoveries`冻结引擎治疗记录；`HeroBattleReplayProtocolUtils`在战报生成时累计三项数据，不改战斗和奖励规则。
- `protocol/game.proto`的BattleReplayUnit保存统计和历史星级，TS/Java由工具生成。旧持久战报不重算、不补造字段。
- `BattleReplayUtils`校验可选字段、安全整数及星级；`BattleStatisticsUtils`计算双方统一比例。
- `ChapterEndView`的战报按钮只打开`BattleDetailLayer`，不发送网络请求。页面由ApplicationPages登记到既有弹层宿主。
- `BattleDetailLayer.prefab`保存旧布局、遮罩、胜利标记和两份横向SuperScroll；`BattleDetailCell.prefab`保存只读英雄头像及三条FILLED进度条。列表尺寸与间距由SuperContent维护。

缺失统计显示—；任一单位缺某项时，该项保留已知数值但不绘制不完整的比例。模板重复不合并，历史星级缺失不读取当前名册。当前主线双方标签为我方/敌方；战报未冻结旧角色名、皮肤、进化外观，相关外观还原仍单列缺口。本批不扩展治疗技能或更多关卡的回放覆盖。

验证结果与截图记录在本批validation文件；规则测试不替代真实画面验收。宝箱领取、快速战斗、英雄升级、穿脱和其他玩法不在本批范围；清心与护盾待审项保持。

## 外观来源核对（2026-11-09后续）

旧Battle.proto的BattlerFightLog.name是双方角色名；HeroLog同时携带hero_id、star、fashion_id及evolve。BattleDetailCtr.lua:36将整份HeroLog交给UIMenuItemHero，非零皮肤会强制使用战报皮肤。UIMenuItemHero.lua:143先以hero_id查当前名册，查不到才使用传入日志的evolve；因此历史进化字段虽存在，旧头像仍可能被当前进化状态覆盖。缺省皮肤与0皮肤还存在Lua真值差别，不能仅按文字注释推断回退顺序。

负责人已确认采用开战时冻结外观；新版追加portrait_icon_id=13，普通头像按旧skin星级分段，进化头像按开战时进化分支/等级解析。皮肤穿戴状态尚未恢复，不伪造皮肤。旧setStar在6至9星改变星色/颗数，10星以上使用专用底图和效果；新版当前HeroIconCellView只保留五颗星，因此高星样式是独立缺口，不应称完整还原。

后续展示验证已完成双方各8格的真实拖动、遮罩、非零治疗216/432比例和关闭清理，见[展示夹具记录](validation/battle-statistics-followup-20261109.json)。夹具仅在页面内提供展示输入，没有写角色资产，不能替代真实治疗战斗或8人阵容玩法验收。

## 进化头像与高星样式（本批）

核对发现58张进化头像原已在资源目录，上一批缺的是资源ID索引而非图片文件；当时增加由skin与heroevolvelevel生成的BattlePortraitById（2026-11-11已收敛为IconCatalog.portrait冻结ID查询，可用范围保持），战报不再借用物品ID映射。58张进化头像及13帧高星光效按旧图集恢复半透明像素/完整画布，71张逐像素检查通过，既有资源与子资源UUID保留。

旧UIMenuItemHero.setStar及Player.awaken_star=14确认：1至5星显示对应金星，6至9星显示1至4红星；10至13星使用高星牌，11至13叠数字1至3；14星使用觉醒牌。品质边框按旧getRare选择，10星以上为5档。eff_hero_star来自effect2，13帧、每帧0.12秒、尾帧停留1.5秒循环。本批BattleHeroStarView只挂战斗统计Prefab；静态星行、牌、数字及帧引用归Prefab，运行时只切换可见性与帧，不影响英雄名册。

相关入口：BattleStatisticsUtils.stars/starFrame、BattleHeroStarView、BattleDetailCell、tools/generate_resources.cjs；原图验证使用tools/check_battle_statistics_art.py --legacy 指向旧项目res/hd/ccbi-res。40/40前端检查、类型和绑定检查通过；本批未修改服务端规则，不把上批47项后端结果算作本次重跑。浏览器两个进化分支与全部1至14星/缺失星级均已用纯展示夹具复验，高星三种竖屏通过，详见[高星记录](validation/battle-high-stars-20261109.json)，皮肤穿戴、胜利骨骼外观与历史双方姓名仍不在完成范围。

## 真实治疗回放（2026-11-09）

此前非零治疗仅由展示夹具覆盖，本批已补真实冰晶女巫第二关：recovery与damage按执行顺序冻结，统计仍取reported而非actual，溢出与负值口径未改。真实回放实际/报告治疗均26，统计为我方199/169/26、敌方169/199/0，胜利页进入战报和关闭返回通过。治疗不播放受击或死亡动作，血条按实际量更新；主动技能按旧actions.lua:4437至4506分离施法与战场特效。仅本英雄已核对直接治疗扩入主线，不宣称所有治疗触发链实机通过。证据见validation/battle-healing-20261109.json。

## 开战双方名称（2026-11-09）

旧BattleDetailCtr.lua:138/177直接读取attacker_log.name/defender_log.name；BattlerDo.buildHeroLog把开战方名称写入日志。旧BattleHandler.java:272至274按language[43100+chapter]加chapterreward.idx组成主线敌方名，本批前三关为“羽嘉森林1/2/3”。新版在服务端主线挑战锁内冻结双方名称，随战报持久化；统计页不读取当前昵称或当前关卡。旧战报明确显示“我方/敌方（历史名称未记录）”，明确记录的空串保留为空；只读演示不伪造历史名字。名称位置、300宽区域和26字号保存在Prefab，超长内容采用收缩。

独立持久化测试包含结算后直接更改测试库昵称再读旧战报，历史名称保持不变；此操作不代表改名玩法开放。相关17项后端、40项前端、类型、协议生成漂移和Java→TS真实名称/缺失/空串/非法控制字符检查通过。初次画面发现旧150宽、0.5缩放区域导致昵称过小，已修正；最终Creator编译资源宽300已核实，360×840正常名称、长名称及缺失提示通过，关闭组件为0且无新增报错；见validation/battle-names-20261109.json。

## 胜利历史骨骼映射

旧BattleEndCtr.setHero优先当前穿戴皮肤，否则调用Tools.getHeroSkinByStar读取战报星级/进化。当前未开放穿戴，沿负责人已确认的冻结外观方向，使用portrait_icon_id查询同源映射：普通分段显式对应skin+10000000，进化使用evolve_icon_id→evolve_fashion_id，不对所有ID直接减常量，也不读取当前名册。58种进化骨骼均已有资源及stand动作；旧字段缺失或配置未匹配明确标注“历史外观缺失”并显示基础模型。只修改胜利页，不改变战斗动画或挂机模型。大型进化模型左边界仍待核对；详见validation/victory-appearance-20261109.json。
