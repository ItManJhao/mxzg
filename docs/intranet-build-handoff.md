# Windows 内网打包机交接

打包机和获准接入内网的开发机使用同一个构建台。在浏览器打开 `https://<打包机IP>:18084/`，将占位符替换为维护人提供的内网地址。手机 H5 验收入口为 `https://<打包机IP>:18082/index.html`。首次访问时，从维护人取得用于验证这两个 HTTPS 入口的 CA 公开证书，并在访问设备上信任它。

## 打开构建台

1. 在独立构建台点「注册」并提交自己的账号。
2. 管理员在打包机本地浏览器点「本机管理」，输入独立构建台状态目录中 `operator-token.txt` 的口令，然后在「注册审批」通过申请。开发机使用各自注册的账号登录。
3. 同事返回网页点「登录」，选择项目 **MXZG**。有该项目操作权限的账号可以构建并查看完整日志。若管理员已开放项目状态，访客也可以看任务摘要。新任务会记录发起账号。

任务记录由接收操作的构建台保存。查询同事的操作时，打开同一实例，选择同一项目并刷新「任务记录」。直接在命令行运行的构建，日志在执行它的机器上。

如果页面只有「解锁操作」，请向维护人确认访问地址和当前运行的门户版本。这是旧版界面，获授权的操作员使用维护人交接的操作口令解锁。旧任务摘要包含时间和结果，详细日志需解锁查看，历史记录没有提交人的账号。

## 从开发机发布内网验收版

1. 在开发机的 `hao` 分支完成改动并验证。负责人决定何时把已确认的提交合入 `main`。正式发布使用 `online`。见[分支约定](../AGENTS.md)。
2. 确认提交已进入远端 `main` 后，在构建台选 MXZG（有项目选择器时），点「一键全量更新」。打包机收到任务后同步 `origin/main`、导出共享配置、用 Creator 打包 H5、用 Maven 编译 Java 并部署内网验收服。
3. 在「任务记录」查看执行结果，在「已部署版本」核对前端、后端的提交号，然后打开 H5 验收。「拉取最新」只更新打包机的源码镜像。「后端重启」使用已部署的 JAR 和现有测试库。

本地用 Creator 3.8.8 预览时，可临时将 [Remake.scene](../client/assets/scenes/Remake.scene) 的 `socketUrl` 设为 `wss://<打包机IP>:18082/api/v1/game/socket`，在 `http://localhost:7456` 打开预览。提交前恢复场景默认地址。修改 Java 后端或 [Protobuf 契约](../protocol/game.proto) 时，先在[本地独立后端](local-remake-workflow.md#日常入口)联调对应版本。

## 在游戏里选择共享服或个人服

所有人打开打包机的 **游戏 H5**，在登录页选服。选「共享验收服」进入打包机运行的已发布版本，原开发一服的角色继续使用原数据库、原区服 ID `local-1`。选「小王开发服」时，浏览器直接向小王开发机建立 WSS 连接，角色保存在小王的个人数据库。个人服可以运行当前工作树中尚未提交的后端代码。如果还改了协议、客户端代码或资源，使用与该后端匹配的 Creator 预览或 H5，并让预览的目录地址指向共享服。

### 开发机启动个人服

下面以个人机 `192.168.50.21`、打包机 `192.168.50.10`、测试网段 `192.168.50.0/24` 为例。先向维护人领取唯一且长期使用的区服 ID，并把示例地址替换为实际内网地址。给开发机保留稳定的 IPv4。需要 JDK 21、仓库自带的 Maven Wrapper 和已信任的个人服证书，首次签发方法见下节。

开始前，在开发机的项目目录执行 `git fetch origin main`，确认自己要运行的开发分支已包含远端 `main` 的「内网选服」改动。启动脚本编译当前工作树；正在开发的代码可以留在开发机。只更新构建台上的源码镜像不会更新开发机。

1. 在开发机仓库根目录运行下面的命令。启动时按提示输入本机证书口令，保留显示 Spring 日志的终端。`-SharedOrigin` 是同事在浏览器打开的游戏 H5 的来源，例如 `https://192.168.50.10:18082`。

   ```powershell
   .\backend\dev.ps1 personal -Id dev-wang -Name '小王开发服' -Address 192.168.50.21 -Port 18082 -SharedOrigin https://192.168.50.10:18082
   ```

2. 在开发机的管理员 PowerShell 中，为批准的测试网段放行这个个人服的 TCP 端口。把来源网段、地址和端口改成实际值，首次配置一次。个人服使用开发身份登录，访问范围限于获准的内网设备。

   ```powershell
   New-NetFirewallRule -DisplayName 'MXZG 个人服 dev-wang' -Direction Inbound -Action Allow -Protocol TCP -LocalAddress 192.168.50.21 -LocalPort 18082 -RemoteAddress 192.168.50.0/24
   ```

3. 将 ID、显示名称和 `wss://192.168.50.21:18082/api/v1/game/socket` 三项交给打包机维护人登记。启动窗口按 `Ctrl+C` 停服，修改 Java 代码后重新运行启动命令编译。个人数据在 `backend/.local/lan-personal/dev-wang/game.mv.db`，重启沿用；如需备份，先停这个个人实例。

通用内网个人服和共享验收服启动脚本沿用 `local` 配置，默认开启 GM。需要关闭时，可在使用通用入口的进程环境中设置 `MXZG_GM_ENABLED=false`。Hao 的桌面专用入口会显式开启 GM。验收时选中目标区服，进入主城点头像，再点左上角「个人空间」挂牌 10 次。详见[开发 GM](gm-development.md)。

### 首次为个人服签发证书

可使用团队已有的内部 CA 为开发机签发 **TLS 服务器证书**。浏览器使用 IP 连接时，证书 SAN 须包含该 IP；如登记内部 DNS 名称，则须包含对应的 DNS SAN，所有测试设备都要能解析它。下面的三个步骤可用 JDK 21 的 `keytool` 完成。示例只使用 IP。各机器先把 JDK 21 的 `bin` 加入当前 PowerShell 的 `PATH`，例如 `$env:Path = "$env:JAVA_HOME\bin;$env:Path"`。

1. **开发机生成自己的私钥和签名请求。** 从游戏仓库根目录执行，给本机的 `server.p12` 设置口令。把 `dev-wang.csr` 交给维护人，私钥留在开发机。

   ```powershell
   $certDir = '.\backend\.local\lan-personal\dev-wang'
   New-Item -ItemType Directory -Force -Path $certDir | Out-Null
   Push-Location $certDir
   keytool -genkeypair -alias personal-server -keyalg RSA -keysize 3072 -storetype PKCS12 -keystore server.p12 -dname 'CN=dev-wang' -ext 'SAN=ip:192.168.50.21'
   keytool -certreq -alias personal-server -keystore server.p12 -file dev-wang.csr -ext 'SAN=ip:192.168.50.21'
   Pop-Location
   ```

2. **管理员核对申请人及地址后签发。** 有内部 CA 时按其签发流程提交 CSR，取回服务器证书和公开 CA 链。若需单独建立开发 CA，在仅管理员可访问的目录执行以下命令。前两条仅在建立 CA 时执行一次，随后每位开发者只需签发一张叶子证书，并替换 CSR、SAN 和输出文件名。

   ```powershell
   keytool -genkeypair -alias lan-ca -keyalg RSA -keysize 3072 -storetype PKCS12 -keystore lan-ca.p12 -dname 'CN=MXZG LAN Development CA' -validity 1825 -ext 'BC:c=ca:true,pathlen:0' -ext 'KU:c=keyCertSign,cRLSign'
   keytool -exportcert -rfc -alias lan-ca -keystore lan-ca.p12 -file lan-ca.cer
   keytool -gencert -rfc -alias lan-ca -keystore lan-ca.p12 -infile dev-wang.csr -outfile dev-wang.cer -validity 365 -ext 'BC=ca:false' -ext 'KU=digitalSignature,keyEncipherment' -ext 'EKU=serverAuth' -ext 'SAN=ip:192.168.50.21'
   ```

   管理员将公开的 `lan-ca.cer` 和签好的 `dev-wang.cer` 回交开发机。`lan-ca.p12` 及其口令仅由签发管理员保管。打包机现有的门户服务器证书用于提供门户 HTTPS。

3. **开发机导入证书，测试设备信任签发者。** 在个人机 `backend/.local/lan-personal/dev-wang/` 内放入收到的公开证书，执行下面两条命令。先用维护人单独提供的指纹核对 CA；如团队使用中间 CA，按内部 CA 的说明导入完整颁发链。每台访问个人服的电脑或手机还需信任这套 CA 的公开根。Windows 测试账号可运行 `Import-Certificate -FilePath .\lan-ca.cer -CertStoreLocation Cert:\CurrentUser\Root`。

   ```powershell
   keytool -importcert -alias lan-ca -keystore server.p12 -file lan-ca.cer
   keytool -importcert -alias personal-server -keystore server.p12 -file dev-wang.cer
   ```

### 打包机管理员登记与验收

共享游戏进程在 `local` 环境中读取 `mxzg.lan.directory-file` 指定的绝对路径。这是游戏服务的目录配置。首次安装这版共享服务时，在游戏运行目录的 `application-local.yml` 合并下面的属性，按部署位置填写路径，先准备好 JSON 文件，再重启共享游戏实例一次。已有该配置的打包机直接维护 JSON 即可。

```yaml
mxzg:
  lan:
    directory-file: "F:/构建台/data/mxzg/runtime/lan-servers.json"
```

在该 JSON 的 `servers` 数组追加获准的个人服，保留原有条目。没有个人服时用空数组 `[]`。下面是一位开发者接入的完整示例。

```json
{
  "sharedName": "共享验收服",
  "servers": [
    {"id": "dev-wang", "name": "小王开发服", "socketUrl": "wss://192.168.50.21:18082/api/v1/game/socket"}
  ]
}
```

维护人核对 URL、实际运行人和唯一 ID 后，先在同目录临时文件编辑并验证 UTF-8 JSON，再替换原文件。新增或变更地址后，下次读取目录即生效。永久下线时从数组移除条目。临时停止个人服可以保留登记。

支持状态检测的客户端在登录选服时，从访问游戏的设备向目录登记的个人服地址发起匿名 WSS `servers.list`。只有目标在时限内返回已启用且 ID 相符的个人服，页面才允许选择。停服、证书不受该设备信任、网络不通或连接到错误区服都会显示维护。服务恢复后页面会重新检测，个人服失败不阻塞可用的共享服。打包机通过「前端更新」发布包含该改动的 H5 后，团队的共享页面即可使用。

验收时在另一台内网设备打开共享游戏 H5，进入选服页，选择个人服登录，再刷新页面并核对恢复到原服。退出账号后选择共享验收服，核对共享角色。若个人服单独连不上，先在同一台测试设备上检查开发机端口、证书信任和 SAN，再核对开发机的 `-SharedOrigin` 是否与浏览器地址栏的协议、主机及端口一致。若列表中缺少新条目，刷新页面并核对共享服务加载的目录路径和 JSON。

## 共享服和个人服清档

打包机管理员双击桌面「MXZG 一键清档共享服」处理 `local-1`。开发者在运行个人服的机器上进入仓库的 `scripts/server-reset/`，首次从 `personal.example.json` 复制一份 `reset.json`，按本机路径和区服 ID 配置。先运行只读预览核对数据库，再双击 `Reset.cmd`。完整命令、备份位置和恢复步骤见[通用清档工具使用说明](../scripts/server-reset/README.md)。

## 打包机启动与换机

在当前打包机登录 Windows 后，双击桌面「MXZG 内网一键启动」。也可以双击独立安装目录的 `start-all.cmd`。启动器恢复门户和已部署的 MXZG 游戏、检查连接并打开网页。服务已运行时，再次双击会沿用现有进程。独立安装目录的 `README.md` 说明了如何配置项目和管理注册申请。

换机时，由维护人交接项目配置、账号、任务记录、发布产物和证书，停止旧游戏实例后再复制 H2 测试库。开发机只需取得新入口及 CA 公开证书。验收时分别核对门户中的前后端提交号和 H5 实际登录结果。
