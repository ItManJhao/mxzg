# 主线播放控制与结算展示

更新：2026-11-09。当前范围见[开发进度](development-progress.md)，本批验证见[验收记录](validation/main-chapter-controls-20261109.json)。

## 旧规则依据

旧源码根为 `G:/work/FsGame/Demo/mj/program/client/cocos_mxzg/client/idle/src`。

| 项目 | 已核对依据与结论 |
| --- | --- |
| 跳过可见性 | `layer/battle/BattleInfoLayer.lua:setBattleType`读取`config/battletype.lua`；主线type=1的`skip_battle=0`，因此正常主线不显示跳过。GM强制显示不属于玩家规则。 |
| 跳过资格 | `data/BattleData.lua:canSkipBattle`为累计充值大于0或角色等级达到`system.battle_skip_level=50`。资格不覆盖战斗类型的隐藏条件；本批不开放主线跳过。 |
| 三档速度 | 实际战报链`comp/BattleReportBaseLayer.lua:updateBattleSpeed`为`speed * 0.25 + 1.5`，即图标三档对应1.5、1.75、2.0。不能套用旧`LuaBattleLayer`另一条链的1.3、1.6、1.9，也不能直接当作1、2、3倍。 |
| 倍速资格 | `BattleData.canChangeSpeed`及`config/goddessvip.lua`：第二档羁绊VIP 1，第三档VIP 5。2026-11-09负责人确认：权威羁绊状态未接入前保留默认档，点击显示条件，不猜测VIP、不扩展羁绊模块。 |
| 胜利窗口 | `net/BattleResponse.lua:chapterEnd`调用`layer/BattleEndCtr.lua`，不是通用`ChapterEndCtr`。正常主线使用旧BattleEnd布局，显示最高伤害英雄、历史经验动画、奖励及确认/倒计时；统计入口已打开独立双方伤害/承伤/治疗窗口，见[battle-statistics.md](battle-statistics.md)。 |
| 胜利倒计时 | `BattleEndLayer.time=5`，初始化先调用`changTimer`减到4，再每秒递减。只对本次确认奖励的正常胜利自动关闭；未确认结算保留恢复说明，不伪造领取成功。 |
| 失败倒计时 | `chapterend/ChapterEndLoseCell.lua`从6立即减为5，每秒递减。失败不播放胜利光效、不开放养成跳转。 |
| 胜利表现 | `BattleEndCtr`使用`chibang`、`effect2.eff_battle_end`及`battle-main-end-1`与`battle-end-1`。光效为已有14帧资源，间隔0.06秒，静态挂点和确认按钮保存在Prefab。 |

## 实现边界

- `BattleInfoUtils`保存已核对的显示规则与640设计宽缩放；不持有账号、权限或资产状态。
- `BattleReplayPreview`仅将正式挑战的战报段按默认1.5倍播放，位移、帧等待、震屏、遮暗与英雄骨骼保持一致。开场、挂机、结算各自保留原时钟；不修改全局导演速度。第二、三档不开放。
- 主线行军与遇敌、挑战使用同一等比收窄规则。静态节点、站位、挂点仍在Prefab；不根据屏幕宽度改变战斗人数或服务器阵容。
- `MainChapterBattleView`仍是唯一播放完成后的结算转交处；`ChapterEndView`只消费确认回执，不发送领奖请求。确认、遮罩关闭和倒计时共用页面关闭入口，不能触发第二次发奖。
- 结算关闭停止两个音源、帧动画、定时器并销毁物品说明；迟到资源不能重新播放。战报结束时隐藏本场信息栏和英雄，结算关闭后恢复挂机。
- 最高伤害使用服务端冻结的`abs(实际血量变化＋护盾吸收)`求和；并列保留名册首个我方英雄，旧战报缺统计时显示缺失。此口径经负责人确认，[护盾疑点](battle-known-issues.md)继续保留。
- `ChapterSettlementUtils`只计算显示排名和经验动画中间帧；经验每0.1秒推进、1秒到达回执终值，跨级门槛读取同源配置，不写角色资产。旧回执缺经验时明确显示缺失。
- 正常主线结算挂到既有`remake-modal`，避免被挂机底部面板盖住；正式战场仍在`main-chapter-field`。最高伤害模型缩放1.065来自旧C++创建的0.5乘Lua的1.5×1.42，不能漏掉原始缩放。
- 异步资源准备期间隐藏主线胜利主体，全部就绪后淡入，避免空文案和默认满经验条闪现。

## 后续复验

网页预览选项的设备名称不保证实际画布尺寸：窗口高度不足或切换设备时应同时记录canvas矩形、引擎frame与visible size。截图、几何检查、真实协议测试分别记录，不把桌面预览当作真机或正式构建验收。正式服用于效果差异参考；游爱只参考便于人工阅读维护的代码组织方式。

负责人已明确不需要横屏；适配和后续画面复验限定竖屏，不为本批扩展公共横屏布局。
