# 角色基础资料契约

更新：2026-11-03。本批只恢复基础数据和只读同步；不开放其他玩法，也不将开发登录视为正式渠道登录。

## 原项目依据

旧源码根目录：`G:/work/FsGame/Demo/mj/program`。

- `mxzg-protofiles/protofiles/game/Role.proto`：2001 GResRoleInfo 定义角色资料；2003 修改昵称；2014 角色升级通知。协议声明字段不代表服务端一定赋值。
- `server/mxzg-server/mxzg-gameserver/src/main/java/com/ayjs/mxzg/gameserver/module/role/handler/RoleHandler.java`：getRoleInfo 从角色及关联服务填充 2001；创建/最后登录时间从毫秒转为秒。
- 同目录 `LoginHandler.java`：创角采用 InitUserSysCache 的 level/exp/cup/gold/gem；形象以首抽英雄 star 与 type 拼接；头像/头像框保留初始 0。
- `server/mxzg-server/mxzg-config/src/main/java/com/ayjs/mxzg/config/excel/cache/InitUserSysCache.java`：初始化表行 1–5 对应 gem/gold/exp/level/cup；可选行 6 为初始奖励，不能混同余额。
- `server/mxzg-server/mxzg-gameserver/src/main/java/com/ayjs/mxzg/gameserver/module/role/service/RoleService.java`：addExp 使用 mainlevel 本级门槛，跨级扣除门槛，满级经验清零，并发送 2014 与奖励。本批尚未恢复经验获取、升级和奖励。
- 旧客户端 `client/cocos_mxzg/client/idle/src/net/RoleResponse.lua` 在登录确认后请求 2001，再请求背包 5001；新版按已确认方案合并为统一初始化。

## 本批字段映射

| 旧字段 | 新角色字段 | 含义与来源 |
|---|---|---|
| nick / level / gold / gem | nickname / level / gold / diamonds | 保持现有身份与钱包 |
| exp | basics.experience | 角色本级经验，持久化，不是英雄经验 |
| cup | basics.cup | 奖杯；新角色按 inituser 初始 1000 |
| head_id / image_id / border_id | basics.headId / imageId / borderId | 三个不同资源身份；0 表示尚未设置 |
| lang | basics.language | 新版当前简体中文 1；不等于区服语言配置 |
| create_time / last_request_time | basics.createdAtSeconds / lastLoginAtSeconds | 服务端 Unix 秒；显式登录更新最后登录，网络恢复不更新 |
| mainlevel.exp（派生） | basics.experienceToNextLevel | 当前等级经验门槛，满级 0，不是客户端计算结果 |

当前共享导出 inituser 为等级 1、经验 0、金币/钻石 0、奖杯 1000；mainlevel 等级 1 门槛 120、等级 2 为 360、最高 300。system.first_ordinary_lottery=10304012，herotype 对应星级 4，因此初始形象为 410304012。已逐行比对旧客户端 config/mainlevel.lua 与共享 JSON：全部 300 级经验门槛一致。后端构建直接打包这四张共享导出表，启动严格检查必需配置，不重复手写数值。

V8 为 game_role 增加基础列。已有新版记录保持原 ID、等级和钱包；新增字段无历史证据时保留 0（语言默认 1），不能重置成新角色或伪造创建时间。本批迁移只在隔离测试库验证，日常库尚未应用。

## 通信与阅读路径

`session.login / session.authenticate / state.changed → 整包校验 → AssetStateBinding → RoleController.onNotify → AccountModel.role → 订阅事件 → View`。

保持 WS＋Protobuf，Role.basics 使用新字段号 7，未复用旧号。没有增加 role.info 查询或写属性接口。后端读取持久角色基础资料并派生等级门槛；资料变更与 revision 在同一角色锁事务内提交，事务提交后由已有统一同步链推送。角色资料与背包校验失败时不得部分更新。

当前主城账号资料增加经验行；头像资源显示与正式服角色详情尚未验收，不能将形象 ID 冒充头像。basics 缺失时显示“未同步”，未知时间不显示为真实日期。

## 明确缺口

正式渠道身份、创角命名与性别、初始奖励、完整角色详情、头像/头像框选择、改名、经验获取/升级奖励、战力计算、VIP/充值、公会、新手进度、神权/尊贵/称号等未完成。旧协议中未见实际赋值的字段不自行补假数据。以后逐项核对源码、配置及正式服效果，本批不恢复其他模块入口。
