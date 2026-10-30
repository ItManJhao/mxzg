# battle-spine-batch2 — 技能/受击命名 Spine 续迁

- 日期：2026-10-22（Asia/Hong_Kong）
- 源路径：`F:\源码\mj\program\client\cocos_mxzg\client\idle\res\hd\spine\`
- 目标路径约定：`client/assets/resources/spine/{stem}.{json,atlas,png}`，并按 #138 同款附带 Creator 3.8 `.meta`（`.json.meta` 为 `spine-data` 并链接 atlas uuid，`.atlas.meta`，`.png.meta` 为 image/texture，不是 sprite-frame）
- 范围：仅完整三件套（json+atlas+png）；不改 Boot/USE_*、协议、CityChrome
- 跳过 #138 已合：10101,10201,10301,10401,10501,10701,10105008,10405005,10405006,10405007,10505005,10505010,battle-sword,bisha,crusade_boss_die,zhandoujijian

## Spine 版本 / Creator 兼容

- 旧仓本批全部为 **Spine 3.7.94**（json 内 `"spine":"3.7.94"`）。
- 目标工程 Creator **3.8.8** 默认 spine-3.8 runtime：3.7.94 → 3.8 有兼容风险（曲线/约束/裁剪等）。
- 合入后需在 Creator 中预览；若报错，优先考虑官方 3.7→3.8 导出或引擎 spine-3.7 插件，**不要**在本刀改业务代码。

## 本批选型（20 套）

| stem | 字节 | Spine ver | 选型理由 |
|------|------|-----------|----------|
| yanwu | 27189 | 3.7.94 | 烟尘/受击尘特效，主线战斗通用 |
| guangzhu | 18422 | 3.7.94 | 光柱特效，召唤/登场常用 |
| heidong | 101473 | 3.7.94 | 黑洞类技能特效 |
| zadan | 644061 | 3.7.94 | 炸弹/爆炸技能主体 |
| zadan_tx | 507637 | 3.7.94 | 炸弹爆炸附属特效 |
| jiban | 83760 | 3.7.94 | 羁绊连携特效 |
| Dragon-1 | 316071 | 3.7.94 | 龙系战斗包（含 attack 动画） |
| Dragon-2 | 382341 | 3.7.94 | 龙系战斗包（含 attack 动画） |
| Dragon-3 | 480697 | 3.7.94 | 龙系战斗包（含 attack 动画） |
| Dragon-4 | 576144 | 3.7.94 | 龙系战斗包（含 attack 动画） |
| act | 125078 | 3.7.94 | 通用 act 动作特效壳 |
| chaihong | 24769 | 3.7.94 | 彩虹/拆虹特效 |
| ZDKS | 152732 | 3.7.94 | 战斗法阵/ZDKS 表现 |
| prophet-tree-effect-1 | 17529 | 3.7.94 | 先知树特效层1 |
| prophet-tree-effect-2 | 132267 | 3.7.94 | 先知树特效层2 |
| lijijihuo | 11007 | 3.7.94 | 立即激活类光效 |
| zhihuanfazhen | 24522 | 3.7.94 | 置换法阵特效 |
| hytx | 120878 | 3.7.94 | 火焰/战斗命名特效 |
| lizi | 60874 | 3.7.94 | 粒子光线特效 |
| dx | 81143 | 3.7.94 | 短特效包（dx） |

- 合计未压缩约 **3,888,594 bytes (3.71 MB)**

## 不进本 zip（下刀再迁）— pvr/plist 旁路

以下**不是** Spine 完整套，勿硬塞 `resources/spine/`：

| 路径 | 格式 | 说明 |
|------|------|------|
| `hd/skill/` | plist + pvr.ccz（~355 对，另有 2 png） | 英雄技能帧动画图集，非 Spine |
| `hd/skill-effect/` | plist + pvr.ccz（7 对） | parry/revive/shield/silent/contract 等技能状态特效 |
| `hd/hero/hero-beattack.plist` + `.pvr.ccz` | plist + pvr | 受击通用帧动画 |
| `hd/music/beattack.mp3` | mp3 | 受击音效，非视觉资源 |

## 命名特效全表（hd/spine 非纯数字 stem）备注

- **已合 #138**：battle-sword, bisha, crusade_boss_die, zhandoujijian
- **本批收入**：见上表 20 套
- **降权未收（偏 UI/场景装饰/体积或非主线战斗）**：jiemian, shangcheng, yingxiongtiao, chaojidajiang, crtq_touzi, chibang, chuan, chuanghu, hudie, liushui, penquan, windmill, jindutiao, zhaohuanlibao, mofang, new, heishi, res-block, x_1..x_6, t1..t5, g, dwvs, djjs, qyjs, jldj, sqbx, yjyx, yxsc, znz, zuanshi02, tiejiangguang 等
- **纯数字英雄/皮肤站场**：本刀不扩全量（#138 已抽主线站场）

## 回放接线（技能 / 受击原型）

`planWireSpineReplay` 在已有的站场 / 攻击之外，按回合行动挂上表命名套。3001、3006、3102 共用这一份计划。3103 仍不播 spine。

- 有 `skill_id`：绝对值取整后对技能套取模。顺序是 `zadan`、`zadan_tx`、`heidong`、`guangzhu`、`jiban`、`Dragon-1`、`Dragon-2`、`Dragon-3`、`Dragon-4`、`act`、`chaihong`、`ZDKS`、`hytx`、`lizi`、`dx`、`lijijihuo`、`zhihuanfazhen`、`prophet-tree-effect-1`、`prophet-tree-effect-2`。`yanwu` 不在这张表里。
- 有 `hits`：受击位挂 `yanwu`。没有 hits 不挂。
- 技能号缺失，或表是空的：不挂特效。站场和攻击照旧。
- 不播 `bisha`。英雄套里有 `hit` 才播受击，没有就留 `stand`。不接 `hd/skill`、`hd/skill-effect`、`hero-beattack` 的 PVR。

不是旧技能表，只让真服回放能看出不同技能号。

Spine **3.7.94** 对 Creator **3.8.8** 的 spine-3.8 运行时仍有兼容风险（曲线、约束、裁剪）。这一刀不重导出。Creator 里播不出来时，该特效跳过，不拆站场和攻击。

## 验收

- zip 内含 `spine/` 下每套三件套 + `docs/battle-spine-batch2.md`
- CloudAgent 解压后拷入 `client/assets/resources/spine/` 即可；draft ready 后喊 Manager squash

