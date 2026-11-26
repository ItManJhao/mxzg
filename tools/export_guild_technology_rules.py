"""从原策划表导出公会科技点亮成本、职业属性和重置报价。

服务端使用同一份投影计算实际扣费、退还、英雄面板与战斗属性。
"""

import argparse
import json

from export_gameconfig import DEFAULT_SRC, ROOT, json_content
from export_gameconfig import loose_rows


TARGET = ROOT / "backend/src/main/resources/gameplay/guild-technology-rules.json"
PROFESSIONS = (1, 2, 3, 4)
SLOTS = 6
GOLD_ITEM_ID = 900001
DIAMOND_ITEM_ID = 900002
MEDAL_ITEM_ID = 901301


def rows(table):
    """读取名称与文件相同的原策划工作表。"""
    return loose_rows(DEFAULT_SRC / f"{table}.xlsx", table)


def amounts(raw, required):
    """确认费用各包含一次规定的资产，返回按物品编号索引的数量。"""
    source = json.loads(raw)
    result = {entry["item_type"]: entry["item_num"] for entry in source}
    if len(source) != len(required) or set(result) != required or any(
        type(quantity) is not int or quantity <= 0 for quantity in result.values()
    ):
        raise ValueError(f"公会科技费用格式无效：{raw}")
    return result


def stage_costs():
    """成本按阶段与格号顺序输出，每阶必须完整覆盖六格。"""
    source = sorted(rows("clanskillbase"), key=lambda row: (row["level"], row["attr_type"]))
    if not source or len(source) % SLOTS != 0:
        raise ValueError("公会科技的费用表缺少整阶或格子")
    result = []
    for index, row in enumerate(source):
        stage, step = index // SLOTS + 1, index % SLOTS + 1
        if (row["level"], row["attr_type"]) != (stage, step):
            raise ValueError(f"公会科技费用存在漏行或重复阶段：{stage}/{step}")
        cost = amounts(row["cost_res"], {GOLD_ITEM_ID, MEDAL_ITEM_ID})
        result.append({"stage": stage, "step": step, "gold": cost[GOLD_ITEM_ID], "medals": cost[MEDAL_ITEM_ID]})
    return result


def profession_abilities():
    """沿原职业编号 1～4 投影对应六格的属性编号和单级增量。"""
    source = sorted(rows("clanskillability"), key=lambda row: (row["occupation"], row["type"]))
    keys = [(profession, slot) for profession in PROFESSIONS for slot in range(1, SLOTS + 1)]
    if [(row["occupation"], row["type"]) for row in source] != keys:
        raise ValueError("公会科技职业属性表不再是四个职业各六格")
    return [
        {
            "profession": profession,
            "abilities": [
                {"slot": row["type"], "attributeId": row["ability"], "perLevel": row["num"]}
                for row in source if row["occupation"] == profession
            ],
        }
        for profession in PROFESSIONS
    ]


def reset_prices():
    """按重置次数编排钻石花费，新账号第一次对应原表 times=1。"""
    source = sorted(rows("clanskillresetgem"), key=lambda row: row["times"])
    if not source or [row["times"] for row in source] != list(range(1, len(source) + 1)):
        raise ValueError("公会科技重置钻石费用必须从第 1 次连续配置")
    return [amounts(row["need_gem"], {DIAMOND_ITEM_ID})[DIAMOND_ITEM_ID] for row in source]


def project():
    """校对旧客户端的重置预览与服务端全额返还一致，再组合三张科技表。"""
    settings = {row["key"]: row["value"] for row in rows("system") if "value" in row}
    stage_gap = settings["clan_skill_level_gap"]
    if type(stage_gap) is not int or stage_gap < 0:
        raise ValueError("公会科技的职业阶段差上限无效")
    percentages = [settings[f"clan_skill_reset_back_{kind}_percent"] for kind in ("gold", "donate")]
    if percentages != [100, 100]:
        raise ValueError("公会科技客户端返还比例与服务端全额返还规则存在差异")
    return {
        "stageGap": stage_gap,
        "costs": stage_costs(),
        "professions": profession_abilities(),
        "resetDiamonds": reset_prices(),
    }


def main():
    """对比策划表与发行资源，只有 --write 会重生成配置。"""
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--write", action="store_true")
    mode.add_argument("--check", action="store_true")
    options = parser.parse_args()
    expected = json_content(project())
    if options.write:
        TARGET.write_text(expected, encoding="utf-8")
    elif TARGET.read_text(encoding="utf-8") != expected:
        raise SystemExit("公会科技配置已漂移，请检查原表或显式重新导出")
    print("公会科技的点亮费用、职业属性与重置报价和原表一致")


if __name__ == "__main__":
    main()
