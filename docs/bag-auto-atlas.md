# 背包自动图集：人工维护步骤

当前背包界面采用 Creator 自动图集。预览直接使用原图，构建时自动合图；不再执行外部打包命令。

## 日常修改

1. 在 Creator 的 `assets/ui/bag/atlas` 目录中放入背包专用界面小图。
2. 将对应图片的 SpriteFrame 拖到预制体 Sprite 或脚本图片属性上，保存预制体。
3. 运行预览检查界面。新增静态绑定图片不用登记第二份资源清单，也不用修改逐图加载数组。
4. 修改图片后正常构建。Creator 根据同目录的 `BagAtlas.pac` 自动合图；检查构建结果及实际包画面。

选中 `BagAtlas.pac` 可在属性检查器调整图集参数，并预览合图结果。此预览只展示合图方案，游戏预览仍使用散图。保留图片与 pac 的 meta；改名、移动或删除已用图片前检查预制体和动态路径引用。

## 资源归属与加载

- `assets/ui/bag/atlas`：当前背包专用选中框、详情分隔线；后续同类小图可继续放入。
- `assets/ui/common/atlas`：7张公共静态图片及CommonAtlas.pac，依靠Prefab绑定加载；18:28新构建已确认共用252×281纹理。
- `assets/resources/ui/common`：动态页签、品质框、占位图及登录依赖仍保留原路径。
- `assets/resources/icons/item`：物品图标，保持独立、根据实际库存加载，不混入界面图集。
- `assets/resources/ui/bag` 其余旧资源：尚未逐项整理，不因本批切换自动图集而扩大合图范围。

BagDefinition 已移除；页面地址只在各View的@view注册中定义，店员骨骼名由BagView共用。三段加载继续准备两个窗口的预制体，Creator 负责加载其图片依赖；动态图标由格子按库存展示需求加载，不纳入页面准备。代码不加载 pac，也不按自动生成的图集文件名取帧。

## 验证与边界

`node client/tools/check-project.mjs --suite ui-atlas` 检查原图、UUID 和绑定；不能替代实际构建验收。当前原图校验基线用于保护本次迁移，以后主动替换图片时同步审核更新。

本次保留 Creator 生成的自动图集默认配置，包括未使用资源剔除和 Bundle 内原纹理/图片剔除。构建后需核查实际产物，不能只凭勾选项宣称包体已缩小或绘制调用已减少。

本批没有恢复任何玩法，没有实施公共图集或微信分包。此前实体图集的浏览器证据是历史记录，不能作为自动图集构建验收结果。

机制参考：[Creator 3.8 自动图集说明](https://docs.cocos.com/creator/3.8/manual/zh/asset/auto-atlas.html)。

## 原图副本排查（2026-11-10）

已确认原剔除选项全部开启，源码只有两处 SpriteFrame 预制体引用，没有直接 Texture2D/ImageAsset 引用。原构建在 resources 中仍输出图集和两张原始 PNG。Cocos 3.8.8 的公开问题 [19184](https://github.com/cocos/cocos-engine/issues/19184) 有相似报告，目前尚未结案，不能据此断言本项目根因已被引擎确认。

本批将两张静态界面图和 pac 一起迁至普通目录 assets/ui/bag/atlas，保留图片、帧、目录及 pac UUID。它们由预制体绑定加载，不需要 resources 动态路径。没有修改全局 Bundle 配置。重建证实单纯迁移仍保留副本，因此采用下述限定范围的构建后清理。

重建后执行：node client/tools/ui-atlas-check.cjs --build-output client/build/bag-atlas-review。此检查只确认原图副本是否消失；还需验证预制体可加载且共享图集纹理。

## 构建完成后自动去重

项目扩展位于 client/extensions/mxzg-bag-build，仅注册 Web 手机端和 Web 桌面端的 onAfterBuild。读取 Creator 本次输出目录，不依赖 bag-atlas-review 任务名称；只允许 client/build 内的独立构建目录。当前已核实格式要求关闭调试模式和 MD5 缓存，其他格式不猜测删除，校验失败会让构建明确失败。

首次接入：在 Creator“扩展 → 扩展管理器”的项目扩展中确认“UI图集构建去重 / mxzg-bag-build”已启用；列表未更新时重启项目。之后照常点击构建，无需每次手动运行命令。在构建任务的日志中查找（主控制台可能不显示），应出现“[UI图集构建去重] 完成”，附清理文件数、字节数及备份路径。仅刷新 assets 不能证明项目扩展已加载。

手动排查入口仍保留：npm --prefix client run build:dedupe-bag 默认处理 client/build/bag-atlas-review；其他输出目录使用 node client/tools/dedupe-bag-build.cjs client/build/目录名 --apply。去掉 --apply 只检查。手动命令和 Creator 调用同一实现。

工具范围由config/ui-atlas-dedupe.json唯一登记：背包2张、common7张。先检查全部跨包帧及重定向指向同一实际图集、原图/原纹理没有动态路径、所有import（含Texture2D对象的嵌套数据）没有原图引用、文件内容与原图一致。全部通过后备份到client/temp/bag-build-dedupe，再清理native PNG；不改源码或构建索引。重复运行不重复删除。任何检查失败就停止，不可绕过检查手工删图。

本次移除5974字节，禁用浏览器缓存后登录页和三个背包预制体加载通过，两帧仍共享图集。原 ImageAsset 的无使用者登记仍保留，不支持绕开预制体按原图片 UUID 加载。以后增加动态原图需求时应停止清理并重新评审。

自动钩子代码与隔离回归已通过；2026-11-10 17:50:18 的 Creator 实际构建已自动备份并清理2张5974字节，产物静态检查通过。新构建包已完成禁用缓存后的登录页启动及三个背包预制体加载，两张小图共享126×474图集、背景640×960独立加载，无失败资源请求；18:20修复后的发布包已通过独立实例登录、四分类详情、返回重开；库存与版本不变，打开背包后新增资源请求0，无警告错误。运行 node client/tools/bag-build-hook-check.cjs 可复验备份、幂等和拒绝边界。此前手动清理证据见 [去重验证](validation/bag-atlas-dedupe-20261110.json)，本批见 [自动钩子验证](validation/bag-build-hook-20261110.json)。

## 当前背包资源完整清单

四个当前预制体共直接绑定18张图片：14张共用界面图、1张物品内容图、2张背包专用小图、1张背包专用大背景。具体图片及跨模块引用见 [背包资源归属清单](bag-resource-inventory.md)。大背景归 assets/ui/bag/background，保持独立纹理；不因模块归属而强行合进小图图集。

## 改图时需要修改哪些文件

| 操作 | 人工步骤 |
|---|---|
| 替换现有图片内容 | 保留文件名与meta，在Creator刷新后预览、构建验证。两张去重原图若内容变化，同步复核ui-atlas检查中的迁移基线。 |
| 新增背包专用小图 | 放入assets/ui/bag/atlas，绑定到对应Prefab。无需逐张添加地址或逐图加载数组。去重工具只处理明确名单，不会自动删除新图副本。 |
| 新增大背景 | 放入assets/ui/bag/background并绑定Prefab，不放入小图图集。 |
| 新增物品图标 | 放入assets/resources/icons/item，按现有物品配置及命名约定关联，再运行node tools/generate_resources.cjs生成索引；不手改IconCatalog。 |
| 调整预加载时机 | 修改client/assets/scripts/app/remake/LoadingPlan.ts，直接指定第一、二阶段资源；第三段也明确配置，未配置的资源按需加载，无模块清单。 |
| 构建结果排查 | 在构建任务日志查“UI图集构建去重”，从输出的备份目录查看manifest.json；不要只看编辑器主控制台。 |

ResourceCatalog是生成的动态资源路径索引，不是图集或包体清单；Prefab直接绑定的每张静态图不需要人工抄入索引。生成输入位于config/resource-catalog.json，只有新增动态加载需求时才检查是否需要调整它。

## 发布包的独立环境验收

本机发布包已接入与预览共用的隔离入口（需重新构建后生效）。仅允许http://localhost:7456或http://127.0.0.1:7456托管的/web-mobile/任务名/index.html、/web-desktop/任务名/index.html。任务名限英文字母、数字、下划线及短横线。无测试参数时不改变正常连接。

验收人员先启动SocketPreviewServer --bag-loading-fixture（测试类路径、随机回环端口、随机H2内存库），读取client/temp/socket-preview.json，向构建URL附加mxzgTestApi及mxzgTestRun。客户端先核对测试实例身份，再用独立存储前缀登录loading_review；数据和凭证不进入日常会话。只允许随机本机后端，拒绝18080/18081/3306，身份不符或服务失败均停止，不回退。身份探针不是游戏业务接口，资产仍由真实WS＋Protobuf回包更新。

运行node client/tools/check-project.mjs --suite isolated-build检查预览/发布两种编译模式；完整验收需检查登录两段进度、四分类、详情、返回重开和库存不变。不要修改发布产物中的服务器字符串来绕过隔离校验。

## 公共静态图集首批迁移

7张图片已归assets/ui/common/atlas，原图片和meta字节均保留，不修改Prefab布局或UUID。CommonAtlas禁用旋转，保留原九宫格数据。新增检查：node client/tools/check-project.mjs --suite common-atlas。源码与绑定检查通过，18:28实际构建和浏览器确认7张共用252×281图集；背包四类详情、返回和英雄空列表正常，英雄详情/战斗预制体加载正常。7张common原图副本已通过统一工具备份清理29507字节，清理后的冷加载四分类详情/返回重开及跨页预制体加载通过；英雄详情/战斗完整交互不属于本轮已验项目。钩子已扩展到上述common7张，仍沿用mxzg-bag-build扩展ID与build:dedupe-bag命令，避免重建另一条清理链。完整新包预计清理9张35481字节；18:47 Creator实际构建已自动执行9张35481字节清理，备份摘要和产物引用检查通过。

修改去重名单或工具后，先运行node client/tools/bag-build-hook-check.cjs，再重载Creator项目扩展并构建。普通改图不需要每次重载扩展。构建结果可执行node client/tools/common-atlas-check.cjs --build-output client/build/bag-atlas-review复核，仍需实际画面检查。记录见[common去重验证](validation/common-dedupe-20261110.json)。

### 扩展版本识别

扩展标识继续保留mxzg-bag-build，管理器显示此名称不代表仍是旧逻辑。当前版本为1.3.0：保留背包2张及common7张去重，已移除全目录资源索引检查。重载后日志前缀为[UI图集构建去重 v1.3.0]。三个加载阶段只在LoadingPlan配置。

2026-11-10 18:47自动构建已确认执行9张新版规则。该次日志仍为[UI图集构建去重]，未含后来补的v1.1.0字样；以实际分组、数量、备份与产物检查确认功能，不要求仅为日志字样重复构建。
