# 背包标准模块：维护与验收入口

更新：2026-11-03。当前采用登录统一初始化与服务端资产同步，保留现有 Prefab、只读详情、SuperScroll 和唯一 BagModel。其他玩法暂停；旧查询模板已经退役。

## 固定目录与文件职责

- features/bag/BagController.ts：声明协议，onNotify → onInventoryState → Model → BagEvent。
- features/bag/BagModel.ts：唯一库存状态、全量校验与界面 revision，不联网。
- features/bag/utils/BagEvent.ts、data/：界面事件、状态、变更集和物品类型。
- features/bag/ui/：BagView、BagItemView、BagInfoView、BagTabView 和挂载辅助。
- features/account/RoleController.ts：角色协议入口，提交 AccountModel 中唯一角色资料，不处理登录。
- app/remake/AssetStateBinding.ts：应用协调身份、持久版本、角色与背包原子通知。
- platform/Protocol.ts / ProtocolRouter.ts：统一消息目录与真实消息定向分发，不保存玩家资产。

BagApi、BagUpdateCoordinator、bindBagSession 已删除；不再保留背包查询、其他玩法回包写库存或无版本资产增量入口。暂停模块的 PausedFeatures 只明确报错，不执行请求回调，不提供假成功或第二条通信链；对应模块重做时删除其暂停边界。

## 代码阅读与注释约定

按 Protocol → AssetStateBinding → BagController.onNotify → onInventoryState → BagModel.replaceAll → BagEvent → BagView.refreshFromModel 阅读。账号协调在应用层，背包只接收已核验的状态。

本模块手写源码已补齐文件头、函数、类属性、数据字段和界面绑定的中文说明。修改时同时更新作用、取值、设置/清理时机；Prefab 绑定为空的行为按方法说明判断，不以注释代替校验。

- 服务端 Snapshot.revision 是持久资产版本；BagState.revision 是本地提交序号；BagItemView.revision 是异步贴图代次，三者不得混用。
- BagAdd 表示“新增库存种类”，不能代替旧 5002 的获得弹窗/文字提示；首次同步不播放奖励。
- 当前 itemId 是配置 ID；instanceId 与期限数据基础已补齐，逐件展示、倒计时和全部物品操作仍待还原。
- 已删除无人调用的 BagModel.beginSync/fail/applyDelta 和 BagItemDelta，以及无人使用的 query 原因、loading/error 状态与错误字段、BagView 未使用的 Controller 导入。断线提示继续归应用层。库存唯一更新入口为 replaceAll。事件 reason 的 reward/consume 仍被暂停模块签名引用，暂不跨模块删除。
- 详情当前只读，“确定”是关闭，来源/分解/使用尚未恢复；注释不能写成已实现操作。

## 游爱式背包流程与接入前提

参考 SGCtrl 的集中协议登记、onNotify 明确分发、onXxx 更新 Model、通知 View 的阅读路径；内容与规则仍以 mxzg 旧源码为准。独立新版以 Frame.name 字符串作为协议标识，Protocol 集中登记，不为相似外观维护另一套未使用数字号。

打开 BagController 即可看到三个实际协议：session.login、session.authenticate、state.changed。前两个从 body.initial.inventory 取首包，第三个从 body.inventory 取同步；全部走 onInventoryState，不通过 Promise 伪造背包协议。

## 固定通信与状态模板

### 1. 登录统一初始化

AccountApi → GameSocketClient.login/connect → 服务端会话验证与一致读 → 单条 Accepted.initial → AccountService.onInitialized → AssetStateBinding → 两个模块 onNotify → 唯一 Model → 事件 → View。

账号服务只管理凭证与登录；背包不 import 账号、不持有 token、不选择库存归属。服务端从有效会话决定角色；客户端检查归属是拒绝迟到旧数据，不能代替后端鉴权。

### 2. 数据变化由服务端同步

领域事务 → 钱包/库存持久写入 → AssetSyncService.changed（同事务版本）→ 提交成功 → GameSocketHandler.assetsChanged → state.changed → GameSocketClient.onState → AssetStateBinding.apply → RoleController/BagController.onNotify → Model → 事件。

先校验整包，再批量更新角色和库存，最后交付通知；非法库存不能先更新钱包。回滚不发事件，重复/较低持久版本不提交。完整状态代替当前无版本增量，不能从收到的消息盲目累加物品。

### 3. 断线、换号与页面生命周期

断线显示恢复提示并保留缓存；重连鉴权成功回包本身就是恢复数据，不发 session.sync/inventory.list。换号、切服、退出先使旧连接失效并清库存；旧连接回调受本地连接代次隔离。被顶号停止自动重连。

页面打开只订阅 BagEvent、读取 Model；切分类不联网。页面关闭解除自身事件与资源，不销毁模块；应用销毁才解除协议登记。静态布局保持在 Prefab，列表只向 SuperScroll 绑定数据。

### 4. 后续模块恢复前提

先核对旧源码/策划规则，再增加 .proto 与 Protocol，开发后端事务及持久幂等；前端明确 onNotify/onXxx、唯一 Model、事件及恢复快照。所有资产修改接入提交后同步，不能重新加入 HTTP、客户端发奖或本地库存写队列。获得弹窗/文字等提示依原 5002 类型恢复，不从 BagAdd 猜测业务原因。

### 5. 必须验证

真实 TS/Java 互通、一次登录首包、空背包、无重复查询；同步完整校验、原子通知、重复/乱序帧、重连、旧连接、顶号、换服；提交后推送与回滚无推送；HTTP 旧路由全部退役；数据库迁移和重启保留数据。当前测试结果与页面复验边界见[进度](development-progress.md)。

### 服务端下发数据怎样查看

Creator 控制台筛选 WS接收。日志显示协议含义、物品种类和 Item{itemId,quantity} 的实际结构，角色与库存同屏打印；默认过滤心跳并隐藏凭证，且有长度限制。日志失败不能影响协议处理。

## 在 Creator 修改 UI

页面：[client/assets/prefabs/ui/bag/BagView.prefab](../client/assets/prefabs/ui/bag/BagView.prefab)。列表节点路径不变：

- `BagView/spr_box/BagScroll`：SuperScroll，Content 只绑定一次。
- `BagView/spr_box/BagScroll/view`：UITransform/Mask，手动调整裁剪范围。
- `BagView/spr_box/BagScroll/view/content`：SuperContent，修改布局、列/行、方向、间距、四边距、Cell Prefab 与明确的尺寸覆盖开关。
- Cell：[BagItemView.prefab](../client/assets/prefabs/ui/bag/BagItemView.prefab)，组件现名 BagItemView；外观/数量字/选中图片在 Cell 内编辑。
- 详情：[BagInfoView.prefab](../client/assets/prefabs/ui/bag/BagInfoView.prefab)，组件 BagInfoView；页签：[BagTabView.prefab](../client/assets/prefabs/ui/bag/BagTabView.prefab)，组件 BagTabView。

[SuperScroll Inspector 指南](super-scroll-authoring.md) 的布局规则和无业务编辑器预览继续有效。本批没改源 Prefab、SuperScroll、SuperContent、资源路径与加载边界；10 个移动脚本 UUID 均逐一核对保留，BagView 仍是 `7b14e0a2-3c58-4d1f-8e6a-9f0b2c4d5e61`。Prefab 内稳定的 CompPrefabInfo.fileId 不是脚本路径，不因改名替换。目录实际名及导入统一为 `features/Bag`，旧 backpack 脚本目录已移除。

尺寸/位置仍由以下入口控制，不宣称整页静态 UI 已全部整改：SuperContent 算 content/Cell 根尺寸，原生 Layout 排动态 Cell，ScrollView 管滚动；BagView 仅提供条目/渲染回调，保留同分类滚动、分类回起点和缩短限制。空槽至少 20/按四补齐是背包规则。`BagMount.mountBagPage` 只装配共享壳与可见区域；PrefabLayout 不再补偿静态文字/九宫格位置。BagView 保留动态分类排列，BagMount.openBagInfo/seatCenter 只按宿主尺寸居中详情。

## 旧协议还原清单

依据旧工作目录 G:/work/FsGame/Demo/mj/program；以下为源码核查结果，尚未完成正式服画面验收。

| 原依据 | 当前差异与推进要求 |
|---|---|
| mxzg-protofiles/protofiles/game/BackPack.proto，ResBackPackItem | 旧 item_id 为数据 ID，item_type 为配置 ID，num 为数量；新版 Item.itemId 保持配置 ID，V7 新增字符串 instanceId，已补持久记录身份与无精度损失传输 |
| 同文件，5010 / ResTimeLimitItem | 独立期限列表包含数据 ID、类型和 end_time；本批已合入登录快照并由服务端读取时回收。逐件展示和权益撤销尚未实现 |
| client/cocos_mxzg/client/idle/src/data/BackpackData.lua，getItemsByPageSign 487–697 行 | 普通道具按 sort 降序，本次恢复；旧 Lua 同权重无次序，配置说明提及物品类型次序，最终需正式服对照。装备增加装备稀有度，碎片按合成条件与 sort，特殊页依实例数据，不能共用普通道具排序 |
| client/cocos_mxzg/client/idle/src/net/BackpackResponse.lua，backpackGain | 5002 同时包含增减与提示：0 静默、1 弹窗、2 文字；还排除英雄、符文、神装等由专用模块更新的数据。当前 state.changed 只有快照，不含演出原因；需另加明确提示载荷和重复消息处理，不能从差值猜演出 |
| server/mxzg-server/mxzg-gameserver/src/main/java/com/ayjs/mxzg/gameserver/module/backpack/observer/ThingObserver.java | 获得事件按业务 NoticeType 发 5002，消耗使用静默负数；当前事务后同步保留资产权威，后续提示应与同一次已提交事务关联 |
| BackPack.proto 5004/5005/5006/5007/5008/5009 | 装备合成、一键合成、开箱、普通/精英英雄碎片、自选礼包；逐项查配置和服务端条件再恢复，不能创建通用“使用成功”接口替代 |
| BackPack.proto 5011/5012/5013/5014 | 道具分解、充值卡、宠物碎片、装备合成日志；目前均未恢复。依赖英雄/宠物的操作在相关模块暂停期间不得开放 |
| mxzg-protofiles/protofiles/game/Role.proto，GResRoleInfo 2001 | 当前仅基础身份、等级、金币与宝石；经验/英雄经验、精力、头像/形象/边框、VIP、创号及服务器时间、军团/引导、虹石/神权等仍有缺口。逐字段核对持久来源，不以固定默认值伪装已还原 |

身份字段映射与期限物品存储基础现已补齐；下一步接入期限配置、逐件格子与倒计时，再选择无英雄依赖的背包操作核对完整事务规则。此清单只记录已见源码和缺口，不表示全部旧背包功能已审完。

## 清理边界与类型检查

保留 Controller 协议登记、Model 全量校验/差异、BagEvent 与 View 监听；它们形成实际更新链，不因 IDE 看不到直接调用就删除。保留 Prefab 序列化属性及 meta，不能只按 TypeScript 引用删除。当前只读详情、配置投影、挂载适配和 SuperScroll 都在使用。

client/tsconfig.json 显式声明 ES2017、DOM，并仅纳入 assets 游戏源码；tools 测试按独立检查入口运行。保留 Creator 生成的 ES2015 target，不编辑 temp/tsconfig.cocos.json。skipLibCheck 仅跳过依赖声明文件内部检查，游戏源码仍检查；独立 strict 检查继续执行。

Object.entries 属于 ES2017 API；lib 只声明可用 API，不注入 polyfill，也不决定 Creator 最终构建。若发布目标缺该 API，应改用 Object.keys 加索引读取或按实测补兼容层，不能只提高 lib 掩盖运行时报错。低端机性能与 JS 引擎版本不是同一概念，发布前需目标平台验证。

## 配置 ID、记录 ID 与期限基础（2026-11-03）

旧 BackPackHandler._5001 将 BackPack.id 写入 item_id，将 BackPack.itemId 写入 item_type；ItemProcessor 按配置 ID 查找并叠加 num。所以普通库存也有记录 ID，但不是每一件堆叠道具一个 ID。新版 Item.itemId 保留已发布的配置 ID 含义，新增 instanceId 表示库存记录身份；不能重用 Protobuf 字段号。ID 用字符串传输，禁止 Number(instanceId)。

V7 给普通库存添加稳定记录 ID，不改变原数量；迁移旧记录使用 stack:角色ID:配置ID，新建记录使用 UUID。game_timed_inventory 则每件一条，保存 instance_id、role_id、item_id、effect_type、active_at_seconds、expires_at_seconds，同配置也不合并。

旧 TimeLimitItemProcessor 使用 TimeLimitItem 配置的 valid_time（天），不是 Item.use_value，也不是获得后完整 N×24 小时。公式为服务器激活当天零点 + valid_time×86400 − 1，所有协议时间为 Unix 秒；DateTimeUtil.theDayBreak 使用旧 JVM 默认时区，源码本身不足以证明正式服的实际时区。用户已确认新版所有区服统一 Asia/Shanghai 日切；服务端固定使用该时区，不依赖 JVM 默认值。真实业务发放尚未开放。

旧 LimitItemInfoService.selectList 在发送 5010 前删除 endTime<=当前秒的记录；客户端也只显示 end_time>服务器时间的条目。新版统一初始化/恢复及资产快照在角色锁事务内回收已过期记录，同事务更新持久版本，提交后同步；没有新增 5010 查询或业务 HTTP。尚未加入在线定时扫描，且期限权益的到期撤销事件、配置加载/业务发放、倒计时和逐件格子仍未接入，不能视为完整期限玩法。

Snapshot 新增 timedInventory{items,serverTimeSeconds}；BagModel 将 timedItems 与普通 items 分开保存，整包预校验后一起提交。当前期限数据只进入 Model，不混入普通按配置聚合的 UI。普通完整快照的 instanceId、期限载荷为增量可选字段，旧数据缺字段仍可读；实际新后端始终下发记录 ID。

### 期限展示边界

期限规则使用 GConfig.TimeLimitItem 与服务端打包的同源 timelimititem.json；不可从客户端传入天数或自行计算权威到期时间。BagModel 保存逐件期限快照与服务器秒，BagItemCatalog 只生成列表投影；期限格子和详情必须按字符串 instanceId 区分，同配置不能合并。到期由 View 隐藏、关闭详情，禁止删除 Model 或调用额外库存查询。使用、分解及权益相关操作当前未开放。展示时钟与后台恢复边界见 development-progress.md 的期限配置批次。

### 后台恢复与同版本首包

应用层负责 Game.EVENT_HIDE/SHOW：隐藏时停止通信重试并使背包时钟失效，显示后通过 session.authenticate 恢复。鉴权首包同资产版本也须校准服务器时刻；普通重复推送和低版本不得覆盖现有资产。后台退出后禁止自动恢复旧账号，禁止为校时添加库存查询或让背包控制器持有凭证。服务端接管锁最多等待两秒，超时返回 BUSY，客户端只重试鉴权，不重放资产操作。
