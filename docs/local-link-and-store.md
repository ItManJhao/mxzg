# 本机联通和客户端数据存储

预览默认连本机游戏服。角色、主线、背包、阵容只从 s2c 灌进 `GameStore`。Mock 会话和本机快照播种只在 `?dev=mock` 时打开。服没开时停在登录页「服未启动」，不进 Mock 主城。

## 先把服和桥开起来

1. 双击一次 `scripts/start-local-all.bat`。它会另开窗口跑游戏服（TCP **9902**），再跑 `scripts/start-ws-bridge.bat`（`ws://127.0.0.1:13111/game`）。
2. 桥窗口应出现「正在听 ws://127.0.0.1:13111/game」和「TCP 127.0.0.1:9902 可以连接」。两个窗口都留着。
3. 游戏服读的策划表是 `F:\project\mxzg\config\gameconfig`（仓库里的 `config/gameconfig`）。角色落在本机 MySQL，不在客户端。`server/` 是 junction，不在 Git 里。端口和路径见 `docs/server-local-run.md`。
4. 不要连游戏服自带的 **13101**。那口能握手，但不回这套帧。

只拉了客户端代码时，刷新预览即可，不必重启服和桥。

## 预览怎么选传输

| 方式 | 结果 |
|------|------|
| 不加查询 | 连 `ws://127.0.0.1:13111/game`。打开后发心跳 **1004**，点进入游戏发登录 **1001**。 |
| `?transport=ws` | 与不加查询相同。 |
| `?transport=auto` | 先用约 1.5 秒短连本机桥。没接上停在「服未启动」，不进 Mock。 |
| `?dev=mock` 或 `?transport=mock` | 显式打开 Mock。默认关。上次记住的 `transport=mock` 不会单独把预览拉回 Mock。 |
| 「改走 Mock」 | 只有地址已经带 `?dev=mock` 时才出现。 |

地址示例：`http://127.0.0.1:7456/?transport=ws`。安全区可以写在一起：`?transport=ws&safe=88,0,34,0`。

记住的键是 `mxzg.transport`，只有 `mock` 或 `ws`。不存密码，不存 token。账号和服务器仍是 `mxzg.account`、`mxzg.serverId`。

`TransportConfig.defaultKind` 是 `"ws"`。

## 数据放在哪

`client/assets/scripts/core/GameStore.ts` 是这一局的角色数据。

- 真服：`WireSession` 在进主城清空上一名角色时，以及每次 s2c 落地后，把同一份数抄进 `GameStore`。`Session.source` 不是 `wire` 时不动 Mock 那一份。
- Mock：`MockTransport` 每次回包后，用 `MockGameSession` 里当前可见角色填一份。
- 顶栏钱包文案仍走 `Session`（`formatGoldLine` 等）。`GameStore` 不改那些句子。
- 刷新：真服角色在游戏服 MySQL。客户端另存 `mxzg.roleCache`（不含密码、不含 token），登录页用来提示「上次真服 … 进入后以服务器回包为准」。进主城后以新的 s2c 为准。
- Mock 刷新：同一账号再登录时，`MockGameSession.restoreClientCache` 把上次的金币、关卡、英雄、背包接上。创角会把这份进度清成新号。

主城「主线」按钮、Mock 挂机/主线的下一关、真服主线页的 idx 和最近一帧 3001、真服挂机页的 3004 时间、真服挂机站场，都优先读 `GameStore`。真服站场在 3101 / 4001 还没到时仍用原来的默认三套，不用 Mock 的 10001 那三名。

英雄、背包、主线文案和战斗站场再读配置表。哪一屏读哪些字段，见 `docs/store-screens.md`。

## 哪条协议灌进哪一格

| 协议 | 写入 |
|------|------|
| s2c 1001 | `roleId`。名字、等级、钱包等 2001。空包不当成 Mock 起步号。 |
| s2c 2001 | `name`、`level`、`gold`、`diamond`。缺的格子保持未同步。字段 5 奖杯不进金币。 |
| s2c 3007 | `nowIdx`、`maxIdx`。不写 `Session.stageId`。 |
| s2c 3001 | 最近一帧战报。主线页用它播战斗。 |
| s2c 3004 | `rewardTime`、`maxRewardTime`。不改金币。 |
| s2c 4001 | 英雄名册。空数组是已同步的空名册。 |
| s2c 5001 / 5002 | 背包整表。5002 在已有表上改数量。不改钱包。 |
| s2c 3099 | 已解锁阵法 id。 |
| s2c 3101 | MAIN 阵容。挂机站场读这里。 |
| Mock `role.enter` 及后续回包 | 同一份角色、钱包、关卡、英雄、背包。只在 `MockTransport` 里填。 |

登录链的发送顺序没有改：2001 → 5001 → 3007 → 3004，后面的空拉取仍在 `WireSession.pullIdle`。占位 `CmdId`（心跳 1002、`tower.view` 2001、`hero.list` 1401 等）没有改成线上号。

## 还没打通的部分

这些不挡住登录、进主城和已有的 3001 战斗。

- **GM 停用。** 客户端仍可发 c2s 2015，但本仓库没有 Java 服源码，不能打开 `gm.cmd.open`。服上该开关为 false 时主线页 Toast「GM 未开」。空名册没有可打的 MAIN 阵容。
- **3013 硬禁。** 快速战斗次数只读 3012，不发 3013，不发奖。
- **「我要变强」没有专属协议。** 底栏仍打开已有的 `HeroSuggestLayer`，只展示名册，不改战力。
- **英雄升级、升星、背包使用** 没有接到服端写协议。按钮停用，不在客户端改等级、星级或道具数量。
- **出阵** 走 c2s 3100，`formation_id` 在字段 5。空的 s2c 3100 之后再拉 3101，阵容只从 s2c 进 `GameStore`。
