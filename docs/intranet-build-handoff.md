# Windows 内网打包机交接

这台 Windows 机器同时运行 MXZG 内网构建台和游戏验收服。开发机在 `hao` 开发，负责人确认后合入 GitHub 的 `main`。构建台读取 `origin/main`，在打包机上编译并更新验收服。正式发布按仓库约定使用 `online`。参见[分支约定](../AGENTS.md#开发内网验收与发布分支约定2026-11-27负责人确认)。

本文用 `<打包机IP>` 代替实际地址。首次接手时，从维护人交接的内网入口或打包机的 `client/temp/build-console/config.json` 读取 `portalUrl` 和 `gameUrl`。

## 开发机接入和日常发布

- 构建台使用 `https://<打包机IP>:18084/`，游戏入口使用 `https://<打包机IP>:18082/index.html`。开发机和测试手机接入允许访问的内网。首次访问时，向维护人取得并信任联调 CA **公开证书** `mxzg-phone-wifi-ca.cer`。门户概览显示实际构建机、源码和已部署版本。
- Creator 本地浏览器预览可以连接已经发布的验收服。在开发机的 [Remake.scene](../client/assets/scenes/Remake.scene) 里临时将 `socketUrl` 设为 `wss://<打包机IP>:18082/api/v1/game/socket`，使用 `http://localhost:7456` 或 `http://127.0.0.1:7456` 预览。验收地址属于本机预览设置，提交前恢复场景的默认地址。修改 Java 后端或通信协议时，先用[独立开发后端](local-remake-workflow.md#日常入口)验证尚未合入的版本。
- 完成开发后，将 `hao` 上已确认的改动合入 GitHub 的 `main`。在任意一台可访问门户的电脑上，打开构建台，点「解锁操作」，再点「一键全量更新」。口令由维护人在打包机的 `stateDirectory/operator-token.txt` 中取得。
- 一键全量在打包机同步源码、导出共享配置、用 Creator 打包 H5、用 Maven Wrapper 编译 Java 并生成 JAR。两端检查通过后发布到同一验收实例。源代码只在本机或 `hao` 上时，验收版本仍以 `origin/main` 为准。合入 `main` 后由操作员在门户触发发布。
- 在「任务记录」看结果，在「已部署版本」核对前端、后端是否和预期提交一致。两端协议或共享配置一起变动时，使用同一次全量发布。「拉取最新」只同步源码镜像。「后端重启」复用现有产物及 H2 测试库。各操作细节见[构建台说明](../scripts/build-console/README.md#任务入口)。
- 访问同一个构建台实例的同事共享最近 25 条任务摘要，包含操作、时间和结果。点选任务并解锁后可以看详细日志。当前任务没有操作人字段，直接运行脚本的任务和其他构建机的历史记录需要到原执行位置查询。

## Windows 重启后恢复

登录打包机的 Windows 账号，双击桌面「MXZG 内网一键启动」。这个快捷方式调用本机 `client/temp/build-console/Start-MxzgLan.ps1`，脚本等待网卡取得保留地址，检查当前防火墙，启动构建台和上次已发布的游戏，验证 HTTPS 和 WebSocket 后打开门户。已运行的构建台和游戏会被复用。当端口归属不符或检查失败时，启动窗口会提示原因。

首次发布之后，如需临时绕过快捷方式，先在打包机运行本机的 `client/temp/build-console/start-local.cmd`，再到门户点「后端重启」。换机时可按[构建台换机说明](../scripts/build-console/README.md#换成另一台打包机)恢复标准启动入口。桌面快捷方式、本机启动脚本和运行配置需要单独保留。当前采用登录后双击启动的方式。

## 打包机本机配置

1. **网络。** 在网关的 DHCP 静态分配列表按打包机有线网卡 MAC 保留 IPv4。当前使用的网关可从「网络 → LAN配置 → IPv4配置 → 配置Mac/IP绑定」添加条目，`VLAN=0` 表示这条 DHCP 保留不限定端口 VLAN。Windows 保持 DHCP 自动获取，原地址池及网关设置保持原值。
2. **防火墙。** 启用有线网卡当前使用的 Windows 防火墙配置。`MXZG-LAN-Acceptance-TCP` 入站规则限定有线网卡、打包机 IP、获准的内网网段和 TCP `18082`、`18084`。`18080` 保留给开发后端的回环地址。内网验收使用自己的 H2，安装和启动无需连接机器现有的 MySQL 或 Redis。
3. **工具和出站访问。** 使用 Creator 3.8.8、JDK 21、带 npm 的独立 Node.js、Git、Python 及 [导表依赖](../tools/requirements.txt)。将 Creator、Java 和 Python 的绝对路径写入本机配置。当前打包机使用项目专用的 Node.js、JDK 和 Python 环境。若 Windows Git 全局代理不可用，应先核对运行门户的账号能否直连 GitHub；本机 `start-local.cmd` 使用仅对 GitHub 生效的进程级 Git 配置。还需能访问 npm、Maven 和首次安装导表依赖所用的 Python 源。
4. **配置和证书。** 参考[样例](../scripts/build-console/config.example.json)填写 `client/temp/build-console/config.json`。`listenHost`、`portalUrl`、`gameUrl` 的 IPv4 应与 DHCP 保留一致。服务端证书的 SAN 包含该 IPv4，PKCS#12 私钥别名为 `phone-wifi`。`runtimeDirectory/certs` 下保留 `server.p12`、`server-password.txt`、`mxzg-phone-wifi-ca.cer`。门户的 `caCertificate` 指向同一 CA 的 PEM 文件。地址变更或证书到期时应重新配置地址和证书，并更新开发机与测试设备的信任。
5. **首次发布。** 在新机启动构建台后跑一次「一键全量」，创建 H5、JAR 和独立 H2。若要沿用旧测试数据，先停止旧测试实例，再迁移 H2 文件和经确认的 `idle-activity.yml`。手机验收入口使用开发身份，当前启动脚本关闭服务端 GM。

## 本机文件和备份

当前路径均相对于打包机上的仓库根目录。仓库只跟踪样例和说明，本机文件位于 Git 忽略的目录。

- `client/temp/build-console/` 保存 `config.json`、`start-local.cmd`、`Start-MxzgLan.ps1` 和本机 Git 出站配置 `github-direct.gitconfig`。
- `client/temp/mxzg-build/console/` 对应 `stateDirectory`，保存 `source-main` 镜像、发布版本 `release.json`、任务历史 `jobs/` 和操作口令。
- `client/temp/mxzg-build/h5/` 对应 `staticRoot`，是正在发布的 H5。`client/temp/mxzg-build/test-runtime/` 对应 `runtimeDirectory`，包含已发布 JAR、证书、运行日志和独立库 `data/phone-wifi-test.mv.db`。
- `client/temp/mxzg-build/tools/` 保存本机专用工具以及 npm、Maven 缓存。工具可按上面的本机配置重新安装。

换机、重装或清理 `client/temp` 前，将启动脚本、配置、证书、需要保留的任务历史、发布产物和 H2 备份到受限位置。复制 H2 文件前先停止测试服务。供开发机导入的是 CA 公开证书。操作口令、证书私钥、`server.p12`、密码文件、测试库和运行日志留在受控本机或备份位置，避免提交到仓库。

## 已核对的运行结果

首发前后端版本为 `a85b8fe9`。已核对导表和配置包、H5 产物、Java JAR、H2 迁移、HTTPS 200、WebSocket 101，并通过只读区服列表请求取得 `local-1` 和 `local-2`。桌面入口指向的一键启动脚本已验证可复用正在运行的两个进程。Windows 冷启动复验和从异机实际选服、登录并进入主城仍待执行。

日常排查先看门户的「构建机」「服务状态」「已部署版本」和「任务记录」。网页打开但没有记录时，确认访问的是同一个构建台，在「任务记录」点「刷新状态」；仍找不到某次任务时，按当时的执行入口查原构建机或命令行日志。
