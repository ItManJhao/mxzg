# login、account 与旧登录入口

核查：2026-10-29。

## 当前职责

- `prefabs/ui/account/AccountLogin.prefab`：重做版唯一的玩家登录页面。Remake.scene 的 loginPrefab 显式绑定它，由 AccountController/AccountService 驱动；点开始且校验成功才进入主城。
- `prefabs/ui/login/`：共用的加载/更新、公告、选服、错误、角色初始化组件。它不是另一套正在运行的重做版账号逻辑。
- `prefabs/ui/legacy-login/`：本次从 login 分离的两个旧入口 LoginPanel、UserLoginLayer，仍服务于 legacy/Boot 的核心兼容对照。LoginPanel 同时是已复用按钮/输入框美术的原始参照。
- `scripts/features/account/`：新的账号 MVC、会话服务与显示逻辑；目录按功能命名为 account，并不是额外的游戏登录入口。
- `scripts/ui/LoginPanel.ts`、`p1Login.ts`：旧链路适配；不由 RemakeApp 引入。

## 是否重复

玩家登录这个职责曾有新旧两种实现并存；并非两个完全相同的 Prefab 文件，但放在同一 login 目录容易误认为当前应维护两个登录页。本次将旧入口物理隔离，未删除仍被旧 Boot 加载的文件，也没有为了合并目录把旧协议接入新入口。

两个旧 Prefab 与 .meta 成对移动，资源 UUID 保持不变；旧加载常量、UUID 回退、保留计划、清理清单和美术对照检查同步更新。90 项保留数量不变，之前 517 项删除记录不受影响。

后续改重做版登录时，只编辑 AccountLogin、AccountLoginView、AccountController 和 AccountService；共用加载画面看 LoadingLayer/BootChrome。旧入口在新核心路径完成验收、不再需要旧 Boot 对照之后，由 P9-04 一并移除；不再向旧入口扩展新功能。

启动检查已增加对 Remake.scene 登录 UUID 的验证，防止未来意外绑定回旧登录页面。实际 Creator 预览仍需编辑器完成资源移动导入后确认。
