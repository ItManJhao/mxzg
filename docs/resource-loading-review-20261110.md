# 资源加载与页面登记检查

日期：2026-11-10。负责人要求暂停挂机收益推进，本批只检查源码和资源目录，不改运行逻辑、不操作Creator、不提交推送。没有运行浏览器性能采样或正式构建；以下不把源码推断写成实测耗时/请求数。

## 暂停点

已推送基线3dbb33f7。未提交的IdleBonusUtils及10项测试已完成，连同原随机10项共20项通过（前一批结果）；权威输入、领取协议/事务均未接入。当前暂停后续加成/权益开发，领取入口仍关闭。

本次开始另发现资源框架5个本地修改：CompatibleSpine.ts、PrefabLoader.ts、ResourceAssets.ts、ResourcePool.ts、SpineJson.ts。按磁盘现状阅读，全部保留，不认定是本次修复或完成验证；后续改动前先核对这些差异。

## 1. 预加载有基础，但多数发生在点击后

| 入口 | 当前实现 | 对体验的影响 |
|---|---|---|
| ApplicationResources.prepareStartup / StartupResources | 启动并行加载登录骨骼、加载条、登录背景、音乐4个资源键，另有启动配置准备 | 有真实启动预热；不包含背包/英雄/主线首屏所需的完整资源 |
| ApplicationResources.homePage / HomeResources | 取主城时准备配置并加载，应用作用域持有 | 属于主城入口准备，不证明登录期间已完成后台预热 |
| featurePage / FeatureResources.loadFeaturePage | 实际调用时先准备配置，再Promise.all加载整组Prefab；背包组包含详情和遮罩 | 用户点击之后才付出整组成本，非首屏依赖也可能挡住首次打开 |
| heroPage / HeroResources | 首进英雄准备名册配置及列表/Cell/壳；详情另外加载 | 分模块按需加载有边界，但没有形成登录后预测下一页面的后台任务 |
| MainChapterView登记 | 点击主线先prepareInventoryConfig，再直接loadPrefab | 未走ApplicationResources中的campaign组；该组仍登记旧CampaignView，不是新主线预热依据 |
| ChapterRewardInfoView | 开窗后隐藏面板，等待配置及BagInfoView/DimSheet准备再finishOpen | 主体确实等待；只读详情资源也处于首屏完成路径 |
| UIManager | 先await加载Prefab，再实例化、runOpen、等待whenReady | 保证就绪与失败语义，但冷资源就会拉长打开路径；不能简单删除await来消除等待 |

当前资源池会合并在途请求、按拥有者持有/释放；磁盘版本PrefabLoader还显式缓存已加载Prefab直到应用关闭。这些是复用/缓存，不等于在点击前预加载。页面cache:false也不能直接解读为“每次重新下载”：页面实例缓存和资源缓存是两层。

结论：不是完全没有策略，而是启动小范围预热＋首次进入按需加载＋缓存复用，缺少完整的分阶段、分优先级、首屏关键资源预热。未发现应用统一的闲时队列、加载预算及按下一步操作提前准备的调用链。具体耗时仍需实测拆分下载、解析、实例化、配置和首帧。

## 2. 普通UI/图标目前主要是散图

目录核对：client/assets/resources/ui下12757张PNG；client/assets无.pac；ResourceCatalog实际SpriteAtlas描述条目为0。全assets有464份.atlas，属于Spine骨骼贴图，不等于普通UI图标已合图。粒子waft.plist也不是图标图集。

- IconCatalog将配置ID映射到具体SpriteFrame描述；如hero-icon_xxx/spriteFrame。ResourceCatalog登记bundle/path/loadPath/type/uuid，并不加载资源。
- ResourceAssets按描述调用bundle.load；当前图标映射直接使用单图SpriteFrame路径。tools/generate_resources.cjs虽能识别sprite-atlas导入器，但当前生成结果并没有实际图集项；图标生成部分仍从单独PNG找资源。
- 图集中的每个SpriteFrame也需要名字/ID索引，因此“Catalog逐项登记”本身不是问题。问题是当前条目背后的纹理组织及加载计划仍以散图为主，不能仅把Catalog名称改掉解决。
- 未构建并检查产物，不能仅凭散图源文件断言“一张PNG必然一个网络请求/一个Draw Call”，也不能声称引擎动态合图关闭。源码未发现显式动态合图策略；即便运行时动态合图有效，也不等于首开下载/解析预热已完成。

建议按共同显示及生命周期划分：通用控件、背包图标、英雄头像、战斗统计等小型图集；大背景和Spine独立。先做一个有代表性的页面试点，核对SpriteFrame UUID/绑定、采样/透明边缘、图集加载释放及构建产物，再扩大；不把上万张图片打成一张大图或全量常驻。生成输入/工具必须同步调整，不能手改生成Catalog。

## 3. ApplicationPages职责已经偏多

“页面ID、View类、Prefab、层级”的对应关系本来就需要登记，因此同时出现页面与Prefab并非错误。目前额外混入了：

- 登录与主城Controller构造、账号/选服回调和路由更新；
- GM入口、登出、提示及页面业务回调；
- 配置准备、资源组合加载与不同mount适配；
- 静态登记与动态宿主绑定，字符串路径与ResourceCatalog混用。

维护者需要在一份register方法中理解资源准备、页面身份、业务装配和生命周期，阅读负担确实偏大。新增BattleDetailLayer/ChapterRewardInfoView用字符串路径，其他页面用Catalog；主线直接loadPrefab，又留着未使用的新主线之外的campaign资源组，入口不一致。

建议将三件事明确分开：页面登记只说明“谁/哪个Prefab/哪层/哪个宿主”；资源准备清单负责“打开前需要什么”；账号等业务装配保留在其模块入口。应用只调用各模块明确的登记/装配入口，不再不断扩充大register方法。无需为此重拆RemakeApp、制造通用Manager或批量改名；先从一个已接通模块验证阅读路径和取消清理。

## 建议处理顺序（尚未实施）

1. 先确认5个本地资源框架修改的意图与当前行为；对登录→主城→背包/英雄/主线采样首次与再次打开，拆出资源、配置、实例化及首帧时间。
2. 梳理首屏必需与后续操作资源；登录/主城后有预算地预热常用首屏，详情延后，失败按原入口重试。保留关闭取消、迟到响应和资源引用计数。
3. 对高频小图做单模块图集试点，联合检查编辑器预览与正式构建，比较请求、纹理内存、Draw Call和打开耗时；不预设合图一定解决全部卡顿。
4. 同一模块整理页面登记/资源清单/业务装配边界，清理实际失效引用；再分批推广。不能把本检查直接标为框架优化已完成。

后续需负责人确定优先方向；当前仅保存检查结果，暂停挂机收益开发。玩法范围、服务端权威、WS＋Protobuf与清心/护盾待审均不变。
