# 公会成员与大厅玩法

角色达到 18 级且所在区服世界等级达到 1 后，可以从底栏进入公会。未入会时显示「推荐、创建、查找」三个页签。点击「加入」直接提交申请。入会后显示公会大厅与可滚动公告，成员和申请列表各自打开独立窗口，退会在成员窗内二次确认。

## 规则

- 创建扣 100 钻石。创建者是该公会的首位成员和会长，一级公会容量为 15。公会名称在所属区服内唯一。
- 建会表单初始随机选中一枚原版徽章，可从徽章窗更换。选中的编号随建会事务保存，并在推荐、搜索与大厅复用。V52 为现有公会保存原版 00 徽章。
- 公会名按负责人确认的日服服务端上限 64 校验。当前策划表和日服旧界面上限均为 25。同一套角色名称校验计算显示长度，ASCII 和 Latin-1 字符计 1，其余字符计 2。客户端展示服务端给出的公会名上限。
- 入会必须经审批。申请通过后，服务端清理此角色在其他公会尚未处理的申请。公会列表只搜索当前区服。
- 通常成员可主动退出，两小时期限过后才能重新申请。仍有其他成员时会长不能退出。会长独自退出会解散公会。
- 会长可编辑、清空公告，保存后按原公会通知流程刷新在线成员，重登读取服务端的已存公告。普通成员保留只读权限。
- V61 保存公会等级和本级经验。新公会从 1 级、0/750 经验、15 人起步；门槛与容量取旧等级表，公会捐献提供经验。

依据为项目旧服务端 `ClanHandler` 的创建、申请、审批和退出入口，以及 `ClanService` 的容量、申请清理和冷却检查。开放条件和初始容量使用策划表投影，由 [export_guild_rules.py](../tools/export_guild_rules.py) 生成并检查。公会变更和个人空间同步见[通信契约](network-contract.md#公会成员与申请)。

## 代码入口

| 职责 | 入口 |
|---|---|
| 推荐、查找与大厅 | [GuildView](../client/assets/scripts/features/guild/ui/GuildView.ts) |
| 建会与徽章选择 | [GuildCreateView](../client/assets/scripts/features/guild/ui/GuildCreateView.ts)、[GuildBadgePickerView](../client/assets/scripts/features/guild/ui/GuildBadgePickerView.ts) |
| 名称、宣言与查找名称编辑 | [TextInputView](../client/assets/scripts/features/common/ui/TextInputView.ts) |
| 成员、退会与审批 | [GuildMemberView](../client/assets/scripts/features/guild/ui/GuildMemberView.ts)、[GuildApprovalView](../client/assets/scripts/features/guild/ui/GuildApprovalView.ts) |
| 公会状态与已认证请求 | [GuildController](../client/assets/scripts/features/guild/GuildController.ts)、[GuildModel](../client/assets/scripts/features/guild/GuildModel.ts) |
| 准入、扣费及成员事务 | [GuildService](../backend/src/main/java/com/funsgamex/mxzg/guild/GuildService.java)、[V51 成员迁移](../backend/src/main/resources/db/migration/V51__guild_membership.sql)、[V52 徽章迁移](../backend/src/main/resources/db/migration/V52__guild_badge.sql) |
| 公会商店 | [GuildShopService](../backend/src/main/java/com/funsgamex/mxzg/guild/GuildShopService.java) 扣除勋章、校验个人周限购并发放物品 |
| 捐献与贡献宝箱 | [GuildDonationService](../backend/src/main/java/com/funsgamex/mxzg/guild/GuildDonationService.java) 结算个人捐献、公会经验和每日贡献 |
| 公会科技 | [GuildTechnologyView](../client/assets/scripts/features/guild/ui/GuildTechnologyView.ts)、[GuildTechnologyService](../backend/src/main/java/com/funsgamex/mxzg/guild/GuildTechnologyService.java)、[V82 科技迁移](../backend/src/main/resources/db/migration/V82__guild_technology.sql) |
| 本服公会排行 | [GuildRankingService](../backend/src/main/java/com/funsgamex/mxzg/guild/GuildRankingService.java) 汇总成员历史战力并返回本会名次 |

公会副本、世界 Boss 与公会战的旧版入口、先后顺序和多人验收见[项目总计划](restructuring-plan.md)。

## 公会科技

成员从大厅右上方的科技卡片进入，可切换战士、法师、牧师和坦克。依序点亮六边形科技树的六格，保留各职业累计属性，重置只清除所选职业。逐格成本、末格属性和重置档位来自旧 `clanskillbase`、`clanskillability`、`clanskillresetgem` 和 `system`，其中战士、法师第六格为增伤，牧师为减伤，坦克为免控。[规则导出器](../tools/export_guild_technology_rules.py) · [通信契约](network-contract.md#公会科技)

正式服的科技说明写明退会暂停加成并保留进度，早期 `ClanReceivers` 直接读取个人科技。11 月 26 日按负责人确认使用正式服规则。升级和重置时按职业重新计算实际英雄属性，主阵战力投影、统一资产快照与新开战斗使用相同属性输入。建会、审批入会和退出也立即更新当前战力。[在线状态与战斗验证](development-progress.md#11-月-26-日公会科技)

## 日服布局对照

日服项目的 `web-jpn/jp-overlay/src/layer/clan/ClanLayer.lua` 定义了三页签、独立成员与申请窗口和大厅切换，原 `ClanUncreateLayer.ccb`、`ClanInfoLayer.ccb`、`ClanMemberLayer.ccb`、`ClanRankLayer.ccb` 提供布局。背景与配乐复用项目已有 `maps/ui/map-bg-clan-1` 和 `audio/clan-1`，大厅标题、入口和徽章使用本项目原图。审批及成员行显示服务端的昵称、等级、头像和头像框。

名称、宣言和查找名参考日服 `web-jpn/build/jp_input.js` 的共用输入浮层：点击字段时打开独立输入窗，取消不改值，确认只回填目录页的草稿。查找仍需另点「查找」，建会仍在原按钮发起并由服务端扣费。默认宣言仅用于展示和首次编辑预填，未确认编辑时不作为公告写入。新版沿用已确认的公会名上限 64 和稳定分页，不照抄旧 Lua 的 25 或旧推荐列表的随机排序。

大厅按旧版放置左侧等级、经验、人数和右侧宣言卡，成员可打开公会科技、商店、捐献和排行。任务、首领、公会战和历史仍为灰态。公告编辑复用现有单行浮层。成员窗显示人数、头像、等级、职务和当前主阵容战力，黄底标本人。在线状态、成员贡献列、自动接任与成员职务菜单待接入。申请名单由会长查看。

商店复用原有三列卡片和周限购。原 `shopclan` 的 17 个货位中，16 个可兑换。精灵 `2000003` 的实例规则尚未接入，原货位显示「暂未开放」。捐献每天选一个档位，`20,000` 金币、`100` 钻石或 `300` 钻石分别获得 `100/250/800` 公会勋章和 `50/100/200` 公会经验及每日贡献。日贡献积满 `1000/2000/3000` 开放三个可个人领取的宝箱。公会排行显示本服前三、前百名单和本公会名次。旧服务按战力更新时间打破同分，新版使用已有的公会创建时间及 ID 作为稳定顺序。

## 验证

隔离 H2 的公会、WebSocket 与角色资料专项共 46 项通过。两个真实连接走通建会、扣款重试、查找、申请、审批通知、重连首包以及退会后的公会名清除。独立 MySQL 8.4 应用从含旧角色数据的 V3 迁移到 V51，完成查找、建会和申请审批。应用重启后再次确认成员关系、扣费去重和统一快照，再验证退会。

结构检查覆盖三页签、徽章窗、公会大厅、成员窗和审批窗。独立 WebSocket 与 H2 领域回归共 8 项通过，覆盖徽章创建、查找、重登、旧请求与编号越界，以及名单头像字段。MySQL 8.4 的 V52 迁移、建会与重启后徽章恢复通过。

切页清理修复后，已重跑隔离双角色 WebSocket 和公会客户端回归。查询在途时切走，迟到回包与重连消息不会继续查询，重开时读取新目录。Creator 独立 H2 预览用两个 18 级角色走通建会、查找、申请、会长在背包页收到审批红点、审批窗冻结与恢复后切页、批准后红点熄灭、成员窗退会与冷重登。个人空间在加入后同步公会名，退会及重登均显示「未加入」。物理设备前后台和超长公告未在此样本覆盖。
