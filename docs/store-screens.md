# 英雄、背包、主线和战斗读哪里

界面读 `GameStore`，展示名读 `client/assets/resources/config` 里已经导出的 JSON。Boot 在 `bindConfigTables` 里登记。表没读到时，句子退回原来的字段号或 Mock 名字，不编一条。

协议怎么灌进商店，见 `docs/local-link-and-store.md`。这里只写屏幕。

| 屏幕 | 商店 | 配置 | 空和未同步 |
|------|------|------|------------|
| 英雄（真服 `WireHeroPage`，Mock `HeroPage`） | 4001 名册：`heroId`、`heroType`、`level`、`star`、`fighting`。Mock 还有会话里的名字和武器等级 | `herotype.note` 名字，`skill_1`…`skill_5` 经 `heroskill` + `language` 成技能名，`herobase` 按类型和星级给生命、攻击、防御、速度。`item_id` 为 0 的头像走 `item.icon` | 真服还没 4001：`真服英雄未同步`，格子改画图鉴。4001 是空数组：`空名册`，同样改画图鉴。有英雄只画名册。Mock 商店是空数组时英雄页也走这句图鉴 |
| 背包（真服 `WireBagPage`，Mock `BagPage`） | 5001 整表，5002 改数量：`itemId`、`itemType`、`num`。Mock 用会话数量 | `item.idx` 先对 `itemType`，再对 `itemId`。名字是 `item.name` 对 `language`。`backpack/` 用 `ui/bag/backpack_<idx>`，`hero-icon/` 用 `ui/hero/hero-icon_<文件名>` | 真服还没 5001：标题 `背包 · 真服未同步`，格子是空框。空表：`背包 · 空背包`。对不上表仍写 `item_id` / `item_type` / `num`，缺的数不写成 0 |
| 主线 | 真服 3007 的 `nowIdx` / `maxIdx`，最近一帧 3001。Mock 用 `stageId` | `chapter.idx` 写成「第 chapter_id 章 · 第 mission_id 关」。`mainlevel.level` 写成「等级经验 exp」 | 两个 idx 都没有仍是「未同步」，不打开 Mock 关卡页。表对不上就不补章节名 |
| 挂机站场 | 真服 3101 的 MAIN，经 4001 的 `heroType` 对皮肤 | 皮肤套名就是英雄类型号 | 没有 MAIN 英雄时仍是默认三套。Mock 没有 3101，不拿 10001 换掉这三套 |
| 挂机「战斗」到 BattlePage | 真服挑战仍发 3001，播商店里的最近一帧。战报没有我方英雄时，用上面的 MAIN。战报已有英雄时，用名册 `heroType` 对同一套皮肤 | 守方位置空、并且 `chapter.idx` 的 `hero_type` 有 stand 时，用这只怪。技能名和拍子仍走原来的 `heroskill` / `effect2` / `system` | 没有 report 仍 Toast「真服未同步」。没有 stand 的怪不替换默认敌方套 |
| Mock 简化战报 | 名册前三名当我方卡 | 当前关卡号对上 `chapter.idx` 时，第一只怪换表内名字。血量在调用方传入 `herobase` 时才改 | 商店还没名册时，我方第一格仍是角色名，敌方仍是「前锋」 |

主城「主线」按钮在原来的 idx 句子后面，表对得上时再加章节名。`GameStore.mainlineLabel()` 本身不改，避免把「第 N 关」和「当前 / 最高」写乱。

## 知道但没在这里编

- 空号挑战会试 c2s 2015 / 3100。服上 GM 关着时没有英雄回包，主线页仍 Toast「GM 未开」。本页不造一名假英雄。
- 3013 仍不发。快速战斗只读 3012。
- 「我要变强」没有专属协议，底栏仍打开已有的 `HeroSuggestLayer`。
- Mock 起步英雄（光耀骑士等）和起步道具不在 `herotype` / `item` 里。名字留会话原文，不硬套表里的第一行。

英雄列表、背包格子、挂机底栏、出阵和挂机上的战斗条，见 `docs/ui-1to1-hero-battle.md`。列表不再只留壳，也不再停在 16 格。

挂机底栏的三格和 Mock 领取都读 `chapterreward.reward_base`。`item_num` 按每分钟用：第 1 关是金币 200、角色经验 10、英雄经验 25。当前关 = 已通关 + 1。`system.idle_max_time` 是秒，基础封顶 21600。随机掉落按 `drop_group` 把物品画在掉落堆下面，每隔 `idle_drop_frequency`（60 秒）只是说明文字，不掷一次，也不写进这三格。VIP 等级不在已核对的 s2c 2001 字段里，条上不写「VIP未同步」，不把 `vip` 表的百分比乘进去。`idle_speed_up`（7200 秒）是快速战斗壳上的两小时预览，不发 3013，也不发放。强化石仍按旧间隔进背包。表没绑上时金币退回每分钟 6、每关 +4，封顶 8 小时。

图鉴、星UP、宝石、神装、圣龙从 `herotype` / `herostar` / `jeweltype` / `godequipment` / `dragonlevel` / `dragonrelic` 画。背包里对得上 `item.idx` 的算持有，对不上就锁。不往名册里塞假英雄。4001 还没到或是空数组时，英雄页改画这张图鉴，格子保持上锁。圣龙四只共用图鉴标，不用 `dragon_identify` 光效当立绘。s2c 59001 带了 `attr_level` 才在标题写等级。
