# 内网打包门户

门户在打包机上运行，网页负责看状态和发起任务，Git 拉取、Excel 导出、Cocos 与 Java 构建均在打包机本地执行。开发电脑在 `hao` 开发，内网构建台从 `main` 构建，正式发布使用 `online`。

## 本机使用

- 双击 scripts/start-build-console.cmd 启动门户。默认读取 client/temp/build-console/config.json，也可把配置文件的绝对路径交给启动脚本。
- 双击 scripts/start-phone-h5.cmd 启动独立 H5 测试服。网页链接使用 gameUrl；重启按钮只管理指定的测试实例。
- 同网段成员直接看游戏入口、服务状态、提交及任务历史。构建机上的操作人员从 stateDirectory/operator-token.txt 获取操作口令，页面仅在当前标签内保留口令。源码、私钥、配置和日志目录均不作为网页静态目录发布。
- 构建台使用 `stateDirectory/source-main` 同步 `origin/main`，再用临时工作树执行任务。升级前的 `source`（`hao`）和原任务记录可用于追查历史，切换源码分支本身不替换已部署版本。命令窗口关闭时，后台作业如中断可从历史查看。

## 任务入口

| 按钮 | 执行动作 |
| --- | --- |
| 拉取最新 | 同步 `origin/main`，只接收可快进更新，记录真实提交号。 |
| 前端更新 | 使用已同步版本构建 Web Mobile，配置当前游戏 HTTPS 资源和 WSS 地址，通过产物检查后发布。 |
| 后端更新 | 使用已同步版本打包 Java，包准备好后更新并启动测试服务器。 |
| 后端重启 | 使用现有构建和独立测试库重启，读取真实运行状态。 |
| 配置表更新 | 拉取、执行共享 Excel 导出及 GConfig 和配置包核验。 |
| 一键全量 | 拉取、导表并构建两端，构建完成后发布到同一测试实例。 |

业务专用规则由各自定向导出工具维护，参与发布的已生成规则要与其来源一起提交。协议或配置同时影响两端时使用同一批全量发布。详见 [配置生成流程](../../docs/config-pipeline.md)。

构建完成后才短暂停测试服切换产物。发布保留上一版产物，后端换版前会备份该测试实例的 H2。若新版本启动或健康检查失败，任务会尝试恢复旧产物与测试库。每次任务的日志可在门户查询。

## 换成另一台打包机

1. 待打包门户合入 `main` 后，在目标 Windows 电脑检出整个项目的 `main` 分支，包含 scripts、client、backend、protocol 和 config。
2. 安装 Creator 3.8.8、Java 21、Git、Node.js/npm、Python。用该机将来运行门户的 Windows 账号配置 Git 拉取权限，并执行 python -m pip install -r tools/requirements.txt。准备可访问的 npm 和 Maven 依赖源。
3. 准备匹配测试地址的 HTTPS 证书、独立运行目录和 H2 测试库。runtimeDirectory/certs 下放 server.p12、server-password.txt 和用于健康检查的 mxzg-phone-wifi-ca.cer。门户读取配置指定的 PKCS#12 和 CA 文件，访问者使用公司信任的证书或信任此联调 CA。保留正确的 idle-activity.yml 才会沿用原测试活动配置。若需带走现有 H2 数据，先停旧测试实例再迁移该测试库文件。
4. 复制 [配置样例](config.example.json) 到目标机器的 client/temp/build-console/config.json，填固定内网 IPv4、端口、游戏 URL 和本机工具的绝对路径。构建目录、发布目录和测试库使用构建机专用路径。另机使用正常 pip 环境时，pythonModulePath 可留空。
5. 防火墙允许公司网段访问游戏测试端口和门户端口。启动门户后先检查状态。首次部署用一键全量同时生成 H5 和后端 JAR，之后可分别更新。团队如果只使用链接，可以保持浏览权限。操作口令由新打包机首次启动生成。

此流程由一台打包机同时构建和发布到本机的内网测试服务。若以后将打包机和游戏测试服分在不同机器，需要为发布产物增加受控传输和目标机部署步骤。
