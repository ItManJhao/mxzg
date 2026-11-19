"""从原策划表提取金币副本首关、每日次数、扣费与神职加成，默认核对产物。"""

import argparse
import json
from pathlib import Path

from export_gameconfig import DEFAULT_SRC, ROOT, loose_rows

OUTPUT = ROOT / "backend/src/main/resources/gameplay/daily-gold-rules.json"


def project(source):
    """用旧服务端关卡号 1、金币副本类型 1，保留原守军站位和奖励。"""
    def rows(file, sheet):
        """从原工作簿读取完整行，包括旧服务端实用的未标记列。"""
        return loose_rows(source / f"{file}.xlsx", sheet)

    [gate] = [row for row in rows("opencondition", "opencondition") if row["atom"] == "main_mission"]
    if gate["condition_type"] != 1 or gate["world_level"] != 1:
        raise ValueError("日常副本的开启条件已变化")
    [mission] = [row for row in rows("dailymissionreward", "dailymissionelfreward")
                 if row["mission_type"] == 1 and row["mission"] == 1]
    [battle] = [row for row in rows("battletype", "Sheet1") if row["type"] == 2]
    if (battle["round_max"], battle["line_up_type"], json.loads(battle["filter_list"])) != (15, 0, []):
        raise ValueError("日常副本的战斗或阵容规则已变化")
    if any(row["battleType"] == 2 for row in rows("battleroundaddition", "battleRoundAddition")):
        raise ValueError("日常副本配置了尚未恢复的回合加成")

    enemies = []
    for row in rows("dailymission", "dailymissionelf"):
        if row["mission_type"] == 1 and row["mission_id"] == mission["mission"]:
            enemies.append({
                "configId": row["idx"], "position": row["pos"], "template": row["hero_type"],
                "level": row["hero_level"], "star": row["hero_star"], "modifiers": row["attr"],
                "equipment": row["equipment"], "runes": row["runes"],
            })
    if len(enemies) != 6 or len({row["position"] for row in enemies}) != len(enemies):
        raise ValueError("金币首关敌方阵容的数量或站位已变化")

    [free] = [row["value"] for row in rows("system", "system") if row["key"] == "daily_mission_free_tickets"]
    vip_limits = {row["vip_level"]: free + row["extra_resource_times"] for row in rows("goddessvip", "goddessvip")}
    costs = {}
    for row in rows("dailymissioncost", "dailymissionelfreward"):
        if row["mission_type"] != 1 or row["battle_num"] > max(vip_limits.values()):
            continue
        amounts = json.loads(row["cost"])
        if amounts and (len(amounts) != 1 or amounts[0]["item_type"] != 900002):
            raise ValueError("金币副本扣费不是已支持的单一钻石项")
        costs[row["battle_num"]] = amounts[0]["item_num"] if amounts else 0
    if sorted(costs) != list(range(1, max(vip_limits.values()) + 1)):
        raise ValueError("金币副本缺少某次挑战的配置价格")
    if any((cost == 0) != (attempt <= free) for attempt, cost in costs.items()):
        raise ValueError("金币副本免费配置与前几次价格不一致")

    clergy = []
    for row in rows("clergyprivilege", "clergyprivilege"):
        bonus = json.loads(row["unlock_privilege"])
        if bonus.get("type") == "GOLD_DUNGEON":
            clergy.append({"level": row["clergy_level"], "points": bonus["value"], "chance": bonus["chance"]})
    rewards = [{"itemId": item["item_type"], "quantity": item["item_num"]} for item in json.loads(mission["reward"])]
    return {
        "stageId": mission["mission"], "titleLanguageId": mission["lan"],
        "minimumLevel": max(gate["condition_value"], mission["open_level"]), "requiredPower": mission["power_require"],
        "freeLimit": free, "vipLimits": vip_limits, "costs": costs, "rewardPreview": rewards,
        "clergy": clergy, "enemies": enemies,
    }


def main():
    """写入或核对唯一服务端规则投影，可用正式服源表交叉核对。"""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--src", type=Path, default=DEFAULT_SRC)
    args = parser.parse_args()
    content = json.dumps(project(args.src), ensure_ascii=False, indent=2) + "\n"
    if args.write:
        OUTPUT.write_text(content, encoding="utf-8", newline="\n")
    elif OUTPUT.read_text(encoding="utf-8") != content:
        raise SystemExit("金币副本投影已过期，请运行 tools/export_daily_gold_rules.py --write")


if __name__ == "__main__":
    main()
