# 读表

运行时只读 `assets/resources/config/*.json`。`ConfigLoader.loadAll(onProgress?)` 先读 `config/manifest`，再按批 `resources.load`，每批结束回调已完成张数。`opencondition`、`system_gate`、`language`、`chapter`、`version`、`loadingtips` 任一失败则整次失败，并且不写入 `ConfigDb.current`。路径不带扩展名。不在运行时打开 xlsx。

源表在仓库 `config/gameconfig/*.xlsx`（本机 `F:\project\mxzg\config\gameconfig`）。重新导出：

```text
python tools/export_gameconfig.py
```

依赖在 `tools/requirements.txt`（openpyxl 3.1.5）。

| 文件 | 作用 |
|------|------|
| `manifest.json` | 要加载的表名 |
| `opencondition.json` | 系统入口。`condition_type=1` 看主线等级；`open_server_day>0` 还要看开服自然日 |
| `system_gate.json` | 从 `system.xlsx` 收出的开服日门槛 |
| 其它 `<表名>.json` | 与 xlsx 主表同名。战斗和英雄查找见 `docs/config-pipeline.md` |

判定在 `gates.ts`：`isEntryOpen` / `isServerGateOpen`。开服当天算第 1 天。主城底栏和玩法列表在 `nav.ts`，未开启仍显示，Toast 用 `entryAccess` 的提示。

xlsx 只放 `config/gameconfig`，不要拷进 `client/`。
