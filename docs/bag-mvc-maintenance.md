# 背包标准模块：维护与验收入口

当前资源目录以[Bundle维护说明](staged-resource-loading.md)为准（2026-11-11）：顶层ui/resources/prefabs已整合，共用格子归common；1.6.2构建钩子不删除具有Bundle路径的原图。

更新：2026-11-11。当前采用登录统一初始化与服务端资产同步，保留现有 Prefab、只读详情、SuperScroll 和唯一 BagModel。其他玩法暂停；旧查询模板已经退役。

图片放置、自动图集及构建日志操作见[背包自动图集](bag-auto-atlas.md)，具体归属见[资源清单](bag-resource-inventory.md)。

## 页面和资源：人工修改入口

页面地址、页面属性及prepare配置前置在BagView/BagInfoView各自@view定义，UIManager实际打开时执行前置并通过统一加载器取得Prefab，不在ApplicationPages再登记地址或注入资源包装。LoadingPlan仅决定提前准备哪些资源；预载Prefab不执行prepare，不创建页面。BagDefinition、BagPagesUtils、BagResourcesUtils均已移除。

| 修改内容 | 人工入口 |
|---|---|
| 背包结构、背景和列表绑定 | assets/bundles/module/bag/prefabs/BagView.prefab |
| 共用物品格子与选中样式 | assets/bundles/module/common/prefabs/BagItemView.prefab、common/item-atlas |
| 页签 | assets/bundles/module/bag/prefabs/BagTabView.prefab |
| 独立详情面板与内容阻挡 | 同目录BagInfoView.prefab；共享模态参数在BagInfoView的@view |
| 店员外观 | BagView.shopkeeperSkeleton |
| 物品到图标/品质的显示规则 | features/bag/utils/BagItemCatalog.ts |
| 第一、二阶段准备什么 | app/remake/LoadingPlan.ts：页面写{page:BagView}等类引用，其他资源/配置显式列目标 |
| 新增资源纳入后台 | 在LoadingPlan.background中列目标，不维护模块清单 |

打开BagView只取得自身预制体及必要配置，直接绑定依赖随引擎加载。BagInfoView是独立窗口，默认在LoadingPlan.background准备，也可以在LoadingPlan中明确提前加载。动态显示继续使用原节点作用域和迟到回调保护；后台与前台共享缓存。详细策略见[分阶段加载](staged-resource-loading.md)。

统一取图入口为ResManager.getSpriteFrame(owner, source)：source可传包名/包内图片路径（不带/spriteFrame）或完整资源描述，owner决定引用生命周期。已加载直接复用，在途请求合并，失败交给显示层处理。ResManager只负责赋图、回退和刷新代次，不再自建图片作用域。直接使用此Promise时，调用方同样需要检查当前显示代次；背包已通过ResManager统一处理。

物品配置→图片地址由BagItemCatalog.iconSource(row)处理：遵循item.icon共图声明，支持backpack/和hero-icon/，无显式图标时沿用原ID规则。ResManager仅提供目录规则，不维护逐ID映射或缺图例外；按命名规则补图后无需更新可用清单，实际加载失败由ResManager记录路径和原因。品质框通过ResManager.qualityFrame(quality)取得，取消七项重复数组。英雄、技能和历史头像同样通过ResManager路径规则取图。

库存详情调用 `UIManager.instance.open(BagInfoView, { source: "inventory", key: item.key, tab })`；窗口自己读取 Model 并监听数量变化、删除和到期。结算/产物说明调用同一窗口的 description 参数，保留“本次获得”或“产物说明（只读）”，不冒充库存。父页面关闭通过 UIManager 关闭详情，也取消尚未完成的打开。

## 固定目录与文件职责

- features/bag/BagController.ts：声明协议，onNotify → onInventoryState → Model → BagEvent。
- features/bag/BagModel.ts：唯一库存状态、全量校验与界面 revision，不联网。
- features/bag/utils/BagEvent.ts、data/：界面事件、状态、变更集和物品类型。
- features/bag/ui/：BagView、BagItemView、BagInfoView、BagTabView 和页面登记；BagMount 已退役。
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

页面：[client/assets/bundles/module/bag/prefabs/BagView.prefab](../client/assets/bundles/module/bag/prefabs/BagView.prefab)。列表在完整页面的Content内：

- `BagView/Content/spr_box/BagScroll`：SuperScroll，Content只绑定一次。
- `BagView/Content/spr_box/BagScroll/view`：UITransform/Mask，手动调整裁剪范围。
- `BagView/Content/spr_box/BagScroll/view/content`：SuperContent，修改布局、列/行、方向、间距、四边距、Cell Prefab与明确的尺寸覆盖开关。
- Cell：[BagItemView.prefab](../client/assets/bundles/module/common/prefabs/BagItemView.prefab)，组件现名 BagItemView；外观/数量字/选中图片在 Cell 内编辑。
- 详情：[BagInfoView.prefab](../client/assets/bundles/module/bag/prefabs/BagInfoView.prefab)，组件 BagInfoView；页签：[BagTabView.prefab](../client/assets/bundles/module/bag/prefabs/BagTabView.prefab)，组件 BagTabView。

[SuperScroll Inspector 指南](super-scroll-authoring.md)的布局规则和无业务编辑器预览继续有效。当前脚本目录为features/bag，资源目录为bundles/module/bag/prefabs；共用格子归bundles/module/common/prefabs。BagView当前meta UUID为6bfdfd78-65e9-403c-b7c8-7e6cd94ffebb。Prefab内的CompPrefabInfo.fileId不是脚本路径，不因改目录替换；迁移保留UUID的证据见Bundle维护说明。

SuperContent默认启用虚拟化、bufferLines=1，按完整库存投影计算content逻辑尺寸，只给视口和缓冲行分配有限Cell；ScrollView仍管理滚动、惯性与回弹。BagView监听RENDER_ITEM/SELECT_ITEM，onRender调用BagItemView.show只绘制，onSelect处理选中与独立详情，Cell不再保存页面回调。分类回起点、同分类保位及至少20槽/按四补齐仍是背包规则，虚拟池不修改库存。

BagInfoView作为独立BaseView打开，Prefab只保留面板与实际内容背景的BlockInputEvents；共享模态在@view配置，UIManager只用一份节点。BagView布局归Widget与ViewportScale，外根fitVisibleRoot只桥接视口；列表view/content局部缩放须1，原Cell锚点与正缩放保留。refresh(index)只立即刷新可见条目，离屏条目进入视口时再画。本批51项、类型与四分类/独立详情/重开库存保持已通过，见[限定复验](validation/virtual-list-resource-review-20261111.json)；20逻辑格少于可见容量，实际20节点，长列表上限另有千/万条夹具及850关配置覆盖，不冒充大库存实测。

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


## 2026-11-04 统一隔离边界

背包不发送查询，BagController原本就没有异步换号保护；本批移除BagView的lastRoleKey及换号分支。身份改变时由AssetStateBinding调用应用关闭背包/布阵，再通知模块清空业务数据。BagModel的roleKey仅描述数据归属，“初始化前不接收库存”的检查仍是提交前置条件，不是旧回包隔离。

通信层拒绝旧连接消息；应用统一校验身份、资产版本及整包内容后才调用onNotify。布阵写操作同样由应用的AccountService.deliverAuthenticated交付结果，模块不判断账号。BaseController不再维护captureSession/isCurrent或会话代次。业务回执匹配、幂等重试与页面自身关闭清理继续保留。


## 背包自动图集维护入口

背包详情分隔线放在client/assets/bundles/module/bag/atlas；共用格子选中图在common/item-atlas，共用静态图在common/atlas。原图直接绑定Prefab，由同目录pac在构建时自动合图。页面注册不登记逐图清单；物品图标位于icons/item，动态共用图位于common/ui。完整步骤见[背包自动图集](bag-auto-atlas.md)。


### 图片入口合并（2026-11-11）

人工入口为client/assets/scripts/framework/assets/ResManager.ts。它是手写的路径与显示逻辑，不再由生成器生成整份图标索引；物品目录规则直接保存在ResManager。旧IconCatalog和SpritePaint文件已删除，无兼容转发。底层ResourceAssets/ResourcePool继续管理作用域、缓存和请求。

```ts
ResManager.setSprite(iconNode, ResManager.skill(skillId));
ResManager.setSprite(faceNode, [ResManager.head(headId) || defaultPath, defaultPath]);
const frame = await ResManager.getSpriteFrame(ownerNode, imagePath);
ResManager.setSprite(iconNode, null); // 清空并阻止旧请求再次赋图
```

setSprite支持单路径/描述或有序候选，第三参数可传页面有效性判断；每个图片节点只持有当前显示与本次在途候选，旧图受保护至新图接替，同图和相同在途请求复用，不累积滚动过的历史图片。null/失效/销毁清理赋图拥有者；getSpriteFrame(owner)显式节点持有语义不变。缺图仍按路径记录并回退；TTL、UIManager实例缓存、PrefabLoader及三段配置均未改变，参数及实测边界见[Bundle维护](staged-resource-loading.md)。
