"""从原策划表提取已开放的日常副本关卡、每日次数、扣费和神职加成，默认核对产物。"""

import argparse
import json
from pathlib import Path
from typing import NamedTuple

from export_gameconfig import DEFAULT_SRC, ROOT, loose_rows

RULES_DIR = ROOT / "backend/src/main/resources/gameplay"
CLIENT_ENEMIES = ROOT / "client/assets/scripts/config/DailyGoldReplayRoster.generated.ts"


class DungeonSource(NamedTuple):
    """记录原副本类型、启用条件、神职词条和已验证的连续关卡上限。"""

    slug: str
    mission_type: int
    gate: str
    clergy_type: str
    stage_limit: int


# 守军技能及实际回放通过后，再推进对应副本的连续上限。
DUNGEONS = (
    DungeonSource("gold", 1, "main_mission_gold", "GOLD_DUNGEON", 9),
    DungeonSource("experience", 2, "main_mission_exp", "EXP_DUNGEON", 9),
    DungeonSource("hero", 3, "main_mission_hero", "HERO_DUNGEON", 9),
    DungeonSource("fetter", 4, "main_mission_fetter", "FETTER_DUNGEON", 9),
    DungeonSource("spirit", 5, "main_mission_runes", "RUNE_DUNGEON", 9),
)


def project(source, dungeon):
    """按类型读取连续关卡，同一类型的关卡共享次数、报价和神职特权。"""
    def rows(file, sheet):
        """从原工作簿读取完整行，包括旧服务端实用的未标记列。"""
        return loose_rows(source / f"{file}.xlsx", sheet)

    gates = {row["atom"]: row for row in rows("opencondition", "opencondition")
             if row["atom"] in ("main_mission", dungeon.gate)}
    if any(gates[gate]["condition_type"] != 1 or gates[gate]["world_level"] != 1
           for gate in ("main_mission", dungeon.gate)):
        raise ValueError(f"{dungeon.slug} 副本的开启条件已变化")
    minimum_level = max(row["condition_value"] for row in gates.values())
    missions = sorted([row for row in rows("dailymissionreward", "dailymissionelfreward")
                       if row["mission_type"] == dungeon.mission_type and row["mission"] <= dungeon.stage_limit],
                      key=lambda row: row["mission"])
    if [row["mission"] for row in missions] != list(range(1, dungeon.stage_limit + 1)):
        raise ValueError(f"{dungeon.slug} 副本的开放关卡必须连续且无重复")
    [battle] = [row for row in rows("battletype", "Sheet1") if row["type"] == 2]
    if (battle["round_max"], battle["line_up_type"], json.loads(battle["filter_list"])) != (15, 0, []):
        raise ValueError("日常副本的战斗或阵容规则已变化")
    if any(row["battleType"] == 2 for row in rows("battleroundaddition", "battleRoundAddition")):
        raise ValueError("日常副本配置了尚未恢复的回合加成")

    enemies = {mission["mission"]: [] for mission in missions}
    for row in rows("dailymission", "dailymissionelf"):
        if row["mission_type"] == dungeon.mission_type and row["mission_id"] in enemies:
            enemies[row["mission_id"]].append({
                "configId": row["idx"], "position": row["pos"], "template": row["hero_type"],
                "level": row["hero_level"], "star": row["hero_star"], "modifiers": row["attr"],
                "equipment": row["equipment"], "runes": row["runes"],
            })
    for stage_id, formation in enemies.items():
        if len(formation) != 6 or len({row["position"] for row in formation}) != len(formation):
            raise ValueError(f"{dungeon.slug} 副本 {stage_id} 关的敌方数量或站位无效")

    [free] = [row["value"] for row in rows("system", "system") if row["key"] == "daily_mission_free_tickets"]
    vip_limits = {row["vip_level"]: free + row["extra_resource_times"] for row in rows("goddessvip", "goddessvip")}
    costs = {}
    for row in rows("dailymissioncost", "dailymissionelfreward"):
        if row["mission_type"] != dungeon.mission_type or row["battle_num"] > max(vip_limits.values()):
            continue
        amounts = json.loads(row["cost"])
        if amounts and (len(amounts) != 1 or amounts[0]["item_type"] != 900002):
            raise ValueError(f"{dungeon.slug} 副本扣费不是已支持的单一钻石项")
        costs[row["battle_num"]] = amounts[0]["item_num"] if amounts else 0
    if sorted(costs) != list(range(1, max(vip_limits.values()) + 1)):
        raise ValueError(f"{dungeon.slug} 副本缺少某次挑战的配置价格")
    if any((cost == 0) != (attempt <= free) for attempt, cost in costs.items()):
        raise ValueError(f"{dungeon.slug} 副本免费配置与前几次价格不一致")

    clergy = []
    for row in rows("clergyprivilege", "clergyprivilege"):
        bonus = json.loads(row["unlock_privilege"])
        if bonus.get("type") == dungeon.clergy_type:
            clergy.append({"level": row["clergy_level"], "points": bonus["value"], "chance": bonus["chance"]})
    stages = [{
        "stageId": mission["mission"], "titleLanguageId": mission["lan"],
        "minimumLevel": max(minimum_level, mission["open_level"]), "requiredPower": mission["power_require"],
        "ribbon": mission["level_png"], "rewardPreview": [{"itemId": item["item_type"], "quantity": item["item_num"]}
            for item in json.loads(mission["reward"])], "enemies": enemies[mission["mission"]],
    } for mission in missions]
    return {"freeLimit": free, "vipLimits": vip_limits, "costs": costs, "clergy": clergy, "stages": stages}


def replay_catalog(configs):
    """按类型及关卡号投影战报校验所需的敌方位置、模板、等级和星级。"""
    lines = [
        "/** 自动生成：tools/export_daily_gold_rules.py。按副本类型和关卡号校验原守军。 */",
        "type ReplayRoster = Readonly<Record<number, readonly (readonly [number, number, number, number])[]>>;",
    ]
    for slug, config in configs.items():
        lines.extend(("", f"export const DAILY_{slug.upper()}_REPLAY_ROSTERS: ReplayRoster = {{"))
        for stage in config["stages"]:
            lineup = [[unit["position"], unit["template"], unit["level"], unit["star"]] for unit in stage["enemies"]]
            lines.append(f'    {stage["stageId"]}: {json.dumps(lineup, separators=(", ", ": "))},')
        lines.append("};")
    lines.extend(("", "export const DAILY_DUNGEON_REPLAY_ROSTERS = {"))
    lines.extend(f"    {slug}: DAILY_{slug.upper()}_REPLAY_ROSTERS," for slug in configs)
    lines.append("} as const;")
    return "\n".join(lines) + "\n"


def main():
    """写入或核对服务端规则及其战报校验投影，可用正式服源表交叉核对。"""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--src", type=Path, default=DEFAULT_SRC)
    args = parser.parse_args()
    configs = {dungeon.slug: project(args.src, dungeon) for dungeon in DUNGEONS}
    outputs = [(RULES_DIR / f"daily-{slug}-rules.json", json.dumps(config, ensure_ascii=False, indent=2) + "\n")
               for slug, config in configs.items()]
    outputs.append((CLIENT_ENEMIES, replay_catalog(configs)))
    for path, content in outputs:
        if args.write:
            path.write_text(content, encoding="utf-8", newline="\n")
        elif not path.exists() or path.read_text(encoding="utf-8") != content:
            raise SystemExit(f"日常副本投影已过期：{path.name}，请运行 tools/export_daily_gold_rules.py --write")


if __name__ == "__main__":
    main()
