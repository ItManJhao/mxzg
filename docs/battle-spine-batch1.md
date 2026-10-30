# Battle Spine batch 1

Assets only. No battle code, Boot, `USE_*`, protocol, or prefab changes.

## Source and destination

- Source: `idle/res/hd/spine` (bytes copied as-is; not converted or re-exported).
- Destination: `client/assets/resources/spine/{stem}.json`, `.atlas`, and `.png`.
- Folder meta: `client/assets/resources/spine.meta`.
- Each pack has Creator 3.8 metas: `.json.meta` (`spine-data`, atlas uuid linked), `.atlas.meta`, `.png.meta` (image importer, texture type, not a sprite-frame).

## Stems (16)

Basics: `10101`, `10201`, `10301`, `10401`, `10501`, `10701`.

battlepre: `10105008`, `10505005`, `10405005`, `10405006`, `10405007`, `10505010`.

Named: `battle-sword`, `bisha`, `zhandoujijian`, `crusade_boss_die`.

## Animation names

Battle clip convention for hero playback is `Stand`, `Run`, `Attack`, `Skill`, `Skill2`, `Hit`, `Transform`.

Names inside these exports are lowercase, and this batch does not contain `Skill`, `Skill2`, or `Transform`:

| stems | clips in the json |
| --- | --- |
| `10101`, `10201`, `10301`, `10401`, `10501`, `10701`, `battle-sword` | `stand` |
| `10405005`, `10405006`, `10405007`, `10505005`, `10505010` | `attack`, `attack2`, `attack3`, `hit`, `run`, `stand` |
| `10105008` | `attack`, `attack2`, `attack3`, `hit`, `run`, `run2`, `stand` |
| `bisha` | `an`, `guang`, `huo`, `mu`, `shui` |
| `zhandoujijian` | `idle` |
| `crusade_boss_die` | `die`, `stand` |

## Compatibility

Source Spine export is **3.7.94**. This project is Cocos Creator **3.8.8** with the built-in **spine-3.8** runtime. Creator’s supported Spine line for 3.x is 3.8, so 3.7.94 skeletons may fail to import or play. That runtime/extension risk stays with Client. This change does not upgrade the skeleton data. Playback upgrades a copy in memory (skins become `{name, attachments}` and 3.7 curve arrays become `curve` / `c2` / `c3` / `c4`, version `3.8.99`) and does not rewrite the files.

## Deferred

Not in this batch: `skill/`, `skill-effect/`, and `hero-beattack/` (and other hero folders). No PNGs were added under `prefabs/`.
