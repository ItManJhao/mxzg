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


## 2026-11-03：角色详情差异核查

本节依据旧源码与当前资源，不把代码核对描述为正式服画面已验收。

| 对照点 | 旧实现与证据 | 当前差异与下一步 |
|---|---|---|
| 主城经验 | MainSceneCtr.setExp 使用 mainlevel.exp 绘制进度条，显示等级 | 当前仅账号信息框显示经验数值；进度条视觉尚未还原 |
| 自身资料入口 | MainSceneCtr.onRole 打开 SettingCtr / SettingLayer.ccbi | 当前账号信息框是阶段实现，不等价于旧设置页 |
| 自身资料内容 | SettingCtr.initData 显示昵称、角色 ID、等级、公会；setHead 显示头像及头像框 | 当前缺头像、头像框与旧版布局；公会依赖暂停模块，不填假值 |
| 出战英雄 | SettingCtr.updateHeroList 读取章节阵容，排除援助位，点击请求英雄简介 | 英雄与阵容尚暂停；本批只记录依赖，不启动 |
| 公开玩家资料 | RoleInfoCtr / RoleInfoLayer.ccbi 使用 2004 GResPlayerDetaile，显示区服昵称、奖杯、战力、公会、阵容与英雄 | 与自身设置页是不同窗口；当前未恢复 2004，不应借此增加自身重复查询 |
| 社交按钮 | RoleInfoCtr 按本人、同服/跨服、好友状态决定好友/私聊/切磋/黑名单按钮 | 依赖好友、聊天、战斗，保持暂停 |
| 外观选择 | SettingChooseCtr 的头像使用 HeadPortrait 协议；头像框用 32001/32002/32003；2011 GReqRoleChangeHead 实际传 image_id/skin_id | 协议名称不能作为字段含义依据；当前只持久化选中 ID，未实现解锁与选择 |
| 二次改名 | ChangeNickCtr 优先使用 consumption_props，否则 nick_change_cost；发送 2020 GReqRoleRename。RoleHandler.renameRole 校验名称、类型、重复并服务端扣费 | 2003 创角相关命名与 2020 二次改名要区分；本批不开放改名，不绕开背包禁用操作 |
| 其他设置 | SettingCtr 按渠道开关显示省市，还连接称号、形象及高级设置 | 逐项核对后恢复，不直接照搬另一项目内容 |

当前仓库已有 `client/assets/prefabs/ui/setting/SettingLayer.prefab` 与 `client/assets/prefabs/ui/role/RoleInfoLayer.prefab`，仅存在资源不代表布局、绑定和交互已验收。本批不改名、不重建 UUID、不启用窗口。后续先恢复自身资料只读布局与已具备字段，再按旧条件恢复写操作；公开资料及关联玩法独立排期。


## 2026-11-03：正式服截图对应的只读详情实现

用户提供的 [顶部栏](images/role-formal-header-reference.png) 与 [自身资料页](images/role-formal-profile-reference.png) 是本次效果依据。详情使用原 SettingLayer 的背景和图标，保留 UUID `1aedb5a3-4e33-552f-843c-c419fd8174a4`，改名为 `RoleProfileView.prefab`，与绑定的 View 一致；未改动公开玩家资料 RoleInfoLayer。

- 顶部头像和头像框使用 `headId`、`borderId`；旧资源 head-icon_0 是真实默认头像，不能把 0 理解为不显示。头像资源与英雄图标分开登记，形象仍由 imageId 表达，不混用。
- 头像点击打开资料页，关闭回到原页面；主城和背包共用同一入口。资料由 HomeController 的唯一账号订阅经 RemakeHomeView.render 注入，不新增角色查询，也不复制 Model。
- 详情显示真实昵称、完整字符串角色 ID、等级、头像与头像框。公会写“暂未同步”，英雄区写“英雄展示暂未开放”，不伪造未加入公会或三名英雄。
- 头像选择、改名、形象和称号按钮只显示未开放提示。原有退出登录保留在“设置 → 退出登录”，点击设置本身不会退出，也未接入新设置模块。
- 删除临时 AccountButton/AccountPanel 和对应 Home 绑定。预制体静态保存头像 Face/Border、遮罩、详情布局与设置面板；运行时只更新资料、适配整体大小和绑定事件。
- 旧文字导入乱码与 0.5 倍缩放在预制体中修正；原背景包含“个人空间”标题，不额外叠印标题。只读阶段不恢复英雄阵容、公会、战力或其他玩法。
