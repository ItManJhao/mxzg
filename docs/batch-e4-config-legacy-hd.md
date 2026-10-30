# Batch E4 config legacy-hd

Raw `hd/config` tables (`.txt` / `.csv` / `.rd` / `.ss`) copied into `client/assets/resources/config/legacy-hd/`. Each new file has a Creator 3.8.8 `.meta`. Bytes were copied as-is, including CRLF. `.txt` and `.csv` were not rewritten as `.json`.

## Baseline

- Repo tip: `6a7e235e` (Batch A–D already merged; tip commit is batch D3 skill-103xxx, #193)
- Source: old `hd/config/`
- Zip: `mxzg-mig-batch-e4-p1` (84,007 bytes), unpacked at the repo root. Members were already rooted at `client/assets/resources/config/legacy-hd/`
- Manifest: **41** files, **716,484** bytes (`.csv` 7, `.rd` 1, `.ss` 1, `.txt` 32)
- None of the 41 paths existed on the baseline. No existing file or `.meta` was overwritten

On-disk count and byte size match the manifest for every file (sum 716,484).

| | files | bytes |
| --- | ---: | ---: |
| `.txt` | 32 | 581,564 |
| `.csv` | 7 | 3,379 |
| `.rd` | 1 | 131,541 |
| `.ss` | 1 | 0 |
| **E4** | **41** | **716,484** |

`config/legacy-hd/` is a new folder. `legacy-hd.meta` is `importer: directory`, `ver` `1.2.0`. `config.meta` and `config/maincity.meta` were not rewritten.

## Old path → new path

Manifest order. Byte column is the file on disk and matches the manifest.

| old (`hd/`) | new | bytes |
| --- | --- | ---: |
| `config/battlepre.txt` | `client/assets/resources/config/legacy-hd/battlepre.txt` | 19,984 |
| `config/buytime.csv` | `client/assets/resources/config/legacy-hd/buytime.csv` | 26 |
| `config/fashion-10505016.txt` | `client/assets/resources/config/legacy-hd/fashion-10505016.txt` | 23,762 |
| `config/fashion-30101001.txt` | `client/assets/resources/config/legacy-hd/fashion-30101001.txt` | 9,641 |
| `config/fashion-30101002.txt` | `client/assets/resources/config/legacy-hd/fashion-30101002.txt` | 25,020 |
| `config/fashion-30201211.txt` | `client/assets/resources/config/legacy-hd/fashion-30201211.txt` | 20,281 |
| `config/fashion-30205111.txt` | `client/assets/resources/config/legacy-hd/fashion-30205111.txt` | 17,691 |
| `config/fashion-30205201.txt` | `client/assets/resources/config/legacy-hd/fashion-30205201.txt` | 19,544 |
| `config/fashion-30205221.txt` | `client/assets/resources/config/legacy-hd/fashion-30205221.txt` | 12,203 |
| `config/fashion-30305001.txt` | `client/assets/resources/config/legacy-hd/fashion-30305001.txt` | 12,439 |
| `config/fashion-30305151.txt` | `client/assets/resources/config/legacy-hd/fashion-30305151.txt` | 13,132 |
| `config/fashion-30305152.txt` | `client/assets/resources/config/legacy-hd/fashion-30305152.txt` | 10,446 |
| `config/fashion-30405051.txt` | `client/assets/resources/config/legacy-hd/fashion-30405051.txt` | 13,471 |
| `config/fashion-30405061.txt` | `client/assets/resources/config/legacy-hd/fashion-30405061.txt` | 6,278 |
| `config/fashion-30405071.txt` | `client/assets/resources/config/legacy-hd/fashion-30405071.txt` | 17,010 |
| `config/fashion-30405141.txt` | `client/assets/resources/config/legacy-hd/fashion-30405141.txt` | 26,380 |
| `config/fashion-30405151.txt` | `client/assets/resources/config/legacy-hd/fashion-30405151.txt` | 8,595 |
| `config/fashion-30405161.txt` | `client/assets/resources/config/legacy-hd/fashion-30405161.txt` | 25,744 |
| `config/fashion-30405171.txt` | `client/assets/resources/config/legacy-hd/fashion-30405171.txt` | 20,635 |
| `config/fashion-30405181.txt` | `client/assets/resources/config/legacy-hd/fashion-30405181.txt` | 11,960 |
| `config/fashion-30501001.txt` | `client/assets/resources/config/legacy-hd/fashion-30501001.txt` | 25,664 |
| `config/fashion-30501002.txt` | `client/assets/resources/config/legacy-hd/fashion-30501002.txt` | 15,041 |
| `config/fashion-30505041.txt` | `client/assets/resources/config/legacy-hd/fashion-30505041.txt` | 8,466 |
| `config/fashion-30505101.txt` | `client/assets/resources/config/legacy-hd/fashion-30505101.txt` | 14,861 |
| `config/fashion-30505102.txt` | `client/assets/resources/config/legacy-hd/fashion-30505102.txt` | 29,267 |
| `config/fashion-30505141.txt` | `client/assets/resources/config/legacy-hd/fashion-30505141.txt` | 14,914 |
| `config/fashion-30505142.txt` | `client/assets/resources/config/legacy-hd/fashion-30505142.txt` | 34,845 |
| `config/fashion-30505151.txt` | `client/assets/resources/config/legacy-hd/fashion-30505151.txt` | 34,722 |
| `config/fashion-30505161.txt` | `client/assets/resources/config/legacy-hd/fashion-30505161.txt` | 25,590 |
| `config/fashion-30505171.txt` | `client/assets/resources/config/legacy-hd/fashion-30505171.txt` | 12,936 |
| `config/fashion-30505181.txt` | `client/assets/resources/config/legacy-hd/fashion-30505181.txt` | 17,228 |
| `config/fashion-30505201.txt` | `client/assets/resources/config/legacy-hd/fashion-30505201.txt` | 16,396 |
| `config/fashion-30505231.txt` | `client/assets/resources/config/legacy-hd/fashion-30505231.txt` | 17,418 |
| `config/language.csv` | `client/assets/resources/config/legacy-hd/language.csv` | 220 |
| `config/maincitypos.csv` | `client/assets/resources/config/legacy-hd/maincitypos.csv` | 567 |
| `config/notchheight.csv` | `client/assets/resources/config/legacy-hd/notchheight.csv` | 238 |
| `config/reddot.rd` | `client/assets/resources/config/legacy-hd/reddot.rd` | 131,541 |
| `config/shopseniorticket.csv` | `client/assets/resources/config/legacy-hd/shopseniorticket.csv` | 35 |
| `config/splice.ss` | `client/assets/resources/config/legacy-hd/splice.ss` | 0 |
| `config/system.csv` | `client/assets/resources/config/legacy-hd/system.csv` | 2,158 |
| `config/version.csv` | `client/assets/resources/config/legacy-hd/version.csv` | 135 |

`maincitypos.csv` stays beside the existing `client/assets/resources/config/maincity/maincitypos.json` (2,834 bytes). The csv is the raw table kept as an archive. The json was not edited.

## Creator meta

New UUIDs are uuid4. Each one was checked against every `uuid` already stored under `client/` (top-level and sub-meta). No repeats. No existing `.meta` was edited.

### `.txt` / `.csv` — repo reference, used

Same-type text metas already exist, and that shape wins over the brief's "no in-repo reference" note. All three share one shape:

- `client/assets/scenes/README.md.meta`
- `client/assets/scripts/README.md.meta`
- `client/assets/scripts/config/README.md.meta`

`ver` `1.0.1`, `importer` `text`, `imported` true, `files` `[".json"]`, empty `subMetas` and `userData`. The 32 `.txt` metas and 7 `.csv` metas copy that shape. It is also the Creator 3.8.8 text importer the brief quoted, so the two sources agree. The raw files were not converted to `.json`.

### `.rd` / `.ss` — no same-type reference, standard default importer

There is no `.rd.meta` or `.ss.meta` in the repo. The only `importer: "*"` metas are spine `.atlas` files (for example `client/assets/resources/spine/10101.atlas.meta`): `ver` `1.0.0`, `files` `[".atlas", ".json"]`. That pair is the atlas library output, not the shape of an extension Creator does not import. Those atlas metas were not copied onto `.rd` / `.ss`.

`.rd` (JSON text; bytes left as `.rd`) and `.ss` (0-byte file) use the default importer, noted here as 无参照、按标准写:

- `reddot.rd.meta`: `ver` `1.0.0`, `importer` `*`, `files` `[".rd"]`
- `splice.ss.meta`: `ver` `1.0.0`, `importer` `*`, `files` `[".ss"]`

Empty `subMetas` and `userData` on both.

### Directory

`client/assets/resources/config/legacy-hd.meta` copies the directory metas already under config (`config.meta`, `config/maincity.meta`): `ver` `1.2.0`, `importer` `directory`, `imported` true, `files` `[]`, empty `subMetas` and `userData`, plus a new uuid.

## Sibling batches

Asset import after D is split across sibling batches **E1–E4**. This PR is **E4** only (old `hd/config` raw txt/csv/rd/ss).

| batch | contents | in this branch |
| --- | --- | --- |
| E1 | bitmap fonts | no |
| E2 | audio mp3 | no |
| E3 | ccbi-res loose images + particle | no |
| E4 | `config/legacy-hd` raw tables | yes |

## Skipped (same content already on main)

The batch summary skips old `hd/config` files whose bytes are already on main. They are not in this zip.

Checked on `6a7e235e` before and after unpack:

- All 41 target paths were absent, so nothing was overwritten and the unpack was not stopped
- SHA-256 of each of the 41 files against every other non-meta file in the repo: **0** matches

The manifest does not name any further source paths that were dropped before packing. This PR does not invent that list, and it does not add any path outside the manifest, the new `.meta` files, `legacy-hd.meta`, and this doc.

These config JSON files were already on main. They are not the same bytes as the raw tables here, and they were left unchanged:

| already on main | bytes | this batch |
| --- | ---: | --- |
| `client/assets/resources/config/opencondition.json` | 1,534 | not in the zip |
| `client/assets/resources/config/system_gate.json` | 622 | raw `system.csv` (2,158) is a separate file |
| `client/assets/resources/config/maincity/maincitypos.json` | 2,834 | raw `maincitypos.csv` (567) archived beside it |
| `client/assets/resources/config/maincity/createmaincitybtn.json` | 7,676 | not in the zip |
| `client/assets/resources/config/maincity/maincityeffect.json` | 1,058 | not in the zip |

## Out of scope

No Prefab edits and no PNG copies added under prefabs. No Boot, `USE_*`, or protocol edits. BattlePage `Bg` is unchanged. Existing config JSON, `config.meta`, and `config/maincity.meta` are unchanged.
