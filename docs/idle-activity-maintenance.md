# 挂机活动控制维护

更新：2026-11-13。本文是服务端维护入口说明，不是活动界面、兑换、道具回收或挂机领取开放说明。当前代码与验证范围见[项目进度](development-progress.md)及[维护证据](validation/idle-activity-maintenance-review-20261113.json)。

## 修改入口

| 内容 | 位置与职责 |
|---|---|
| 可信启用配置 | [IdleActivityMaintenanceProperties](../backend/src/main/java/com/funsgamex/mxzg/campaign/IdleActivityMaintenanceProperties.java)：默认关闭，列出区服、真实开服时刻及可选044发布 |
| 启动与定时 | [IdleActivityMaintenance](../backend/src/main/java/com/funsgamex/mxzg/campaign/IdleActivityMaintenance.java)：Spring启动实际应用配置，默认每2秒只维护配置区服 |
| 唯一控制写入 | [IdleActivityMaintenanceService](../backend/src/main/java/com/funsgamex/mxzg/campaign/IdleActivityMaintenanceService.java)：区服锁、初始化、发布与单步维护事务 |
| 首期和循环规则 | [IdleActivityControlRules](../backend/src/main/java/com/funsgamex/mxzg/campaign/IdleActivityControlRules.java)：上海零点、精确long秒运算、三种循环策略 |
| 044内容校验 | [IdleActivityPublicationUtils](../backend/src/main/java/com/funsgamex/mxzg/campaign/IdleActivityPublicationUtils.java)：规范兑换JSON、发布日筛选和内容摘要 |
| 策划生成 | [export_idle_rules.py](../tools/export_idle_rules.py)：默认检查两份投影，`--write`更新；不手改生成JSON |
| 收益读取 | [IdleActivityService](../backend/src/main/java/com/funsgamex/mxzg/campaign/IdleActivityService.java)：只读快照，不承担初始化、换期或发奖 |

不新增HTTP管理接口或玩家消息。可信配置由服务维护者提供，不从客户端接收时间、发布版本或兑换内容。

## 显式配置

默认`enabled=false`，不填当前开服时间、不初始化未列出的区服。日常服真实日期尚未提供，本批没有替负责人设置日期或发布活动。

在忽略提交的`backend/.local/idle-activity.yml`保存明确配置，例如：

```yaml
mxzg:
  idle-activity-maintenance:
    enabled: true
    interval-millis: 2000
    servers:
      - id: local-1
        opened-at: ${MXZG_LOCAL1_OPENED_AT}
```

`MXZG_LOCAL1_OPENED_AT`必须是负责人确认的真实时间，带明确偏移，例如`2026-11-13T00:00:00+08:00`这种格式；示例日期不是日常服已确认日期。没有时区、缺日期、重复区服或非正检查间隔均拒绝。区服必须已在`game_server`存在。

在`backend`目录使用现有启动流程加载文件：

```powershell
$env:SPRING_CONFIG_ADDITIONAL_LOCATION = 'file:./.local/idle-activity.yml'
.\dev.ps1 run
```

设定附加文件后，文件不存在会失败，不用可选路径掩盖遗漏。相同开服时刻重启保持已有周期；不同已持久时刻拒绝，本入口不承担开服重置。源码默认值始终不提供日期。

## 044发布

用户已确认：同时保存并校验非空兑换配置，仅开放控制维护。需要发布时，在对应区服下增加`activity44`；省略它不撤销已有发布，也不会每次启动重置为未发布。

```yaml
        activity44:
          version: 1
          start-at: ${MXZG_ACTIVITY44_START_AT}
          end-at: ${MXZG_ACTIVITY44_END_AT}
          clear-at: ${MXZG_ACTIVITY44_CLEAR_AT}
          limit-days: 0
          exchanges:
            - idx: 1
              item: '[{"item_type":900001,"item_num":2}]'
              cost: '[{"item_type":901702,"item_num":1}]'
              limit: 5
              mark-icon: 0
              show-mark: 0
```

这里的数量只是格式样例，不是已确认的正式活动数值。实际时间与兑换内容由真实运营配置给出，不以测试夹具发布日常活动。

- `version`是每服044单调递增的发布意图版本。同版本同内容重放不重置开始标记；同版本异内容和旧版本拒绝。新版本内容完全相同只确认新版本，不把它当新一期。
- `start <= end <= clear`，允许相等。旧活动仍处于`[start,clear]`时，新开始时间不能后移；同开始时间修改内容仍是同一期，不能把控制`revision`当作新期次。
- 每项保存旧`idx/item/cost/limit/mark_icon/show_mark`六字段。`item`必须是非空物品数组文本，`cost=[]`可明确表示无成本；数量必须显式存在且非负，0项保留，不当缺失或删掉。可选`chance`缺省0，原值保留但不在发布时抽样。重复兑换键、坏JSON、未知物品字段和越界数值拒绝。
- 规范化只统一JSON键序、空白及缺省chance，不合并或重排列表。发布摘要不含`version`，不依赖全局JSON缩进选项。
- 当前只做旧结构与数值完整性校验，不校验美术存在性，也不恢复兑换资格、次数、物品消耗或发奖。

## 首期和周期边界

| 活动 | 当前真实控制依据 |
|---|---|
| 016 | 开服第1天，记录7天、清理期2天、间隔0，循环类型0、最大轮次1 |
| 034 | 开服第9999天，记录7天、清理期0、间隔0，循环类型0、最大轮次1；最大轮次来自`promotionpve`，不是掉落表 |
| 044 | 运营发布，无策划循环参数；控制轮次可为0 |

首期开始是开服当天上海零点加`(open_server_day-1)×86400`，轮次身份时间等于首期开始。周期字段用long精确运算，034远期时间不得复制旧int的2038溢出。

每次维护只在`now > next_start_seconds`时推进一轮，不一次跳到当前期。循环0到最大轮停止，1复用末轮，2回第一轮。新一轮以先前持久的next为开始，不用新配置或当前时钟重算旧调度点；新轮掉落配置缺失使整服本次事务回滚。当前真实0/1轮配置结束后不会自动开启第二轮。

044发布将next设为start；严格到`now > start`时才令`turnsTime=start`并清空next。空next表示开始标记已消费，不是“资产已清理”。记录期起止秒仍均包含；clear不延长掉落记录期。

两种开服日算法分别保留：挂机资格是上海零点差的ceil，零点整秒仍属于前一天；044发布筛选是两个上海零点的实际秒差除86400向0截断、取绝对值再加1。后者不是带符号日期差，开始早于开服不自动拒绝；默认兑换配置只覆盖1至99999，超出时拒绝发布。历史夏令时按实际秒差计算，不替换为纯日历天数差。

当前016/034的星期限制均0。旧非零星期分支存在周日处理疑点，新初始化遇到非0会明确失败，未擅自修复或忽略限制。

## 数据与事务

V22只增加持久调度点及044发布元数据，不给旧记录猜next，也不默认填开服时间。已有已发布循环记录缺少冻结next会拒绝，须核对其真实来源；普通读取仍将空/缺控制与明确未发布分开。

每服先锁`game_server`，再按16/34/44顺序维护控制。`configure`把同服初始化和可选发布合并为一个事务；发布失败不留半份初始化。不同区服各自提交；启动先检查整份配置格式，数据库冲突仍按服报错，不承诺跨服原子提交。

控制revision表示控制变化，publication_version表示运营配置意图，turns/turnsTime表示旧期次身份，三者不互相替代。只读Input与纯计算保留冻结快照，之后维护不会修改已经返回的对象。

本批不调用旧角色活动初始化/重置、兑换、任务或清理钩子，不扣除016/044活动道具，也不把到期记成回收完成。未增加新挂机累计/回执或领取协议，不改角色资产revision；宝箱领取、快速战斗、英雄升级和穿脱继续关闭。
