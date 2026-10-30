# mxzg 最终对账（定稿）— 老 hd vs 新 resources

- 生成：2026-10-23（Asia/Hong_Kong）；**main 最终 tip `eda658a4`**（A–E 全合；E = #194 E2 / #195 E4 / #196 E3 / #197 E1）；树来源 PC-202412251709 `F:\project\mxzg` `git ls-tree -r eda658a4`（只读，未提交/推送）
- 老 hd 全量：**4525 文件 / 557,159,583 B**（PC `Get-ChildItem -Recurse` 实数）
- 方法：spine 按文件名对 main 全树；skill/skill-effect/hero/ccbi-res 图集按 plist **逐帧**对 main（帧名 `/`→`_`）；其余按 git blob sha1 + 文件名对 main；E 批 631 个目标路径在 tip 逐个核对：存在、blob sha1 与老文件一致、均有 .meta（0 异常）；resources 下全部内容文件都有 .meta（0 缺）

## 逐帧核验

- ccbi-res 图集：308 plist / 12,631 帧，main 缺 **0**（3 帧以 `.jpg.png` 双后缀存在：plane-war_boss-bg、plane-war_plane-war-bg、promotion-71_spr-bg —— 命名瑕疵，非缺失）
- skill：355 plist / 6,106 帧，缺 0；skill-effect 7 plist / 104 帧，缺 0；hero 2 plist / 40 帧，缺 0
- spine：1405 文件按名全在 main，缺 0

## 汇总

| 去向 | 文件 | B |
|---|--:|--:|
| 不进仓（引擎专用） | 1005 | 2,087,329 |
| 已拆帧覆盖（源 plist/pvr 不进仓） | 326 | 11,627,753 |
| A–D 已迁 | 2423 | 461,913,018 |
| 已在 main（跳过） | 140 | 42,478,463 |
| Batch E 已迁（#194–#197） | 631 | 39,053,020 |
| **合计** | **4525** | **557,159,583** |

## 按目录 × 类型

| hd 目录 | 类型 | 去向 | 文件 | B |
|---|---|---|--:|--:|
| (root) | .pre | 不进仓：老热更版本标记（内容 "1"），Creator 不用 | 1 | 1 |
| ccbi | .ccbi | 不进仓：CocosBuilder 二进制布局 .ccbi / fileLookup.plist：Creator 3.8 无导入器，界面已按 Prefab 1:1 重建 | 966 | 2,069,832 |
| ccbi | .plist | 不进仓：CocosBuilder 二进制布局 .ccbi / fileLookup.plist：Creator 3.8 无导入器，界面已按 Prefab 1:1 重建 | 1 | 314 |
| ccbi-res | .jpg | E3 已合 → ui/chapter/ | 27 | 3,172,001 |
| ccbi-res | .jpg | E3 已合 → ui/chapter/hang/ | 13 | 1,511,049 |
| ccbi-res | .jpg | E3 已合 → ui/chapter_exoticadventure/ | 1 | 388,999 |
| ccbi-res | .jpg | E3 已合 → ui/chapter_exoticadventure/hang/ | 2 | 504,657 |
| ccbi-res | .jpg | E3 已合 → ui/maps/ | 12 | 2,116,466 |
| ccbi-res | .jpg | 跳过：已在 main（A–D/早批，同名或同内容） | 52 | 9,690,959 |
| ccbi-res | .plist | E3 已合 → ui/particle/ | 1 | 4,522 |
| ccbi-res | .plist | 跳过：图集 plist：Batch B 已按其拆帧为 PNG（plist 本身不进仓） | 308 | 7,140,500 |
| ccbi-res | .png | E3 已合 → ui/chapter/chapter-world/ | 37 | 293,647 |
| ccbi-res | .png | E3 已合 → ui/chapter/hang/ | 13 | 2,640,646 |
| ccbi-res | .png | E3 已合 → ui/maps/ | 13 | 4,621,606 |
| ccbi-res | .png | E3 已合 → ui/particle/ | 1 | 12,900 |
| ccbi-res | .png | E3 已合 → ui/promo/ | 13 | 2,615,796 |
| ccbi-res | .png | 跳过：已在 main（A–D/早批，同名或同内容） | 59 | 15,482,300 |
| ccbi-res | .pvr.ccz | B（+早批）已拆 PNG → ui/<module>/ | 308 | 172,776,545 |
| config | .csv | E4 已合 → config/legacy-hd/ | 7 | 3,379 |
| config | .rd | E4 已合 → config/legacy-hd/ | 1 | 131,541 |
| config | .ss | E4 已合 → config/legacy-hd/ | 1 | 0 |
| config | .txt | E4 已合 → config/legacy-hd/ | 32 | 581,564 |
| font | .fnt | E1 已合 → font/ | 21 | 191,900 |
| font | .fnt | 跳过：已在 main（A–D/早批，同名或同内容） | 11 | 17,405 |
| font | .png | E1 已合 → font/ | 21 | 534,264 |
| font | .png | 跳过：已在 main（A–D/早批，同名或同内容） | 11 | 234,059 |
| font | .ttf | 跳过：已在 main（A–D/早批，同名或同内容） | 2 | 15,368,436 |
| hero | .plist | 跳过：hero-beattack→battle/hero-beattack（#170）；hero 14 帧→ui/battle/hero_*（已在 main） | 2 | 22,510 |
| hero | .pvr.ccz | 跳过：hero-beattack→battle/hero-beattack（#170）；hero 14 帧→ui/battle/hero_*（已在 main） | 2 | 248,185 |
| music | .mp3 | E2 已合 → audio/ | 415 | 19,728,083 |
| music | .mp3 | 跳过：已在 main（A–D/早批，同名或同内容） | 5 | 1,685,304 |
| shader | .frag | 不进仓：cocos2d-x GLSL .vert/.frag/.fsh/.vsh：Creator 3.8 只认 .effect，不能直接导入，需按需重写 | 15 | 9,315 |
| shader | .fsh | 不进仓：cocos2d-x GLSL .vert/.frag/.fsh/.vsh：Creator 3.8 只认 .effect，不能直接导入，需按需重写 | 5 | 1,638 |
| shader | .vert | 不进仓：cocos2d-x GLSL .vert/.frag/.fsh/.vsh：Creator 3.8 只认 .effect，不能直接导入，需按需重写 | 15 | 5,402 |
| shader | .vsh | 不进仓：cocos2d-x GLSL .vert/.frag/.fsh/.vsh：Creator 3.8 只认 .effect，不能直接导入，需按需重写 | 2 | 827 |
| skill | .plist | D（+#170）已拆 PNG → battle/skill/ | 355 | 3,302,093 |
| skill | .png | D（+#170）已拆 PNG → battle/skill/ | 2 | 947,058 |
| skill | .pvr.ccz | D（+#170）已拆 PNG → battle/skill/ | 353 | 140,956,739 |
| skill-effect | .plist | 跳过：#170 已拆帧进 battle/skill-effect/（7/7） | 7 | 57,700 |
| skill-effect | .pvr.ccz | 跳过：#170 已拆帧进 battle/skill-effect/（7/7） | 7 | 4,158,858 |
| spine | .atlas | C（+#138/#145/#170）已迁 → spine/ | 464 | 1,361,293 |
| spine | .json | C（+#138/#145/#170）已迁 → spine/ | 464 | 74,571,069 |
| spine | .png | C（+#138/#145/#170）已迁 → spine/ | 477 | 67,998,221 |

## 不进仓清单（需确认）

| 内容 | 文件 | 理由 |
|---|--:|---|
| hd/ccbi/*.ccbi + fileLookup.plist | 967 | CocosBuilder 二进制布局，Creator 3.8 无导入器；界面走 Prefab 1:1 重建（Prefab 阶段回老仓读 ccbi 作参照） |
| hd/shader/*.vert/.frag/.fsh/.vsh | 37 | cocos2d-x GLSL，Creator 3.8 只认 .effect；需要时按效果（gray/ice/stone/frozen/poison/blur…）重写 |
| hd/version.rvs.pre | 1 | 老热更版本标记（内容 "1"） |
| 图集源 .pvr.ccz/.plist（ccbi-res/skill/skill-effect/hero） | — | 已逐帧拆成 PNG 入仓，源文件本身不需要 |

## 结论（定稿）

- 以 tip `eda658a4` 核对：老 hd 中 **Creator 可用资源遗漏 0**，无需 Batch F 补刀。
- 不进仓只剩 3 类引擎专用文件共 1005 个，理由见上。
- 已知瑕疵（不算遗漏）：3 帧 `.jpg.png` 双后缀（本清理已改为纯 `.png`：`ui/plane-war/plane-war_boss-bg.png`、`ui/plane-war/plane-war_plane-war-bg.png`、`ui/promo/promotion-71_spr-bg.png`；`.meta` uuid 未改，只更新了 displayName）；C2 两套 Spine 3.5（10203001/10204001）待 Creator 预览；D3 `skill-103050210-2` 17 帧大写 `.PNG`；skill-101050201-3 多 1 张 png；4 个 font fnt 与老版内容不同（前批微调）。
- 复跑脚本：`/workspace/esrc/rec_final.py`（树：`/workspace/esrc/ftree_l.txt`）。
