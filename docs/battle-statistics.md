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
