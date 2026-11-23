# 验收记录

从[当前开发进度](../development-progress.md)查阅各功能的验收结论。这里保留按批次记录的实际操作、环境、范围和结果。需要理解代码或日常操作时，从[项目文档入口](../../README.md)查找维护说明。

## 保留哪些材料

- 保留正在被检查脚本读取的配置和资源基线。`battle-chapter10-20` 专项读取[第 9 关机器报告](main-chapter-dependencies-20261117-stage9.json)，用其原敌方及技能配置核对第 10～20 关的实现。
- 早期英雄、阵容与战斗规则的源码核查、旧协议和实测截图集中在[英雄与主线阵容历史核查](hero-lineup-history.md)。现行的英雄培养与协议入口见[英雄维护契约](../hero-lineup-contract.md)。
- 保留当前使用的[第 20 关机器报告](main-chapter-dependencies-20261117-stage20.json)和[可读汇总](main-chapter-dependencies-20261117-stage20.txt)，以及能证明特定结果的历史实测记录、截图、配置哈希和独立故障证据。
- 新增验收记录时，优先留下结果、实际输入、复验方法和少量关键截图。重复内容只留一份。中间尝试和可以重跑的日志留在本机临时目录。

## 历史关卡报告

初扫、接通第 4 关、接通第 5 关的三份完整 JSON 保存在 Git 提交 `66d337d58a4b84bad26a8f817007dd7f7c6c4222`。下列可读汇总继续留在当前目录。较早验收 JSON 中记录的原文件路径、命令和 SHA256 对应当时保存的版本。

| 批次 | 可读汇总 | Git 中的原 JSON |
| --- | --- | --- |
| 首次扫描 | [汇总](main-chapter-dependencies-20261117.txt) | `main-chapter-dependencies-20261117.json` |
| 第 4 关 | [汇总](main-chapter-dependencies-20261117-stage4.txt) | `main-chapter-dependencies-20261117-stage4.json` |
| 第 5 关 | [汇总](main-chapter-dependencies-20261117-stage5.txt) | `main-chapter-dependencies-20261117-stage5.json` |

需要读取原文件时，在仓库根目录执行以下命令。其他批次替换文件名即可。

```powershell
git show 66d337d58a4b84bad26a8f817007dd7f7c6c4222:docs/validation/main-chapter-dependencies-20261117-stage4.json
```

2026-11-18 清理了这 3 份大 JSON、11 张黑屏、重复或中间截图、2 份空日志和 3 份字节完全相同的重复日志，共 19 份。重复日志的引用已指向保留副本，其他历史验收记录仍分别记录各自的范围。
