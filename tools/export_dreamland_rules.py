"""从旧策划表读取永恒梦境的守军、强化、奖励和系统约束。

生成新版服务端规则及客户端战报校验名册。由部署控制实际上限，导入层数不等同于开放范围。
"""

import argparse
import json
from pathlib import Path

from export_gameconfig import DEFAULT_SRC, ROOT, loose_rows


RULES_OUTPUT = ROOT / "backend/src/main/resources/gameplay/dreamland-rules.json"
REPLAY_OUTPUT = ROOT / "client/assets/scripts/config/DreamlandReplayRoster.generated.ts"
FLOOR_COUNT = 1500
ENEMY_POSITIONS = (2, 3, 5, 6, 7, 8)


def rows(source, file, sheet="Sheet1"):
    """按策划表的实际工作表和完整字段读取，保留未导出到旧客户端的字段。"""
    return loose_rows(source / f"{file}.xlsx", sheet)


def rewards(raw, known_items):
    """转换原发奖字段，拒绝空奖励、未知物品和无效数量。"""
    result = []
    for row in json.loads(raw):
        item_id = row["item_type"]
        quantity = row["item_num"]
        if item_id not in known_items or not isinstance(quantity, int) or quantity <= 0:
            raise ValueError(f"永恒梦境奖励物品或数量无效：{row}")
        result.append({"itemId": item_id, "quantity": quantity})
    if not result:
        raise ValueError("永恒梦境奖励为空")
    return result


def stages(source, known_items):
    """按楼层合并原守军和两档当天挑战收入，校验站位、成长和初始属性。"""
    rosters = {floor: [] for floor in range(1, FLOOR_COUNT + 1)}
    growth = {(row["type"], row["star"]) for row in rows(source, "herobase", "herobase")}
    enemy_rows = rows(source, "infinitelevel")
    if len({row["idx"] for row in enemy_rows}) != len(enemy_rows):
        raise ValueError("永恒梦境守军编号重复")
    for row in enemy_rows:
        floor = row["mission_id"]
        if floor not in rosters or (row["hero_type"], row["hero_star"]) not in growth or row["hero_level"] < 1:
            raise ValueError(f"永恒梦境守军楼层或成长配置无效：{row['idx']}")
        modifiers = json.loads(row["attr"])
        if sorted((attr["type"], attr["kind"]) for attr in modifiers) != [(220, 2), (223, 2)] or any(
            not isinstance(attr["value"], int) or attr["value"] <= 0 for attr in modifiers
        ):
            raise ValueError(f"永恒梦境守军初始属性规则有变动：{row['idx']}")
        if json.loads(row["equipment"]) != [] or json.loads(row["runes"]) != []:
            raise ValueError(f"永恒梦境守军需要接入装备或符文：{row['idx']}")
        rosters[floor].append({
            "configId": row["idx"],
            "position": row["pos"],
            "template": row["hero_type"],
            "level": row["hero_level"],
            "star": row["hero_star"],
            "modifiers": row["attr"],
            "equipment": row["equipment"],
            "runes": row["runes"],
        })

    for floor, roster in rosters.items():
        roster.sort(key=lambda unit: unit["position"])
        if tuple(unit["position"] for unit in roster) != ENEMY_POSITIONS:
            raise ValueError(f"永恒梦境第 {floor} 层守军数量或站位错误")

    daily = sorted(rows(source, "infinitedaily"), key=lambda row: row["idx"])
    if [row["idx"] for row in daily] != list(rosters):
        raise ValueError("永恒梦境当天挑战收入缺层或重复")
    return [{
        "floor": row["idx"],
        "standardRewards": rewards(row["standard_reward"], known_items),
        "afterRewards": rewards(row["after_reward"], known_items),
        "enemies": rosters[row["idx"]],
    } for row in daily]


def buffs(source):
    """读取三个候选组的权重、效果和本地化文本，核对战斗处理支持的属性。"""
    language = {str(row["key"]): row.get("value") for row in rows(source, "language", "language")}
    continuous_attributes = {201, 202, 204, 205, 207, 208, 212, 222, 227}
    result = []
    for row in sorted(rows(source, "infinitebuff"), key=lambda row: row["idx"]):
        [attribute] = json.loads(row["buff_id"])
        attr_id = attribute["attr"]
        mode = row["add_type"]
        if (mode != 1 or attr_id not in continuous_attributes) and (mode, attr_id) != (0, 105):
            raise ValueError(f"永恒梦境强化属性或持续方式待接入：{row['idx']}")
        title = language[str(row["lan_title"])]
        battle_title = language[str(row["lan_battle"])]
        if row["chance"] <= 0 or attribute["value"] <= 0 or not row["icon"] or not title or not battle_title:
            raise ValueError(f"永恒梦境强化权重、数值或显示资料无效：{row['idx']}")
        result.append({
            "id": row["idx"],
            "category": row["type"],
            "attributeId": attr_id,
            "value": attribute["value"],
            "addType": mode,
            "weight": row["chance"],
            "icon": row["icon"],
            "titleLanguageId": row["lan_title"],
            "battleLanguageId": row["lan_battle"],
            "title": title.replace("\\\\n", "\n").replace("\\n", "\n"),
            "battleTitle": battle_title,
        })
    groups = [row["category"] for row in result]
    if [row["id"] for row in result] != list(range(1, 11)) or set(groups) != {1, 2, 3}:
        raise ValueError("永恒梦境强化候选组缺失或配置编号错误")
    return result


def milestones(source, known_items):
    """按原首次通关档位生成奖励并检查从第五层到第九百层的连续档位。"""
    rules = sorted(rows(source, "infinitefirstreward"), key=lambda row: row["idx"])
    if [row["idx"] for row in rules] != list(range(5, 901, 5)):
        raise ValueError("永恒梦境里程碑缺层或重复")
    return [{"floor": row["idx"], "rewards": rewards(row["reward"], known_items)} for row in rules]


def rank_rewards(source, known_items):
    """读取前五十名奖励，拒绝重叠或间断的积分排名区间。"""
    result = []
    last_rank = 0
    for row in sorted(rows(source, "infiniterankreward"), key=lambda row: row["rank_min"]):
        if row["rank_min"] != last_rank + 1 or row["rank_max"] < row["rank_min"]:
            raise ValueError(f"永恒梦境排名奖励区间无效：{row['idx']}")
        last_rank = row["rank_max"]
        result.append({
            "id": row["idx"],
            "minRank": row["rank_min"],
            "maxRank": last_rank,
            "rewards": rewards(row["reward"], known_items),
        })
    if last_rank != 50 or len({row["id"] for row in result}) != len(result):
        raise ValueError("永恒梦境排名奖励范围或编号无效")
    return result


def project(source):
    """生成有版本号的原始玩法规则，复核开放门槛与战斗配置。"""
    [gate] = [row for row in rows(source, "opencondition", "opencondition") if row["atom"] == "main_infinite"]
    if (gate["condition_type"], gate["world_level"]) != (1, 1):
        raise ValueError("永恒梦境人物等级或世界等级门槛已变化")
    [battle] = [row for row in rows(source, "battletype") if row["type"] == 11]
    if (battle["round_max"], battle["line_up_type"], battle["save_line_up_type"],
        battle["default_line_up_type"], battle["skip_battle"], json.loads(battle["filter_list"]),
        battle["map"]) != (10, 15, 15, 0, 0, [], "map55"):
        raise ValueError("永恒梦境战斗回合、阵容或地图规则已变化")
    if any(row["battleType"] == 11 for row in rows(source, "battleroundaddition", "battleRoundAddition")):
        raise ValueError("永恒梦境配置了尚未接入的回合属性")
    items = {row["idx"] for row in rows(source, "item", "item")}
    system = {row["key"]: row["value"] for row in rows(source, "system", "system")}
    return {
        "schemaVersion": 1,
        "minimumLevel": gate["condition_value"],
        "battleRounds": battle["round_max"],
        "formationType": battle["line_up_type"],
        "map": battle["map"],
        "battleFrequencySeconds": system["infinite_battle_frequency"],
        "buffAutoSeconds": system["infinite_buff_auto_time"],
        "resetFloorCount": system["infinite_reset_level"],
        "standardRewardFloorCount": system["infinite_standard_reward_max"],
        "buffInterval": system["infinite_buff_each_level"],
        "assistPowerRatio": system["infinite_help_battle_limit"],
        "assistDispatchRewards": rewards(system["infinite_help_reward"], items),
        "stages": stages(source, items),
        "buffs": buffs(source),
        "milestones": milestones(source, items),
        "rankRewards": rank_rewards(source, items),
    }


def rules_json(config):
    """每个配置对象占一行，便于审阅单条变更并控制大体积守军文件。"""
    fields = []
    for key, value in config.items():
        if isinstance(value, list):
            entries = [f"    {json.dumps(entry, ensure_ascii=False)}" for entry in value]
            fields.append(f'  "{key}": [\n' + ",\n".join(entries) + "\n  ]")
        else:
            fields.append(f'  "{key}": {json.dumps(value, ensure_ascii=False)}')
    return "{\n" + ",\n".join(fields) + "\n}\n"


def replay_catalog(config):
    """只投影战报校验所需的站位、模板、等级与星级。"""
    lines = [
        "/** 自动生成：tools/export_dreamland_rules.py。永恒梦境战报的原守军名册。 */",
        "export const DREAMLAND_REPLAY_ROSTERS: Readonly<Record<number,",
        "    readonly (readonly [number, number, number, number])[]>> = {",
    ]
    for stage in config["stages"]:
        lineup = [[unit["position"], unit["template"], unit["level"], unit["star"]] for unit in stage["enemies"]]
        lines.append(f'    {stage["floor"]}: {json.dumps(lineup)},')
    lines.append("};")
    return "\n".join(lines) + "\n"


def main():
    """默认核对产物和策划配置，只有显式指定 --write 才更新文件。"""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--src", type=Path, default=DEFAULT_SRC)
    args = parser.parse_args()
    config = project(args.src)
    outputs = [(RULES_OUTPUT, rules_json(config)), (REPLAY_OUTPUT, replay_catalog(config))]
    for path, contents in outputs:
        if args.write:
            path.write_text(contents, encoding="utf-8", newline="\n")
        elif not path.exists() or path.read_text(encoding="utf-8") != contents:
            raise SystemExit(f"永恒梦境投影已过期：{path.name}，请运行 tools/export_dreamland_rules.py --write")


if __name__ == "__main__":
    main()
