# 重做版配置分组与加载约定

更新：2026-10-29。对应 P2-05，目前覆盖加载提示、已有主城，以及已接入只读英雄列表的最小配置组。

## 维护入口

- config/GroupedConfig.ts：请求去重、缓存、整组校验与原子提交，不依赖引擎。
- config/RemakeConfig.ts：配置组、根结构校验与主城开放条件快照。
- RemakeApp：调用 prepareStartupConfig，加载提示读取同一缓存。
- HomeResources：点击开始成功后先准备主城配置，再请求主城 Bundle；失败进入已有加载重试流程。
- RemakeHomeView：为 CityHubView 注入配置读取器与开放条件快照，不复制第二套地图布局代码。
- HeroResources：点击主城底栏英雄后先准备 hero 组，再加载原列表/格子/页面壳；失败保留主城，可再次点击英雄重试。

## 当前依赖

登录前 startup 组只有两张表：

- config/language：启动文案与加载提示索引。
- config/loadingtips：加载提示条目。

请求主城入口时准备 city 组：

- config/opencondition：等级与功能开放条件。
- config/system_gate：系统开放条件。
- config/maincity/maincitypos：地图层与建筑位置。
- config/maincity/createmaincitybtn：建筑按钮布局。
- config/maincity/maincityeffect：地图表现特效位置。

未知开服天数仍用保守输入，不编造第 1 天。尚未接入的功能点击继续提示未开放；读取开放条件不等于玩法已接入新后端。

英雄列表使用独立的 hero 组，由 HeroResources 按需调用 `prepareHeroConfig`，不在登录或进城时调用：

- config/herotype：模板 ID、简体名称（note）、元素与 item_id 图标索引。
- config/item：当 herotype.item_id 为 0 时，按 item.idx=模板 ID 查 hero-icon 路径。

features/hero/HeroCatalog 只投影列表实际需要的字段，不调用 bindGameCatalog，不覆盖旧全局目录。角色实际等级和星级来自服务端，不用模板星级替代。未知模板返回 null，由页面显示配置缺失态；不能生成一个已拥有英雄。技能、品质、职业、立绘与养成配置仍需分别登记。

## 与旧全量加载分离

旧 ConfigLoader.loadAll、ConfigDb.current、bindConfigTables 保持原行为，legacy/Boot 仍走旧全量流程。GroupedConfig 不把局部数据写入旧 ConfigDb，也不调用旧战斗/英雄目录的全量绑定。

添加英雄和战斗前，必须登记各自的依赖与目录投影，不能让旧业务把局部表当成完整配置。CityHubView.loadConfig 和 loadBootCopy 的读取器均可选注入，旧调用方保持缺省读取方式。

## 失败与生命周期

- 同路径并发共享请求；语言与提示再次使用时不重复请求 JSON。
- 全组成功并通过形状校验后才对页面可读；失败不发布该组的半套结果。
- 已成功的请求可供重试复用，失败请求允许重试；不清空其他已就绪组。
- 失败后忽略迟到进度。页面在配置等待期间关闭，不再实例化主城子界面。
- 缓存保留到模块生命周期结束，尚无配置版本切换和主动淘汰。
- 校验覆盖当前消费者的根结构（rows/main/maincityeffect 数组、act 对象），不代表全部策划数值和业务规则已验证。

## 证据与限制

旧 manifest 为 536 张表，源 JSON 合计 38,034,698 字节。重做版登录前显式读取两张，共 1,599,539 源字节；city 组另读五份，共 57,398 源字节。三份 maincity 文件原本就在根 manifest 之外，536 和 7 不应理解为同一个文件集合。

这是读取依赖和源文件统计，不等于实际网络量、包体或内存。JSON 仍在 resources，构建导出体积需单独验证。

运行 `node client/tools/check-project.mjs --suite config-groups`，覆盖真实九份文件（2+5+2）、原子提交、坏结构/加载失败重试、并发去重、迟到进度、提示缓存复用、英雄配置不提前加载与旧 ConfigDb 隔离。hero-roster 验证实际英雄名称/图标投影、无效元素和图标回退。home-bundle 验证必要配置失败时不请求主城包；home-presentation 验证配置等待期间关闭。

Creator 实际首屏、加载动画、地图布局与业务数值仍待预览/运行验收。新功能加入时同步更新本文件与 RemakeConfig。
