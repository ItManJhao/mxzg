"""定向导出当前月兔精灵的生成规则和只读展示闭包，默认检查，--write 更新。

由服务端规则和客户端现有配置流水线共用同一投影；只读取策划 XLSX，
不开放领取、穿脱或养成，不将服务端随机字段混入全表客户端导出。
"""

import argparse
import json
from pathlib import Path

from bundle_paths import bundle_directory
from export_gameconfig import DEFAULT_SRC, ensure_meta, loose_rows, pick_primary, read_book, write_json

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "backend/src/main/resources/gameplay/spirit-rules.json"
DISPLAY_OUTPUT = bundle_directory("config") / "spirit-display.json"
# 本批仅恢复真实挂机可能产出的月兔精灵，不借生成工具开放其他稀有度。
ITEM_ID = 2000002


def source_rows(source, name):
    """读取真实主表全部列，保留旧服务端未标为客户端导出的随机权重。"""
    path = Path(source) / (name + ".xlsx")
    sheets = read_book(path)
    if not sheets:
        raise ValueError("精灵源表无有效工作表：" + name)
    primary = pick_primary(name, sheets)
    # 语言只需要已标记的 key/value；避免再次读取体积较大的多语言工作簿。
    rows = primary["rows"] if name == "language" else loose_rows(path, primary["sheet"])
    if not rows:
        raise ValueError("精灵源表无数据：" + name)
    return rows


def integer(row, field, location, minimum=1):
    """要求原字段明确存在且为有界整数，不把空单元格、布尔或缺列解释成零。"""
    value = row.get(field)
    if type(value) is not int or not minimum <= value <= 2147483647:
        raise ValueError(f"精灵字段缺失或非法：{location}.{field}={value!r}")
    return value


def only_row(rows, field, value, location):
    """返回唯一原行；缺行及重复行均拒绝，不能取第一行掩盖配置冲突。"""
    matching = [row for row in rows if row.get(field) == value]
    if len(matching) != 1:
        raise ValueError(f"精灵配置行缺失或重复：{location}.{field}={value}")
    return matching[0]


def distribution(row, field, key, location):
    """解析旧权重 JSON，保存原顺序并校验总权重，保证后续随机可安全执行。"""
    try:
        values = json.loads(row[field])
    except (KeyError, TypeError, json.JSONDecodeError) as error:
        raise ValueError(f"精灵权重缺失或非法：{location}.{field}") from error
    if not isinstance(values, list) or not values:
        raise ValueError(f"精灵权重列表为空：{location}.{field}")
    result = []
    seen = set()
    for value in values:
        if not isinstance(value, dict):
            raise ValueError(f"精灵权重条目非法：{location}.{field}")
        choice = integer(value, key, location + "." + field)
        weight = integer(value, "chance", location + "." + field)
        if choice in seen:
            raise ValueError(f"精灵权重选项重复：{location}.{field}")
        seen.add(choice)
        result.append({key: choice, "weight": weight})
    if sum(value["weight"] for value in result) > 2147483647:
        raise ValueError(f"精灵总权重溢出：{location}.{field}")
    return result


def build_projection(source=DEFAULT_SRC):
    """生成2000002的真实单能力、单技能规则及其语言闭包，不写文件或抽随机数。"""
    item = only_row(source_rows(source, "item"), "idx", ITEM_ID, "item")
    if integer(item, "type", "item") != 8 or integer(item, "place", "item") != 4:
        raise ValueError("月兔精灵物品类型或背包分类不符合已核实范围")
    runes = only_row(source_rows(source, "runestype"), "type", ITEM_ID, "runestype")
    rare = integer(runes, "rare", "runestype")
    maximum = integer(runes, "skill_max", "runestype")
    if rare != 2 or maximum != 1:
        raise ValueError("月兔精灵稀有度或技能数超出本批范围")
    counts = distribution(runes, "skill_num_chance", "num", "runestype")
    if len(counts) != 1 or counts[0]["num"] != 1:
        raise ValueError("月兔精灵必须明确生成一个技能")
    levels = distribution(runes, "skill1_level", "level", "runestype")
    if {value["level"] for value in levels} != {1, 2}:
        raise ValueError("月兔精灵技能等级超出已核实范围")

    languages = {}
    for row in source_rows(source, "language"):
        key = str(row.get("key", ""))
        if not key.isdigit() or int(key) <= 0:
            continue
        if key in languages:
            raise ValueError("精灵语言键重复：" + key)
        languages[key] = row.get("value")

    def text(key):
        """读取简体中文真实语言文本；不以策划备注代替缺失的显示配置。"""
        value = languages.get(str(key))
        if not isinstance(value, str) or not value.strip():
            raise ValueError("精灵显示语言缺失：" + str(key))
        return value

    abilities = []
    all_abilities = source_rows(source, "runesability")
    # 旧随机先从全表能力类型取均匀候选，再按稀有度查数值，不能仅过滤本稀有度后忽略新类型。
    if {integer(row, "type", "runesability") for row in all_abilities} != {1, 2, 3, 4}:
        raise ValueError("精灵全表能力候选超出已核实范围")
    ability_rows = [row for row in all_abilities if row.get("rare") == rare]
    if len(ability_rows) != 4 or {row.get("type") for row in ability_rows} != {1, 2, 3, 4}:
        raise ValueError("月兔精灵能力类型缺失、重复或超出范围")
    for row in sorted(ability_rows, key=lambda value: value["type"]):
        ability_id = integer(row, "type", "runesability")
        try:
            attributes = json.loads(row["ability"])
        except (KeyError, TypeError, json.JSONDecodeError) as error:
            raise ValueError("精灵基础能力配置非法") from error
        if (not isinstance(attributes, list) or len(attributes) != 1
                or not isinstance(attributes[0], dict) or len(attributes[0]) != 1):
            raise ValueError("月兔精灵必须只有一个基础属性")
        attribute_text, value = next(iter(attributes[0].items()))
        if not str(attribute_text).isdigit():
            raise ValueError("精灵属性编号非法")
        attribute = int(attribute_text)
        # 本批四项是旧详情直接显示数值的平值属性，不扩展百分比格式规则。
        if attribute not in {101, 220, 223, 224} or type(value) is not int or value <= 0:
            raise ValueError("精灵基础属性超出已核实范围")
        name = text(2150000 + attribute)
        abilities.append(dict(id=ability_id, attributeId=attribute, value=value,
                              name=name, description=f"{name}+{value}"))

    hero_skills = {}
    for row in source_rows(source, "heroskill"):
        key = (row.get("type"), row.get("level"))
        if key in hero_skills:
            raise ValueError("英雄技能类型及等级重复：" + str(key))
        hero_skills[key] = row
    skills = []
    seen_indices = set()
    seen_skills = set()
    skill_rows = [row for row in source_rows(source, "runeskilltype")
                  if integer(row, "level", "runeskilltype") in {1, 2}]
    for row in sorted(skill_rows, key=lambda value: integer(value, "idx", "runeskilltype")):
        index = integer(row, "idx", "runeskilltype")
        skill_id = integer(row, "skill_id", "runeskilltype")
        level = integer(row, "level", "runeskilltype")
        weight = integer(row, "chance", "runeskilltype")
        key = (skill_id, level)
        if index in seen_indices or key in seen_skills:
            raise ValueError("精灵技能索引或技能等级重复：" + str(key))
        seen_indices.add(index)
        seen_skills.add(key)
        display = hero_skills.get(key)
        if display is None:
            raise ValueError("精灵技能展示行缺失：" + str(key))
        skills.append(dict(index=index, id=skill_id, level=level, weight=weight,
                           name=text(integer(display, "lan_name", "heroskill")),
                           description=text(integer(display, "lan_describe", "heroskill")),
                           icon=f"skill-icon/{skill_id + level - 1}"))
    for level in (1, 2):
        total = sum(row["weight"] for row in skills if row["level"] == level)
        if not 1 <= total <= 2147483647:
            raise ValueError("精灵技能等级缺行或总权重溢出：" + str(level))
    return dict(schema=1, item=dict(itemId=ITEM_ID, rare=rare, skillMaximum=maximum,
                                   skillCounts=[dict(count=row["num"], weight=row["weight"]) for row in counts],
                                   skillLevels=levels), abilities=abilities, skills=skills)


def build_display(projection):
    """从同一规则投影派生现有 GameConfig 可读取的单行展示表，不复制维护映射。"""
    skills = [dict(skillId=row["id"], level=row["level"], name=row["name"],
                   description=row["description"], icon=row["icon"]) for row in projection["skills"]]
    return dict(schema=1, rows=[dict(idx=projection["item"]["itemId"],
                                    abilities=projection["abilities"], skills=skills)])


def encode(document):
    """使用稳定 UTF-8 文本编码，使默认检查和服务端原字节摘要可重复。"""
    return json.dumps(document, ensure_ascii=False, separators=(",", ":")) + "\n"


def main():
    """默认核对两份产物；显式 --write 才更新，客户端 meta 沿用既有生成规则。"""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--src", type=Path, default=DEFAULT_SRC)
    args = parser.parse_args()
    projection = build_projection(args.src)
    for path, document in ((OUTPUT, projection), (DISPLAY_OUTPUT, build_display(projection))):
        content = encode(document)
        if args.write:
            write_json(path, document)
            if path == DISPLAY_OUTPUT:
                ensure_meta(Path(str(path) + ".meta"))
        elif not path.exists() or path.read_text(encoding="utf-8") != content:
            raise SystemExit("精灵投影未同步：" + str(path))
    print("精灵规则与只读展示投影已同步")


if __name__ == "__main__":
    main()
