"""从原策划表生成竞技场新手段及其回放守军目录，默认核对生成结果。"""

import argparse
import json
from pathlib import Path

from export_gameconfig import DEFAULT_SRC, ROOT, loose_rows


RULES = ROOT / "backend/src/main/resources/gameplay/arena-rules.json"
REPLAY_ROSTERS = ROOT / "client/assets/scripts/config/ArenaReplayRoster.generated.ts"


def project(source):
    """保留新手段的开关、机器人成员、结算配置和原简体语言。"""
    def rows(file, sheet=None):
        """读取原始表中服务端使用的列。"""
        return loose_rows(source / f"{file}.xlsx", sheet or file)

    [gate] = [row for row in rows("opencondition") if row["atom"] == "main_pvp"]
    [battle] = [row for row in rows("battletype", "Sheet1") if row["type"] == 4]
    if (gate["condition_type"], gate["world_level"], gate["open"]) != (1, 1, 1):
        raise ValueError("竞技场开启条件变化")
    if (battle["line_up_type"], battle["default_line_up_type"], battle["save_line_up_type"],
            json.loads(battle["filter_list"])) != (0, 0, 4, []):
        raise ValueError("竞技场阵容来源变化")
    systems = {row["key"]: row["value"] for row in rows("system")}
    names = {str(row["key"]): row["value"] for row in rows("language")
             if str(row["key"]).startswith("970000")}
    teams = {}
    for row in rows("pvprobot"):
        if row["hero_type"] <= 0:
            continue
        teams.setdefault(row["team"], []).append({
            "configId": row["idx"], "position": row["pos"], "template": row["hero_type"],
            "level": row["hero_level"], "star": row["hero_star"], "modifiers": row["attr"],
            "equipment": row["equipment"], "runes": row["runes"],
        })
    bots = []
    for row in rows("pvprobotrole"):
        team = row["team"]
        enemies = teams.pop(team)
        if {unit["position"] for unit in enemies} != {2, 3, 5, 6} or len(enemies) != 4:
            raise ValueError(f"竞技场机器人 {team} 站位变化")
        bots.append({
            "id": team, "name": names[str(row["name_lang"])], "level": row["level"],
            "score": row["cup"], "avatarId": row["head"], "enemies": enemies,
        })
    if teams or [bot["id"] for bot in bots] != list(range(1, 25)):
        raise ValueError("竞技场原机器人范围与回放校验范围不一致")
    rewards = [{
        "weight": row["chance"],
        "items": [{"itemId": item["item_type"], "quantity": item["item_num"]}
                  for item in json.loads(row["reward"])],
    } for row in rows("pvpplayreward")]
    clergy = []
    for row in rows("clergyprivilege"):
        bonus = json.loads(row["unlock_privilege"])
        if bonus.get("type") == "PVP":
            clergy.append({"level": row["clergy_level"], "points": bonus["value"], "chance": bonus["chance"]})
    attack_rates = {}
    for row in rows("battleroundaddition", "battleRoundAddition"):
        if row["battleType"] != battle["type"]:
            continue
        [attributes] = json.loads(row["addition"])
        if set(attributes) != {"201"} or row["round"] in attack_rates:
            raise ValueError("竞技场回合加成类型或回合编号变化")
        attack_rates[row["round"]] = attributes["201"]
    return {
        "minimumLevel": gate["condition_value"], "freeLimit": systems["pvp_daily_free_play"],
        "ticketPriceDiamonds": systems["pvp_ticket_cost_gem"], "opponentCount": systems["pvp_random_count"],
        "newcomerWins": systems["pvp_challenge_robot_count"], "historyLimit": systems["pvp_record_max_count"],
        "roundLimit": battle["round_max"], "attackRates": attack_rates,
        "bots": bots, "rewards": rewards, "clergy": clergy,
    }


def replay_rosters(config):
    """按机器人编号冻结回放验证所需的持久战斗身份。"""
    lines = [
        "/** 自动生成：tools/export_arena_rules.py。按竞技场机器人编号校验原守军。 */",
        "export const ARENA_REPLAY_ROSTERS: Readonly<Record<number, readonly (readonly [number, number, number, number])[]>> = {",
    ]
    for bot in config["bots"]:
        lineup = [[unit["position"], unit["template"], unit["level"], unit["star"]] for unit in bot["enemies"]]
        lines.append(f'    {bot["id"]}: {json.dumps(lineup, separators=(", ", ": "))},')
    lines.extend(("};", ""))
    return "\n".join(lines)


def main():
    """从当前策划表导出两个同源投影，手工改动可由默认检查发现。"""
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=DEFAULT_SRC)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    config = project(args.source)
    generated = {
        RULES: json.dumps(config, ensure_ascii=False, separators=(",", ":")) + "\n",
        REPLAY_ROSTERS: replay_rosters(config),
    }
    for path, content in generated.items():
        if args.write:
            path.write_bytes(content.encode("utf-8"))
        elif path.read_text(encoding="utf-8") != content:
            raise SystemExit(f"竞技场投影已过期：{path}")
    print(f"arena: {len(config['bots'])} robots, {len(config['rewards'])} rewards")


if __name__ == "__main__":
    main()
