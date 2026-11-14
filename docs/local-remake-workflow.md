# 重做版本机启动、重启与独立 H5

> 2026-11-14 当前通信：全部游戏业务HTTP已删除，登录、角色、背包及已恢复玩法使用WS＋Protobuf v2。实际开放范围、当前数据与测试以[开发进度](development-progress.md)和[通信契约](network-contract.md)为准。

本页只对应新后端与 `Remake.scene`，旧 Java 8 / WebSocket 链路与启停脚本已删除。H5 是本地开发构建；独立 MySQL 验证入口见下文，App、微信小游戏和生产部署另行验收。

**当前约定（2026-11-14）：日常开发优先使用Creator本机预览；每批按负责人当次授权集中构建，不要求每修改一个页面就构建。** 本批负责人已明确授权统一构建入口及检查真实发布产物，使用下述同一套脚本与构建钩子。旧18081目录或历史成功日志不代表当前源码已通过验收；是否构建和真实运行通过，按本批身份记录与[当前进度](development-progress.md)确认。

## 日常入口

脚本均在 `G:\work\FsGame\Project\mxzg\scripts`，双击后不要求先切换目录：

- `start-remake-backend.bat`：启动开发后端；已有兼容服务时显示 READY 并复用。复用提示窗口可以关闭；实际持续输出日志的服务窗口应保持打开。
- `status-remake-backend.bat`：检查本项目后端的进程归属和服务状态。
- `stop-remake-backend.bat`：停止当前本项目的本地开发后端；没有服务时正常返回。只凭端口占用不会停止未知进程。
- `restart-remake-backend.bat`：停止已核对归属的服务，重新编译当前后端代码并启动。修改 Java 后使用这个入口；再次双击 start 只会复用旧进程。
- `build-remake-h5.bat`：统一的独立H5构建入口，用Creator3.8.8在隔离工程构建，实际钩子及产物检查通过后才输出到`client/build/remake-h5`。构建窗口显示日志路径，首次导入资源较慢。
- `start-remake-h5.bat`：在 `http://127.0.0.1:18081/` 提供已构建的游戏并打开浏览器。实际运行预览的窗口保持打开，Ctrl+C 停止 H5 静态服务；复用已有 H5 服务时提示后可关闭窗口。

18081只提供前端静态宿主，不会自动启动远程Bundle资源服务。统一默认资源根为7460，使用当前构建时须另开终端在仓库根运行：

```powershell
node client/tools/serve-remote-bundles.cjs client/build/remake-h5 7460
```

若构建时用-ResourceServer指定其他地址，应提供该地址对应的资源服务。start-remake-h5.bat仍调用PATH中的python，不读取MXZG_PYTHON；后者只供build-remake-h5.ps1选择构建检查解释器。PATH中没有可用Python时，可用已确认的解释器显式执行`tools/serve_remake_h5.py`，例如`& $env:MXZG_PYTHON tools/serve_remake_h5.py`。资源服务与前端服务各自保持运行，按各自终端Ctrl+C停止，不自动启动日常后端。

日常查看先启动后端，在 Creator 打开 Remake.scene 并预览当前场景。只有用户需要独立 H5 时才启动已有静态包；已有包不必每次重建。修改客户端 TS、Prefab、美术或配置后需要重新构建，刷新独立 H5 才会看到新版本。Creator 的 7456 预览仍可用于编辑时快速查看。

当前统一H5验收选项关闭调试模式与MD5缓存，使用Web手机端、竖屏及自动图集；它是本地验收产物，不代表已完成生产CDN、App或微信小游戏发行验收。关闭Creator不影响已启动的18080后端和18081静态服务，但应保留实际运行服务的窗口。18080是日常后端；独立验收必须显式选择随机端口测试宿主，不能将本地静态包默认连接日常账号作为隔离证明。

本批出阵页的 Prefab、节点、Inspector 参数和修改验证步骤见 [出阵页人工维护指南](formation-ui-authoring.md)。修改源 Prefab 后，Creator 预览需要等待导入；独立 H5 需要重新构建，两者不要混为同一个产物。

当前批次库存事件的参数、顺序与订阅见[事件规则](bag-inventory-events.md)。模块职责、请求/领奖链和退役边界见[背包MVC维护指南](bag-mvc-maintenance.md)。沿用的背包列表入口、布局参数和无业务数据的编辑器预览见[SuperScroll维护指南](super-scroll-authoring.md)。历史“仅预览”批次结论仍按原记录保留；本批构建和浏览器范围另记，不互相替代。

## 构建如何隔离

需要本机Creator3.8.8、Windows PowerShell、robocopy、可用Node命令、已按client/package-lock安装的依赖，以及Python3.9以上。Creator默认位置为`C:\ProgramData\cocos\editors\Creator\3.8.8\CocosCreator.exe`，其他安装位置通过MXZG_CREATOR_PATH指定；Python通过MXZG_PYTHON指定，不修改系统默认解释器。

固定参数在client/tools/remake-h5.build.json，只包含Remake场景并选择全部Bundle。脚本先生成/核对配置包，再把当前assets/settings/package、依赖、扩展与工具复制到忽略的client/temp/remake-h5-project/client；兄弟tools/config保留扩展所需仓库相对结构，不复制旧profiles覆盖选项。脚本不借用用户已打开的编辑器，也不修改它的场景/构建面板。临时工程保留自己的导入缓存，后续构建复用；镜像同步只允许在已检查的隔离目录和remake-h5输出目录内进行。

从仓库根运行`powershell.exe -NoProfile -ExecutionPolicy Bypass -File client/tools/build-remake-h5.ps1`与双击bat使用同一入口。-PrepareOnly只准备并校验输入，不启动Creator、不替换已有验收包；-ResourceServer可覆盖唯一默认资源根http://127.0.0.1:7460/。日志保存在client/temp/remake-h5-build，prepared.json记录实际隔离工程与配置路径。

Creator官方命令行成功退出码是36（见[官方命令行发布文档](https://docs.cocos.com/creator/3.8/manual/zh/editor/publish/publish-in-command-line.html)）。脚本检查成功码、真实三阶段构建钩子、index.html、launchScene及Bundle包内UUID/重定向引用后才复制产物。mxzg-build.json记录时间、场景、源提交、是否有未提交源码、源摘要、配置包和真实产物核验结果；失败不把旧构建当作本次成功。

当前扩展身份为`config-package-artifact-v1 v1.8.0`：onBeforeBuild在普通Node子进程只读核验源配置包/过滤/解码器，避免在Creator构建线程中执行需要Worker的同步esbuild；onBeforeCompressSettings登记本地bootstrap；onAfterBuild扫描全部Bundle中的启动JSON、唯一bin、47份源表排除与解码模块，再检查bootstrap及旧原图清理。Node检查失败不能写假成功结果，也不在构建线程修改尚未导入的资源。完整命令和边界见[集中构建说明](staged-resource-loading.md#集中构建)。

构建记录的sourceSha256取自隔离工程在构建前复制的全部TS文件；它没有记录Prefab或Cell资源的SHA，不能据此声称这些资源已做输入哈希核对。sourceCommit与sourceDirty=true必须一起理解：有未提交源码时，不能把产物直接等同于该提交；源摘要、钩子、实际产物与运行证据应分别核对。

独立服务只绑定127.0.0.1，Windows使用独占监听，重复启动先核对身份后复用；不提供目录列表或工程源码。响应禁用浏览器缓存，构建身份可在/__mxzg_preview__查看。新后端仅在local配置允许7456、18081的localhost/127.0.0.1来源，其他端口不自动放开。

独立H5测试链接允许在18081的/或/index.html显式携带mxzgTestApi与mxzgTestRun：IsolatedSocketPreviewUtils先核验前端/__mxzg_preview__中的真实build、配置包和产物身份，再核验随机测试后端/api/v1/test-identity的kind/run，全部通过才使用独立WS和run前缀存储；失败不回退日常后端或凭证。Creator预览及其托管构建入口仍保留原边界。新增18081入口的源码与PREVIEW真/假两种编译专项已通过，本次真实浏览器运行也已完成下述限定验收。

本次实际构建builtAt为2026-11-14T11:54:53.0380559Z，即上海11-14 19:54。18个输出Bundle中的47份散表零副本，一份bin408,367字节，1.8.0三个实际钩子匹配；18081前端、7460本地资源与随机61639独立H2/WS通过首次、冷恢复点击开始及换号，各验收页只有一份bin请求记录，切页与换号不增加配置请求。背包1001001评分/攻击33、900102道具、950001碎片和2000002攻击146/低级生机专用详情，以及英雄/技能、挂机对话→布阵→二三关→胜利双方战报→关闭返回已通关均通过。页面配置请求始终6项而非47表下载，GameConfig为49文件/20类型表，bin不驻留引擎资产缓存，当前页面无新warn/error。完整范围见[发布最终记录](validation/config-package-release-review-20261114.json)；历史61639仅标识该批实例，不作为后续可复用端口。真实CDN、真机、弱网和完整经验动画边界没有以本批替代，未提交推送。

首轮实际构建暴露的Set展开问题已改用Array.from，发布转换回归纳入统一检查；选服Button的目标节点也纳入绑定检查。早期resources8、prefabs2、remake-home1的包名/优先级属于目录整合前历史，不能重新建立旧包；当前以各Bundle meta和[Bundle维护说明](staged-resource-loading.md)为准。加载遵循[官方Bundle依赖规则](https://docs.cocos.com/creator/3.8/manual/zh/asset/bundle.html)，产物配置校验拒绝指向UUID表之外的JSON包条目。

## 停止与数据

重启不删除数据库。当前开发数据仍是 `backend/.local/game.mv.db`；H2 采用 WRITE_DELAY=0。停止前核对 Java 入口、local profile、当前仓库 classpath 或完整 jar 路径，并再次确认进程身份；不通过的占用保持原样并显示原因。

当前 Windows 停止方式是终止已核对的 JVM，不是生产环境的优雅停服机制；已用隔离文件库验证会话、角色和主线跨停止/重启保留。生产启停与在线玩家事务处理仍属于后续部署任务。

## 验证入口

### 独立 MySQL（2026-11-02）

在 backend 目录执行 `./test-mysql.ps1 -MysqlHome '<官方 MySQL 8.4 Windows ZIP 解压目录>'`。只创建全新回环实例、随机空闲端口、唯一 mxzg_it_ 库及库级受限账号，不连接已有玩家库、不调用日常启停脚本、不替换已有服务配置。没有显式二进制目录即中止；正常开发和默认 H2 测试入口不变。

2026-11-02 续验后 MySQL 8.4.13 实跑 9/9 通过，随后 H2 24/24 通过。包含真实 SQL 重叠的四组业务并发、奖励回滚、两次应用上下文重建和一次本批数据库进程重启；新增 HTTP 业务链及两次独立 JVM 终止/重新启动，分别验证未领奖和已领奖恢复。HTTP 并发登录/挑战/领取另有三组 SQL 重叠证据。JVM/JDBC UTC、数据库 +00:00。独立测试 JVM 使用随机回环 HTTP 端口，逐代 PID/端口记录于 http-process-N.properties，凭据仅走标准输入管道。结束后保留停止的数据目录及 ownership.properties，不保留引导密码文件；人工清理前再次核对归属，不能按名称猜测删除。环境要求、权限/身份保护和覆盖细节见 [后端说明](../backend/README.md)，本次资源标识见 [开发进度](development-progress.md)。

### 客户端与本机工具

2026-10-31 本机复跑方式（只设置当前 PowerShell 进程，不修改全局 PATH）：

```powershell
$env:MXZG_PYTHON = 'D:\新建文件夹\sd-webui-aki-v4.2\python\python.exe'
# 本机发现的 Python 3.10.11；其他机器先自行确认解释器，不照搬此路径。
& $env:MXZG_PYTHON -m pip install --target client/temp/check-python-deps -r tools/requirements.txt
$env:PYTHONPATH = (Resolve-Path client/temp/check-python-deps).Path
node client/tools/check-project.mjs
node C:/ProgramData/cocos/editors/Creator/3.8.8/resources/app.asar.unpacked/node_modules/typescript/lib/tsc.js -p client/tools/tsconfig.remake.json
```

依赖在忽略的 temp 中，固定 openpyxl 版本来自 tools/requirements.txt。已安装时不必重复 pip。仅发现 WindowsApps 的 python.exe 不能证明 Python 可用；启动失败与业务断言失败须分别记录。历史 gen_citychrome_prefab.py 已禁止直接执行，避免用旧生成模型覆盖人工布局；现行只读绑定检查为 client/tools/check_citychrome_shell_id.py。

- `python tools/test_remake_local_tools.py`：构建入口身份、禁止越界/目录列表、缓存与七种进程归属案例。
- `python tools/test_remake_backend_control.py`：先 package 后执行；随机端口与隔离 H2 库验证拒绝其他程序、状态、停止、Maven 重启及数据保留。
- `node tools/test_backend_launcher.cjs`：启动复用、旧后端及未知占用检查。
- `client/tools/check-remake-preview.cjs` 可设 `MXZG_PREVIEW_URL=http://127.0.0.1:18081/`、`MXZG_SCREENSHOT_PREFIX=h5`，验证独立构建。此模式使用手机尺寸并阻断 7456，避免退回 Creator 预览。

实际验收结果、日志与仍未完成的事项见 [开发进度](development-progress.md)。


## 普通升级的专用测试连接

普通升级验证不能使用上文日常开发后端。使用 [后端说明](../backend/README.md) 的 `test-mysql.ps1 -Preview` 创建全新实例、受限账号和独立 HTTP 进程；把其显示的 run/端口填入 Creator 新测试页的显式参数。日常 scene 地址、默认配置和会话不覆盖。先确认身份握手成功，再以本批新账号登录。普通升级 Prefab 修改后等待 Creator 导入；页面连点、关闭和换号用真实返回复验，不能把 H2 或引擎替身当作视觉验收。


### 独立战报画面（2026-11-05）

先运行后端测试生成backend/target/chapter-1-1-1-replay.pb，再运行`node tools/check_battle_replay.cjs`。通过后在仓库根启动`node tools/serve_battle_replay.cjs`，只监听127.0.0.1:19091。Creator刷新资源并启动Remake预览，打开`http://localhost:7456/?battleReplay=1`，点击“开始”。本入口不登录、不读写玩家库；“撤退”清理测试战场，重新验收需刷新页面。验收完在资源服务终端按Ctrl+C停止。此入口不能用于生产部署或真实挑战。


### ChapterEnd 只读复验

启动 `node tools/serve_battle_replay.cjs` 后，用 `http://localhost:7456/?battleReplay=1` 点击开始，完整战报结束后检查胜利翅膀、结算声、遮罩关闭和退出测试。失败样式使用 `http://localhost:7456/?battleReplay=1&chapterEnd=defeat`，点击“失败样式验收”检查失败标题、只读四图标、失败音效和5秒关闭；该入口不播放或伪造失败战报。两者均只允许本机Creator预览，不连接账号或数据库。运行 `node tools/check_chapter_end.cjs` 验证生命周期与预制体绑定。
