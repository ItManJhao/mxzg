"""从旧策划表提取幻境之塔开放楼层、精力、扫荡和里程碑，默认核对产物。"""

import argparse
import json
from pathlib import Path

from export_gameconfig import DEFAULT_SRC, ROOT, loose_rows


FLOOR_LIMIT = 30
RULES_OUTPUT = ROOT / "backend/src/main/resources/gameplay/tower-rules.json"
REPLAY_OUTPUT = ROOT / "client/assets/scripts/config/TowerReplayRoster.generated.ts"


def project(source):
    """提取原守军、奖励、领奖公告标记及旧战斗入口，规则变化时要求复核。"""

    def rows(file, sheet=None):
        """读取旧服实际使用的列，包括源表中的未标记字段。"""
        return loose_rows(source / f"{file}.xlsx", sheet or file)

    def rewards(raw):
        """把旧奖励协议字段转换为通用奖励服务的配置物品和数量。"""
        return [{"itemId": item["item_type"], "quantity": item["item_num"]} for item in json.loads(raw)]

    [gate] = [row for row in rows("opencondition") if row["atom"] == "main_fantasy_tower"]
    if (gate["condition_type"], gate["world_level"]) != (1, 1):
        raise ValueError("幻境之塔的等级或世界等级门槛已变化")
    [battle] = [row for row in rows("battletype", "Sheet1") if row["type"] == 3]
    if (battle["round_max"], battle["line_up_type"], battle["default_line_up_type"],
        battle["save_line_up_type"], json.loads(battle["filter_list"])) != (15, 1, 0, 1, []):
        raise ValueError("幻境之塔战斗回合或出阵规则已变化")
    if any(row["battleType"] == 3 for row in rows("battleroundaddition", "battleRoundAddition")):
        raise ValueError("幻境之塔配置了尚未接入的回合属性")
    [opponent_name] = [row["value"] for row in rows("language") if str(row["key"]) == "991000001"]

    enemies = {floor: [] for floor in range(1, FLOOR_LIMIT + 1)}
    for row in rows("tower"):
        if row["mission_id"] in enemies:
            enemies[row["mission_id"]].append({
                "configId": row["idx"], "position": row["pos"], "template": row["hero_type"],
                "level": row["hero_level"], "star": row["hero_star"], "modifiers": row["attr"],
                "equipment": row["equipment"], "runes": row["runes"],
            })
    for floor, roster in enemies.items():
        if len(roster) != 6 or len({row["position"] for row in roster}) != len(roster):
            raise ValueError(f"幻境之塔第 {floor} 层守军数量或站位错误")
    floors = [{"floor": row["mission_id"], "recommendedPower": row["battle_advice"],
               "firstRewards": rewards(row["first_reward_tower"]), "sweepRewards": rewards(row["reward"]),
               "enemies": enemies[row["mission_id"]]}
              for row in rows("towerreward") if row["mission_id"] in enemies]
    if [row["floor"] for row in floors] != list(enemies):
        raise ValueError("开放楼层必须连续且拥有独立初次通关及扫荡奖励")

    sweeps = sorted(rows("towersweep"), key=lambda row: row["times"])
    if [row["times"] for row in sweeps] != list(range(1, len(sweeps) + 1)):
        raise ValueError("幻境之塔缺少某次扫荡价格")
    milestones = sorted(
        ({"id": row["idx"], "floor": row["chapter"], "rewards": rewards(row["reward"]),
          "announce": row["is_notice"] == 1}
         for row in rows("firstrewardtower") if row["chapter"] <= FLOOR_LIMIT),
        key=lambda row: row["floor"],
    )
    if [row["floor"] for row in milestones] != list(range(10, FLOOR_LIMIT + 1, 10)) or \
            len({row["id"] for row in milestones}) != len(milestones):
        raise ValueError("幻境之塔里程碑缺层或配置编号重复")
    system = {row["key"]: row["value"] for row in rows("system")}
    return {"minimumLevel": gate["condition_value"], "maxEnergy": system["tower_tickets_limit"],
            "rechargeSeconds": system["tower_tickets_regenerate_time"], "opponentName": opponent_name,
            "sweepCosts": [row["cost_gem"] for row in sweeps], "floors": floors,
            "milestones": milestones}


def replay_catalog(config):
    """投影原守军的站位、模板、等级、星级，供客户端校验真实战报名册。"""
    lines = [
        "/** 自动生成：tools/export_tower_rules.py。幻境之塔战报的原守军。 */",
        "export const TOWER_REPLAY_ROSTERS: Readonly<Record<number,",
        "    readonly (readonly [number, number, number, number])[]>> = {",
    ]
    for stage in config["floors"]:
        lineup = [[unit["position"], unit["template"], unit["level"], unit["star"]] for unit in stage["enemies"]]
        lines.append(f'    {stage["floor"]}: {json.dumps(lineup, separators=(", ", ": "))},')
    lines.append("};")
    return "\n".join(lines) + "\n"


def main():
    """显式写入两端产物，通常只检查其内容是否与策划投影一致。"""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--src", type=Path, default=DEFAULT_SRC)
    args = parser.parse_args()
    config = project(args.src)
    outputs = [(RULES_OUTPUT, json.dumps(config, ensure_ascii=False, indent=2) + "\n"),
               (REPLAY_OUTPUT, replay_catalog(config))]
    for path, contents in outputs:
        if args.write:
            path.write_text(contents, encoding="utf-8", newline="\n")
        elif not path.exists() or path.read_text(encoding="utf-8") != contents:
            raise SystemExit(f"幻境之塔投影已过期：{path.name}，请运行 tools/export_tower_rules.py --write")


if __name__ == "__main__":
    main()
