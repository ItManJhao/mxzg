# 资源登记、审计与首个按需 Bundle

更新：2026-10-29。对应路线图 P2-01–P2-04；实现仍处于源码与自动检查阶段，Creator 实际导入/构建/运行验收待完成。

## 维护入口

- `client/assets/scripts/framework/assets/ResourcePool.ts`：纯加载/持有模型，不依赖引擎或业务页面。
- `client/assets/scripts/app/remake/StartupResources.ts`：四项启动资源的 ID、路径、类型与 Cocos 适配。
- `client/assets/scripts/app/remake/HomeResources.ts`：主城 Bundle、共享依赖加载顺序与 Prefab 入口。
- `client/assets/bundles/remake-home/RemakeHome.prefab`：可编辑的主城组合 Prefab，UUID 仍为 bd1203e8-e72a-5d44-bc5c-ab68a868898a。
- 原 `prefabs/ui/city/CityHub.prefab` 和 `CityChrome.prefab` 保留为唯一的地图/顶底栏布局来源。
- `tools/resource_audit.py`：只读源资源依赖与重复内容审计；不自动删文件。

## 当前加载顺序

Remake.scene 只显式引用登录和 LoadingLayer，不再引用主城 Prefab。启动资源、配置和登录页准备好后停留登录；点击开始且身份校验成功后，UIManager 请求 HomeResources，加载主城 Bundle 的 RemakeHome，再等待地图/HUD 就绪，最后淡出加载层。

HomeResources 先确保 resources 与 prefabs 的依赖元数据可用，再加载 remake-home。调用 loadBundle 不等于下载该 Bundle 的全部纹理；真正依赖与传输还需构建/Network 证据。

Bundle 配置为 resources=8、prefabs=1、remake-home=0。共享资源优先级高于功能入口，避免同优先级重复导出共享依赖。这一方案依据 [Creator 3.8 Asset Bundle 的优先级与依赖规则](https://docs.cocos.com/creator/3.8/manual/en/asset/bundle.html)，最终导出归属仍需构建报告核对。

未增加 UUID loadAny 回退，以免 Bundle 配置错误被回退路径掩盖。加载失败沿用可见重试提示。当前功能资源由应用作用域持有到应用销毁，不声称已经完成页面级缓存淘汰。

## 重跑审计

在项目根目录执行：

```powershell
python tools/resource_audit.py
python tools/resource_audit.py --duplicates
python tools/test_resource_audit.py
```

完整 JSON 默认写入 `client/temp/resource-audit/report.json`，属于可再生成的本地输出；可通过 `--output` 指定其他文件，`--assets` 用于隔离测试目录。重复内容扫描需读文件并计算 SHA-256，较普通扫描更慢。

报告包含源文件与作者 Bundle 统计、序列化 UUID/元数据依赖、atlas 图片页依赖、场景传递闭包、大文件、加载候选位置、未解析 UUID、解析错误，以及可选的完全相同内容组。

边界：不追踪全部脚本模块引用、拼接路径或配置驱动加载；加载位置仅是正则候选，并非完整语法分析。未解析 UUID 可能是内建资源，不能直接判成丢失资源。“未出现在场景闭包”不能判成可删除。

## 本批源码结果

以下是 P2-01/P2-04 首次快照；此后新增代码会改变源文件总数。P2-05 已进一步把重做版配置读取拆为启动 2 张、主城另 5 份，见 [配置分组加载](config-loading.md)。这同样不是包体优化完成。

- 全 assets 目录源文件合计约 649.59 MiB；其中 resources 目录 21,596 个文件、613.33 MiB。不含 .meta，均不是构建包体或运行内存。
- 移除主城场景直引前：Remake.scene 静态闭包 87 个文件、10,392,683 源字节（约 9.91 MiB）。
- 拆出主城入口后：21 个文件、6,864,554 源字节（约 6.55 MiB）。变化主要来自主城 Prefab 及其序列化依赖被移出启动闭包。
- 完全相同内容扫描得到 835 组，额外源副本合计 36,082,208 字节。只是候选：相同音乐可有不同玩法路径，删除前必须迁移引用与动态命名。
- 最新审计无 JSON 解析或 atlas 缺页错误；有 5 组未解析 UUID，仍需核对内建资源来源。动态加载候选 98 处，需逐项归类。
- before.json / after.json 保存在本机 temp/resource-audit 中。扫描期间会有编辑器写文件，顶层文件数量不是固定基线；关键场景闭包与 UUID 有单独检查。

## 已验证与未验证

已验证：资源池并发去重、所有者隔离、失败重试、取消后迟到结果、Bundle 依赖顺序、首次请求前不加载主城 Bundle、失败可重试、Prefab UUID 保持、场景无主城直引，以及真实 Creator 声明下的 strict 检查。

尚未验证：Creator 实际 Bundle 导入、发布构建后的资源归属、冷启动传输字节和耗时、主城首帧/重复进入、H5/App/微信包体、GPU/纹理内存、页面级释放。没有据源码数字宣称首屏已减少多少网络流量。

当前撤销引用使用 decRef(false)，保留引擎缓存；旧直接加载路径仍在运行，不主动 releaseAll。下一步先完成实际 Bundle 构建与预览，再按依赖清单扩大按需加载范围。

## 英雄列表按需资源（2026-10-29）

HeroResources 在点击主城底栏英雄时先准备 herotype/item，然后通过现有 prefabs Bundle 加载五项：HeroListLayer、HeroListHeroLayer、HeroIconCell、PagePrefabShell、ListBackdrop。没有复制这些 Prefab，也没有增加一个英雄 Bundle 或改动登录场景引用。

五项 Prefab 的独立引用由应用作用域持有到 RemakeApp 销毁，仍采用 addRef / decRef(false)。挂载沿用既有 loadPrefab 缓存，预热与实例化共用成功结果；保留该加载器已有的 UUID 回退，没有添加新回退。动态头像贴图仍走现有 SpritePaint，不据此宣称页面纹理已能独立释放。

home-bundle 检查已覆盖英雄配置失败时不发起 Prefab 加载、重试、并发共享、五项资源的引用与作用域释放。实际构建归属、网络和内存仍待 Creator/三端验证。
