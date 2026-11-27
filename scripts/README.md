# 本地启动入口

项目根目录 `G:\work\FsGame\Project\mxzg`。脚本使用自身位置定位工程，不要求先切工作目录。

- `start-remake-backend.bat`：启动或复用本项目新后端，默认 `127.0.0.1:18080`。
- `status-remake-backend.bat`：检查服务归属和状态。
- `restart-remake-backend.bat`：核对并重启当前仓库服务。
- `stop-remake-backend.bat`：仅停止已核对属于本仓库的服务，不清库。
- `build-remake-h5.bat` / `start-remake-h5.bat`：保留的按需操作入口；当前默认只用 Creator 预览，不自动构建。

## Hao 个人开发服

- Windows 重启或改完后端后，连接公司内网，双击桌面「MXZG 一键编译并启动个人服」。它调用 `update-dev-hao.cmd` 编译 `hao` 工作区（含已保存的未提交改动），备份个人库与旧 JAR，再启动 `192.168.0.33:18083`。已开服时在编译成功后短暂重启。
- 只运行上次编好的个人服时，双击 `start-dev-hao.cmd`。两个入口都会为 `dev-hao` 开启游戏内 GM，游戏启动参数为 `--mxzg.gm.enabled=true`。
- 双击 `stop-dev-hao.cmd` 停止个人服。`status-dev-hao.cmd` 显示运行状态、PID 和 WSS 地址。
- 个人服运行 `backend/.local/lan-personal/dev-hao/personal-server.jar`，同目录保留证书、H2 和启动日志。只编译时可运行 `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Manage-DevHao.ps1 -Action BuildOnly`。编译产物位于 `backend/.local/dev-hao-build/`。

## Creator 本机预览

Creator 提供 `http://localhost:7456/` 预览页面。`client/assets/scenes/Remake.scene` 上的 `socketUrl` 决定从哪台服务器读取区服列表。

- **与内网 H5 一起联调**：在这台开发机将场景的 `socketUrl` 设为 `wss://192.168.0.38:18082/api/v1/game/socket`，刷新预览。选「共享验收服」时浏览器连接打包机；选「Hao 个人开发服」时连接 `192.168.0.33:18083`。浏览器需信任两端各自的 CA。这是本机场景设置，提交场景时排除这处 IP 改动。
- **单机开发**：仓库场景的默认值为 `ws://127.0.0.1:18080/api/v1/game/socket`，使用 `start-remake-backend.bat` 启动日常后端，此时预览显示本机区服。

旧 Java 8 服务、WebSocket 桥及对应启停脚本已经删除。详细行为见 [本机工作流](../docs/local-remake-workflow.md)。

## 开发机与打包机的文件清单

同事打开打包机 `192.168.0.38:18082` 的 H5，选共享服时使用打包机的数据库，选 `dev-hao` 时浏览器直接连接开发机 `192.168.0.33:18083`。打包机 `18084` 提供构建台。区服登记和打包机配置见[内网交接](../docs/intranet-build-handoff.md)。下表路径都相对于开发机仓库根目录。

| 处理方式 | 文件或目录 | 用途与清理条件 |
| --- | --- | --- |
| 保留在项目里 | `scripts/*-dev-hao.cmd`、`scripts/Manage-DevHao.ps1`、`backend/dev.ps1`、`backend/pom.xml`、`backend/mvnw.cmd`、`backend/.mvn/` | 个人服编译与启停入口。编译还会读取当前的 `backend/src/`、`protocol/` 和 `client/assets/bundles/resources/config/`。 |
| 保留在项目里 | `scripts/*-remake-backend.bat`、`backend/control.ps1`、`backend/BackendProcess.ps1` | 管理 Creator 可单独连接的本机 `18080` 后端。`scripts/*-remake-h5.bat` 用于按需构建和运行本机 H5，`scripts/start-socket-preview.ps1` 用于隔离测试。 |
| 保留在项目里 | `scripts/server-reset/` | 清档工具源码和示例随 Git 分发。`reset.json` 是本机配置，桌面清档快捷方式会读取它。 |
| 保留在开发机，备份数据 | `backend/.local/lan-personal/dev-hao/` | `game.mv.db` 是个人存档，`personal-server.jar` 是已部署版本，同目录还有证书、口令和更新备份。备份 H2 前先停对应实例。对外仅交付公开 CA。 |
| 保留在开发机 | `backend/.local/game.mv.db`、`backend/.local/idle-activity.yml`、`backend/.tools/` | 日常后端的存档、活动配置、JDK 和 Maven 工具与缓存。`backend/target/` 是日常后端的运行类路径，`18080` 运行期间应保留。 |
| 保留公开证书 | `client/temp/dev-hao-handoff/mxzg-phone-wifi-ca.cer`、`client/local/mxzg-lan/shared-lan-ca.cer` | 两个文件分别用于信任开发机和打包机的 WSS，导入前核对各自的 CA 指纹。 |
| 本机旧服务退役后再清 | `client/temp/phone-wifi-h5/`、`client/temp/build-console/` | `.33:18082` 的游戏包、库和证书，以及 `.33:18084` 旧门户的配置、任务历史和源码镜像。两者与 `.38` 的共享服务分别保管。原手机测试服仍使用 `scripts/start-phone-h5.cmd` 和 `scripts/Start-PhoneH5.ps1`。 |
| 可按需删，先结束相关构建 | `backend/.local/dev-hao-build/`、`client/temp/dev-hao-run/1f7c3a22/backend/target/`、`client/temp/dev-hao-run/source-1f7c3a22.tar` | 当前候选包、旧快照构建产物、可从 Git 重新导出的源码归档。删除这些文件后，下一次更新会重新编译。 |
| 单独核对后归档 | `client/temp/dev-hao-run/1f7c3a22/backend/.local/` 和该快照的 `.tools/` | `.local/` 内有迁移前的个人库和证书；`.tools/m2`、`.tools/maven-user` 是指向主项目缓存的 Windows 目录联接。清理旧快照时应保留所需历史，避免沿联接删除目标。 |

旧构建台的 `scripts/build-console/` 和 `scripts/start-build-console.cmd` 已从当前分支移除。开发机访问新构建台使用打包机网址。
