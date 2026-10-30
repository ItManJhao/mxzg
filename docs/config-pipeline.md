# 配置表导出

策划表在仓库里：`config/gameconfig/*.xlsx`（本机绝对路径 `F:\project\mxzg\config\gameconfig`）。这是客户端和服共用的源。客户端运行时不读 xlsx，只读导出的 JSON。

`ip2region.db` 体积大，留在本机，不进 Git。`server/` 仍是本机 junction，不在这个仓库里。

## 导出

```text
pip install -r tools/requirements.txt
python tools/export_gameconfig.py
```

默认读 `config/gameconfig`，写出 `client/assets/resources/config/<表名>.json`。可以用 `--src` / `GAMECONFIG_SRC`、`--out` / `GAMECONFIG_OUT` 改路径。云上同一份 534 张表的压缩包也可以解到 `--src` 再导。

表头沿用旧 ExcelReader：

1. 中文说明
2. 导出标记：`1` 服、`2` 客户端、`3` 两边、空或 `0` 跳过。整行是类型词（`string` / `int` / `json`）时，字段列都导出
3. 英文字段名
4. 起是数据

空数据的表仍写出 `rows: []`。多出来的有效 sheet 写成 `<表名>__<sheet>.json`。`manifest.json` 列出要加载的表名。

`system_gate.json` 从 `system.xlsx` 里整数值、且 key 含 `open_day` 或以 `_days` 结尾的行收成 `{key, open_server_day, note}`。`superstage_day_open` 这种非整数值不收。

`opencondition.json` 保留 `{id, name, condition_type, level, open_server_day}`，并带上原始列。`id` 是 atom，`name` 用中文 note，`level` 是 `condition_value`。`{atom}_open_day` 对得上时写入 `open_server_day`。`main_cafe` 是 `main_pub_task` 的别名，`mail` 是 `main_mail` 的别名。导航 id `bag` 在表里没有原子，导出补一行等级 1，和原来的入口门槛一致。

已有 `.meta` 的 uuid 会留下。新 JSON 才生成 Creator 2.0.1 的 json meta。

## 客户端怎么读

`ConfigLoader.loadAll()` 先读 `config/manifest`，再按批 `resources.load("config/<表名>", JsonAsset)`。`opencondition` 和 `system_gate` 仍进 `ConfigDb`，`gates.ts` / `nav.ts` 的入口判断不变。其它表留在 `ConfigDb.tables`，Boot 打出表数和行数。

Boot 登记这些表，没读到时仍用原来的常量：

| 表 | 客户端用途 |
|----|------------|
| `herotype` | `note` 登记到英雄类型名。对不上仍写「类型 N」 |
| `heroskill` + `language` | `type` 的 `lan_name` 对上 `language.key` 时，技能条用这句。调用方传入自己的名字表时不读这里 |
| `heroskill.art_list` + `buff.delay` | 大于 0 的延迟加在这一拍上 |
| `herobase` | Mock 主线我方血量用 type `10101001`、1 星的 `hp`。没登记仍是 100。敌方仍是 120。真服战报 hp 不改 |
| `effect2` | `eff_battle_start` 的 `speed` 单位是 0.01 秒，乘 10 成为帧步。没读到仍是 70ms |
| `system` | `battle_speed_level`、`battle_skip_level` 只拦真服回放的加速和跳过。`time_diff` 不是拍间隔 |
| `battletype` | `round_max` 只写日志。主线 type 1 是 15 回合上限，不是毫秒。不裁服已下发的回合 |
| `herotype` + `heroskill` + `language` | 英雄页名字和技能。`note` 是名字。`skill_1`…`skill_5` 对 `heroskill.type`，再用 `lan_name` 对语言。对不上仍写「类型 N」或「技能 id」 |
| `herobase` | 英雄详情按类型和星级写生命、攻击、防御、速度。Mock 战报血量仍只在调用方传入时改，缺省路径不变 |
| `item` + `language` | 背包。`item_type` 或 `item_id` 对上 `item.idx` 时用语言名。图标是 `ui/bag/backpack_<idx>`。对不上仍写三个字段 |
| `chapter` | `idx` 对上 3007 的 idx 或 Mock 关卡号时写「第 chapter_id 章 · 第 mission_id 关」。`hero_type` 大于 0 且有 stand 时，空守方战报用这只怪 |
| `mainlevel` | 角色等级对上 `level` 时，主线页写「等级经验 exp」。不是关卡号 |

哪一屏读哪一格，见 `docs/store-screens.md`。

`battletype` / `battleroundaddition` 不是播放毫秒。`battleroundaddition` 是每回合属性加成。

## 服

服仍读 xlsx，不改成读客户端 JSON。`config.path` 指到这份工程表：

```text
config.path=F:\\project\\mxzg\\config\\gameconfig
```

本机若把服启动目录放在仓库里，也可以用相对 `config/gameconfig` 的路径，只要进程读得到同一批 xlsx。`ip2region.file` 仍指向本机的 `ip2region.db`（例如 `F:\\mxzg-local\\ip2region.db`），不要把这个库推进 Git。
