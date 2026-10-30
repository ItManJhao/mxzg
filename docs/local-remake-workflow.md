# 重做版本机启动、重启与独立 H5

本页只对应新后端与 `Remake.scene`，旧 Java 8 / WebSocket 链路仍使用原有脚本。H5 是本地开发构建；MySQL、App、微信小游戏和生产部署另行验收。

**最新约定（2026-10-30）：后续不自动构建 H5 或其他任何包，等用户需要时再说。** 当前开发优先用 Creator 本机预览。以下构建/静态服务脚本是保留的操作说明，不是要求本批执行；旧 18081 产物不代表当前源码（含 Bag MVC）已通过独立 H5 验收。

## 日常入口

脚本均在 `F:\project\mxzg\scripts`，双击后不要求先切换目录：

- `start-remake-backend.bat`：启动开发后端；已有兼容服务时显示 READY 并复用。复用提示窗口可以关闭；实际持续输出日志的服务窗口应保持打开。
- `status-remake-backend.bat`：检查本项目后端的进程归属和服务状态。
- `stop-remake-backend.bat`：停止当前本项目的本地开发后端；没有服务时正常返回。只凭端口占用不会停止未知进程。
- `restart-remake-backend.bat`：停止已核对归属的服务，重新编译当前后端代码并启动。修改 Java 后使用这个入口；再次双击 start 只会复用旧进程。
- `build-remake-h5.bat`：用 Creator 3.8.8 命令行重新构建 H5，成功后输出到 `client/build/remake-h5`。构建窗口显示日志路径，首次导入资源较慢。
- `start-remake-h5.bat`：在 `http://127.0.0.1:18081/` 提供已构建的游戏并打开浏览器。实际运行预览的窗口保持打开，Ctrl+C 停止 H5 静态服务；复用已有 H5 服务时提示后可关闭窗口。

日常查看先启动后端，在 Creator 打开 Remake.scene 并预览当前场景。只有用户需要独立 H5 时才启动已有静态包；已有包不必每次重建。修改客户端 TS、Prefab、美术或配置后需要重新构建，刷新独立 H5 才会看到新版本。Creator 的 7456 预览仍可用于编辑时快速查看。

当前 H5 是调试构建，会显示性能统计和开发账号入口；不是正式发行包。关闭 Creator 不影响已启动的 18080 后端和 18081 静态预览，但应保留实际运行这两个服务的窗口。

本批出阵页的 Prefab、节点、Inspector 参数和修改验证步骤见 [出阵页人工维护指南](formation-ui-authoring.md)。修改源 Prefab 后，Creator 预览需要等待导入；独立 H5 需要重新构建，两者不要混为同一个产物。

当前批次库存事件的参数、顺序与订阅见 [事件规则](bag-inventory-events.md)。模块职责、请求/领奖链和退役边界见 [背包 MVC 维护指南](bag-mvc-maintenance.md)。沿用的背包列表入口、布局参数和无业务数据的编辑器预览见 [SuperScroll 维护指南](super-scroll-authoring.md)。本批仅进行本机预览及代码检查。

## 构建如何隔离

需要本机 Creator 3.8.8、Windows PowerShell、robocopy 和 Python 3.9 以上。Creator 默认位置为 `C:\ProgramData\cocos\editors\Creator\3.8.8\CocosCreator.exe`，其他安装位置可通过 `MXZG_CREATOR_PATH` 指定。

固定参数在 `client/tools/remake-h5.build.json`，只包含 Remake 场景。脚本把 assets/settings/package 复制到忽略的 `client/temp/remake-h5-project`，不借用用户已打开的编辑器，也不修改它的场景/构建面板。临时工程保留自己的导入缓存，后续构建复用；镜像同步只允许在已检查的临时工程和 remake-h5 输出目录内进行。

Creator 官方命令行成功退出码是 36（见 [官方命令行发布文档](https://docs.cocos.com/creator/3.8/manual/zh/editor/publish/publish-in-command-line.html)）。脚本检查成功码、index.html、launchScene 及 Bundle 包内 UUID/重定向引用后才复制产物，写入 `mxzg-build.json` 记录时间、场景、源提交和是否有未提交源码。失败不把旧构建当作本次成功。构建参数为本地调试用途，尚未进行发行包体优化。

构建记录还包含出阵 Prefab、共享 Cell、FormationView 和 FormationSlotView 的输入 SHA256，取自隔离工程在构建前的快照。`sourceCommit` 与 `sourceDirty=true` 必须一起理解：有未提交源码时，不能把产物直接等同于该提交；可对照输入 SHA 核实本页版本。

独立服务只绑定 127.0.0.1，Windows 使用独占监听，重复启动先核对身份后复用；不提供目录列表或工程源码。响应禁用浏览器缓存，构建身份可在 `/__mxzg_preview__` 查看。新后端仅在 local 配置允许 7456、18081 的 localhost/127.0.0.1 来源。其他端口不自动放开。

首轮实际构建暴露的 Set 展开问题已改用 Array.from，发布转换回归纳入统一检查；选服 Button 的目标节点也纳入绑定检查。共享 Bundle 优先级采用 resources 8、prefabs 2、remake-home 1，按 [官方 Bundle 依赖规则](https://docs.cocos.com/creator/3.8/manual/zh/asset/bundle.html) 先加载共享包。产物配置校验会拒绝指向 UUID 表之外的 JSON 包条目。

## 停止与数据

重启不删除数据库。当前开发数据仍是 `backend/.local/game.mv.db`；H2 采用 WRITE_DELAY=0。停止前核对 Java 入口、local profile、当前仓库 classpath 或完整 jar 路径，并再次确认进程身份；不通过的占用保持原样并显示原因。

当前 Windows 停止方式是终止已核对的 JVM，不是生产环境的优雅停服机制；已用隔离文件库验证会话、角色和主线跨停止/重启保留。生产启停与在线玩家事务处理仍属于后续部署任务。

## 验证入口

- `python tools/test_remake_local_tools.py`：构建入口身份、禁止越界/目录列表、缓存与七种进程归属案例。
- `python tools/test_remake_backend_control.py`：先 package 后执行；随机端口与隔离 H2 库验证拒绝其他程序、状态、停止、Maven 重启及数据保留。
- `python tools/test_backend_launcher.py`：启动复用、旧后端及未知占用检查。
- `client/tools/check-remake-preview.cjs` 可设 `MXZG_PREVIEW_URL=http://127.0.0.1:18081/`、`MXZG_SCREENSHOT_PREFIX=h5`，验证独立构建。此模式使用手机尺寸并阻断 7456，避免退回 Creator 预览。

实际验收结果、日志与仍未完成的事项见 [开发进度](development-progress.md)。
