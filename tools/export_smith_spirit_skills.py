"""投影原精灵技能图鉴的四档条目，供铁匠铺按旧顺序展示。

只读取旧 Lua 的整数条目，不执行 Lua。说明、效果和图标继续使用客户端已有资源。
默认检查漂移，显式 --write 生成 TypeScript 数据。
"""

import argparse
import json
import re
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "config/legacy-client/runeskilltype.lua"
OUTPUT = ROOT / "client/assets/scripts/features/smith/data/SmithSpiritSkillCatalog.ts"
CONFIG = ROOT / "client/assets/bundles/resources/config"
SKILL_ART = ROOT / "client/assets/bundles/module/hero/ui"
DETAIL_TEXT = (41239, 41240, 41336, 41337, 41338)
ROW = re.compile(
    r"\[(\d+)\]\s*=\s*\{\s*idx\s*=\s*(\d+),\s*skill_id\s*=\s*(\d+),"
    r"\s*level\s*=\s*(\d+),\s*tag\s*=\s*(\d+),\s*\},"
)


def read_rows() -> list[tuple[int, int, int, int]]:
    """读取目录编号、技能编号、档位和原品质标记，保持档内优先级。"""
    source = SOURCE.read_text(encoding="utf-8-sig")
    prefix, suffix = 'cfg.runeskilltype = {\n\t["skill"] = {', '}}'
    if not source.startswith(prefix) or re.sub(r"\s+", "", ROW.sub("", source[len(prefix):])) != suffix:
        raise ValueError("原精灵技能目录含未知字段或条目格式")
    rows = []
    identifiers = set()
    skills = set()
    for match in ROW.finditer(source):
        key, index, skill_id, level, tag = map(int, match.groups())
        if (key != index or index in identifiers or (skill_id, level) in skills
                or skill_id <= 0 or level not in range(1, 5) or tag not in range(3)):
            raise ValueError("原精灵技能目录条目非法：" + str(index))
        identifiers.add(index)
        skills.add((skill_id, level))
        rows.append((index, skill_id, level, tag))
    if Counter(row[2] for row in rows) != {level: 49 for level in range(1, 5)}:
        raise ValueError("原精灵技能目录四档数量不一致")
    return sorted(rows, key=lambda row: (row[2], -row[3], row[0]))


def check_assets(rows: list[tuple[int, int, int, int]]) -> None:
    """核对沿用的技能等级、语言键和图案，避免图鉴重新生成后仍有空白格。"""
    skill_rows = json.loads((CONFIG / "heroskill.json").read_text(encoding="utf-8"))["rows"]
    skill_index = {(row["type"], row["level"]): row for row in skill_rows}
    language = json.loads((CONFIG / "language.json").read_text(encoding="utf-8"))["rows"]
    texts = {str(row["key"]): row.get("value") for row in language}
    for key in DETAIL_TEXT:
        if not texts.get(str(key)):
            raise ValueError(f"技能说明文案缺失：{key}")
    for _, skill_id, level, _ in rows:
        skill = skill_index.get((skill_id, level))
        icon = SKILL_ART / f"skill-icon_{skill_id + level - 1}.png"
        if (skill is None or not texts.get(str(skill["lan_name"]))
                or not texts.get(str(skill["lan_describe"])) or not icon.is_file()
                or not icon.with_suffix(".png.meta").is_file()):
            raise ValueError(f"精灵技能的等级、文案或图案缺失：技能={skill_id}，档位={level}")


def main() -> None:
    """生成或核对客户端索引，不写技能规则或其他配置表。"""
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group()
    action.add_argument("--write", action="store_true", help="更新生成的 TypeScript 索引")
    action.add_argument("--check", action="store_true", help="核对索引及引用资源，此为默认")
    args = parser.parse_args()
    rows = read_rows()
    check_assets(rows)
    content = (
        "/** 由 tools/export_smith_spirit_skills.py 生成，索引原精灵图鉴的档位、技能和品质标识。 */\n"
        "export const SMITH_SPIRIT_SKILL_CATALOG: readonly (readonly [skillId: number, level: number, tag: number])[] = [\n"
        + "".join(f"    [{id_}, {level}, {tag}],\n" for _, id_, level, tag in rows)
        + "];\n"
    )
    if args.write:
        OUTPUT.write_text(content, encoding="utf-8", newline="\n")
    elif not OUTPUT.is_file() or OUTPUT.read_text(encoding="utf-8") != content:
        raise SystemExit("精灵技能图鉴索引未同步")
    print(f"精灵技能图鉴索引通过：{len(rows)} 条")


if __name__ == "__main__":
    main()
