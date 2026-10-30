# 2026-10-30：登录、选服、切页、背包和战斗验收

> 历史记录：客户端当前标准以 [architecture.md](architecture.md) 和 [背包标准模块样板](bag-mvc-maintenance.md) 为准。背包已迁入 features/Bag，采用完整名称、BaseModel/BaseController 和单一全局 EventDispatcher；下方旧目录/开关/分层不再作为现行要求。指定核心流程的正式服视觉、交互和规则对照目标继续有效。

本批对应 10 月 29 日提供的两段视频。日服正式服用于对照流程、比例与切页方向；已有迁移资源和预制体继续复用。此版本是开发联调闭环，最终美术、完整战斗规则与三端发行仍按主计划推进。

10 月 30 日后续已完成独立 H5 构建和基础流程验收，阻断 7456 后两条实际点击路径均为 0 错误；最新检查为客户端 23/23、后端 24/24。下方历史检查数以 [开发进度](development-progress.md) 的当前快照为准。启动、重启、构建细节见 [本机工作流](local-remake-workflow.md)。

## 现在怎么打开

1. 双击 `F:\project\mxzg\scripts\start-remake-backend.bat`。默认 API 为 `http://127.0.0.1:18080`。检测到可用重做后端时输出 READY 并复用；未知端口占用或旧版接口会提示。修改后端后用 restart-remake-backend，另有 stop/status 入口，均核对本项目进程归属。
2. 已有 H5 构建时双击 `scripts/start-remake-h5.bat`，浏览器打开 `http://127.0.0.1:18081/`，可关闭 Creator；修改客户端后先用 build-remake-h5 重建。编辑时也可以在 Creator 3.8.8 打开 `client`，等资源导入完成后预览 `assets/scenes/Remake.scene`。不要进入旧 Boot/Main 路线。
3. 等资源/配置加载完，停在登录页。点击服务器条打开“本地开发区”，选择开发一服或开发二服。它们是同一个本机后端里的两个独立角色空间，不代表两套已部署的正式游戏服。
4. 点击开始游戏进入主城。右上“开发账号”可输入 3–32 位英文/数字/下划线/连字符，或清除保存身份后换账号。相同账号在同一服恢复相同角色，切到另一服获得独立角色。
5. 底栏可进入英雄、背包、战斗。副本、公会、VIP 等仍锁定。

没有网页管理后台。当前登录是本机开发身份，正式渠道登录另有任务。

## 10 月 30 日补充说明

按新增的 14-15-35 正式服视频，现已将底栏战斗接为挂机入口，并经过真实阵容读取/选择/保存进入主线，结算后恢复挂机。跑步、双图背景、停步遇敌和右侧入场已复用接入；完整技能、挂机收益仍未完成。当前 H2 为开发文件库，MySQL 仍需独立验证。

## 五项要求的结果

### 1. 加载页与登录页大小跳变

仍使用两个 Prefab：`LoadingLayer` 管加载进度/阶段/重试，`AccountLogin` 管账号、选服和开始按钮。两者共享 `LoginLayout.ts`：背景用同一张 768×1300 图片做 cover，人物统一按可见宽度 / 770 缩放，竖直位置统一为画面中心上移可见高度的 5%。移除了加载人物固定 0.7 缩放的差异。

保留实际加载任务、进度条与渐隐。恢复会话只准备身份，玩家必须点开始才能进城。设计分辨率继续 640×1280；本批没有擅自切换到 720。

### 2. 登录接选区、选服

服务器目录来自 `GET /api/v1/servers` 和数据库。复用 `ChooseServerLayer` / `ChooseServerCell`，区名、服名、开关与状态由真实目录驱动，保存最近选择。Start 在身份校验和角色初始化结束前不可连点。切服沿用实际开发账号，不回落到默认 player_1。

服务端以账号 + server_id 区分角色；原有角色默认归开发一服，迁移不清库。首登的三名英雄、自动阵容及经验材料是明确的一次性初始化规则，并发 Start 不会重复发。已存在的英雄/阵容保留。

### 3. 七个底栏按钮与切页

按钮间距使用日服公式：可见宽度 × 0.9 / 7；选中按钮为普通按钮的 1.5 倍，并有上浮。保留原来的图标、文字和锁。

页面按底栏左右顺序做 280 ms 指数缓出，只有内容移动，顶底栏保持常驻。连续点击会取消过时加载/动画并清理旧页。尚未接业务的按钮不打开空壳。

### 4. 数据库到底接了没有

已经接入。当前是 H2 **文件数据库** `backend/.local/game.mv.db`，保存角色、会话哈希、英雄、阵容、背包、关卡与战报。它不是内存假数据，也不是原 Java 8 服务器的 MySQL。

local 使用 `WRITE_DELAY=0`，每次提交立即写盘。黑盒测试实际启动 jar、初始化角色并创建战报，然后两次强制结束/重启 Java：未领取战报、会话、角色 ID、背包、金币与关卡都保留；重复领取不重复发奖。测试使用独立随机文件和端口，不改现有角色。

MySQL 的迁移/并发/备份恢复仍是 P3-03/P3-06，未把 H2 验证当成正式数据库验收。不要删除 `.local` 来更新服务器，也不要把数据库文件提交 Git。

### 5. 背包与战斗接通

背包：真实库存查询、装备/道具/碎片/精灵分类、数量、图标、名称和详情，查询失败可点击分类重试。领取战斗奖励后再打开背包能看到新数量。道具详情目前“确定”关闭；使用/分解/消耗尚未开放。

战斗：先进入挂机跑图，点击战斗打开既有 HeroSelectLayer，确认保存当前账号阵容后进入主线；服务器按拥有的阵容计算战报、Spine 普攻/受击表现、加速、右上角跳过、胜负结算、领取奖励、金币刷新、背包入库和关卡推进。战报先保存再播放，离开或刷新后可继续领取；客户端不上传胜负或奖励，服务器在事务中结算并防止重复领取。

当前规则版本为 `basic-attacks-v1`：15 回合内按速度排序普攻，读取原表的英雄基础 HP/攻击/防御/速度及前 20 关的敌方和首通奖励。它尚未实现完整日服技能、等级成长、战斗平衡、挂机收益与养成。角色经验会入库，但等级成长尚未开放。不要把这一轮基础闭环当成完整玩法还原。

## 明天按这个顺序验收

1. 刷新：能看加载进度，加载与登录的人物大小一致，加载结束停登录。
2. 选服：点击服务器条能选区/选服，关闭后显示所选服；同账号换服资料独立。
3. 开始：点一次进入主城，连点不重复初始化；退出/刷新后仍先停登录。
4. 连点主城 → 英雄 → 背包 → 战斗 → 主城：按钮比例、方向和缓动自然，顶底栏不跟内容滑走，无旧页覆盖。
5. 背包：新角色能看到初始化材料，四种分类可切，道具详情显示名称/数量/说明。
6. 战斗：先检查挂机跑图/停步遇敌/击杀恢复，点战斗可取消出阵，重新打开并确认保存后，第 1 关可播放、加速、跳过；结算只展示实际结果和服务器奖励。第 1 关领奖后金币 +4000，关卡到 2，经验材料等同步进背包。
7. 结算前刷新，再进入战斗：能恢复同一份未领取战报；领取后刷新不再重复加钱/材料。

## 技术验证与复跑

- 客户端：`node client/tools/check-project.mjs`，最新 22/22；Creator 引擎声明 strict 类型检查通过。esbuild 可由 `MXZG_ESBUILD_MODULE` 指向现有离线依赖。
- 后端：`powershell.exe -NoProfile -ExecutionPolicy Bypass -File backend/dev.ps1 -Action package`，24 项测试及打包通过。
- 强制重启：打包后 `python tools/test_backend_restart.py`。只创建独立测试数据库；诊断日志在 `backend/.local/database-restart-check.log`。
- 实际预览：运行后端和 Remake 预览后 `node client/tools/check-remake-preview.cjs`。需要已安装 Playwright 和 Chrome，`MXZG_PLAYWRIGHT_MODULE` 可指定现有 Playwright 模块路径。脚本创建普通开发测试账号并实际点击原 UI，不操作 Creator 窗口；`--direct-battle` 额外验证不先进入英雄/背包，直接进入挂机与出阵的配置加载路径。
- 实测尺寸为预览中的 iPhone 14 Pro（393×852）；截图输出到 `client/temp/project-checks/night-*.png`，其中 servers、home、bag、battle、result、claimed、item-detail、restored-login 和 restored-battle 可对照查看。
- 本轮未完成 App/微信小游戏样包、MySQL 运行验收与所有屏幕比例；最终视觉仍需你确认。

## 维护入口

- 统一装配：`client/assets/scripts/app/remake/RemakeApp.ts`。
- 登录与区服：`features/account/AccountController.ts`、`ServerSelection.ts`、`ui/ServerPickerView.ts`。
- 背包：`features/backpack/InventoryController.ts`、`InventoryApi.ts`、`ItemCatalog.ts`；既有 BackpackView 通过注入数据源继续复用。
- 战斗：`features/battle/CampaignController.ts` / `CampaignApi.ts`，View 与 CampaignField 只负责表现；后端 campaign 包负责规则与事务。
- 配置来源：`python tools/export_campaign_rules.py` 校验投影，明确检查后用 `--write` 重建服务器规则文件。
- 下一阶段先完成独立 H5 预览、完整挂机/出阵/主线路线，并提前做 MySQL 验证；再接养成与技能。固定任务号见实施路线 P3–P5/P7。
