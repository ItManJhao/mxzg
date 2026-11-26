"""从旧版策划表导出勇者试炼的难度、关卡、机器人和兑换货架。

服务端负责选敌、战斗及资产事务。配置校验只确认原始数据完整性。
"""

import argparse
from collections import defaultdict
import json
from pathlib import Path

from export_gameconfig import DEFAULT_SRC, ROOT, loose_rows


RULES_PATH = ROOT / "backend/src/main/resources/gameplay/trial-rules.json"
SHOP_PATH = ROOT / "backend/src/main/resources/gameplay/trial-shop-rules.json"
TRIAL_CURRENCY = 901201


def read(source, file, sheet=None):
    """读取项目原表工作表，保留未进入客户端的敌方参数。"""
    return loose_rows(source / f"{file}.xlsx", sheet or file)


def rewards(raw, known_items):
    """将原物品 ID、数量转换为发奖字段，拒绝未知或非正数的配置。"""
    result = []
    for item in json.loads(raw):
        item_id, quantity = item["item_type"], item["item_num"]
        if item_id not in known_items or not isinstance(quantity, int) or quantity <= 0:
            raise ValueError(f"试炼物品配置无效：{item}")
        result.append({"itemId": item_id, "quantity": quantity})
    if not result:
        raise ValueError("试炼奖励不能为空")
    return result


def stages(source, known_items):
    """按难度保持旧版 20 个地图节点、15 场挑战和 5 个宝箱的顺序。"""
    result = []
    for row in sorted(read(source, "adventurereward"), key=lambda row: row["idx"]):
        node = row["mission"]
        reward_node = node % 4 == 0
        if (row["type"] == 2) != reward_node or not 1 <= row["reset_begin_idx"] <= 20:
            raise ValueError(f"试炼节点规则无效：{row['idx']}")
        result.append({
            "difficulty": row["level"], "node": node, "type": row["type"],
            "displayLevel": row["show_mission"], "resetNode": row["reset_begin_idx"],
            "enemyPowerLow": row["enemy_rate_low"], "enemyPowerHigh": row["enemy_rate_up"],
            "rewards": rewards(row["reward"], known_items),
        })
    if [(row["difficulty"], row["node"]) for row in result] != [
        (difficulty, node) for difficulty in range(1, 4) for node in range(1, 21)
    ]:
        raise ValueError("试炼难度或地图节点有缺行或重复")
    return result


def robots(source):
    """按原机器人队号保存头像、战力、英雄位置及原始战斗成长参数。"""
    rosters = defaultdict(list)
    for row in read(source, "adventurerobot", "advanturerobot"):
        rosters[row["team"]].append({
            "configId": row["idx"], "position": row["pos"], "template": row["hero_type"],
            "level": row["hero_level"], "star": row["hero_star"], "modifiers": row["attr"],
            "equipment": row["equipment"], "runes": row["runes"],
        })
    result = []
    for row in read(source, "adventurerobotrole"):
        roster = sorted(rosters.pop(row["team"]), key=lambda unit: unit["position"])
        if len(roster) != 6 or len({unit["position"] for unit in roster}) != 6:
            raise ValueError(f"试炼机器人阵容无效：{row['team']}")
        result.append({
            "id": row["team"], "level": row["level"], "avatarId": row["head"],
            "power": row["fighting"], "enemies": roster,
        })
    if rosters:
        raise ValueError("试炼机器人阵容缺少角色表关联")
    return result


def shop(source, known_items, minimum_level):
    """投影原固定货位和每期上限，0 表示该商品不限购。"""
    products = []
    for row in read(source, "shopadventure"):
        [reward] = rewards(row["item_type"], known_items)
        [price] = rewards(row["need_item"], known_items)
        if price["itemId"] != TRIAL_CURRENCY or row["buy_limit"] < 0 or row["appear_level"] < 1:
            raise ValueError(f"试炼兑换配置无效：{row['idx']}")
        products.append({"id": row["idx"], "reward": reward, "price": price["quantity"],
                         "purchaseLimit": row["buy_limit"], "appearLevel": row["appear_level"]})
    return {"minimumLevel": minimum_level, "currencyItemId": TRIAL_CURRENCY, "products": products}


def configuration(source):
    """用同源门槛和控制值合并试炼挑战与周货架两份服务端配置。"""
    minimum_level = next(row["condition_value"] for row in read(source, "opencondition")
                         if row["atom"] == "main_proving_lang")
    known_items = {row["idx"] for row in read(source, "item")}
    system = {row["key"]: row.get("value") for row in read(source, "system")}
    difficulties = [{"id": row["level"], "minimumPower": row["bat"],
                     "previewRewards": rewards(row["reward"], known_items)}
                    for row in read(source, "adventurelevel", "adventurereward")]
    rules = {
        # 旧 battletype 类型 6 和 BattleConstant 共用十五回合，背景为 map35。
        "schemaVersion": 1, "minimumLevel": minimum_level, "battleRounds": 15, "map": "map35",
        "heroMinimumLevel": 40, "difficultyChoosePower": system["adventure_level_choose_score"],
        "assistDispatchLimit": system["adventure_assist_num"],
        "assistSelectLimit": system["adventure_get_assist_num"],
        "assistPowerRatio": system["adventure_assist_score_limit"],
        "assistRewards": rewards(system["adventure_assist_reward"], known_items),
        "reviveLimit": 0, "reviveCost": None, "difficulties": difficulties,
        "stages": stages(source, known_items), "robots": robots(source),
    }
    return {RULES_PATH: rules, SHOP_PATH: shop(source, known_items, minimum_level)}


def main():
    """导出规则或在持续检查中判定提交配置是否与所选原表一致。"""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--src", type=Path, default=DEFAULT_SRC)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    for path, value in configuration(args.src).items():
        contents = json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n"
        if args.check:
            if path.read_text(encoding="utf-8") != contents:
                raise ValueError(f"试炼规则与原表不一致：{path}")
        else:
            path.write_text(contents, encoding="utf-8", newline="\n")
        print(path.relative_to(ROOT))


if __name__ == "__main__":
    main()
