"""从策划表导出召唤的两级权重、保底奖组和高级单抽钻石价格。"""

import argparse
import json

from export_gameconfig import DEFAULT_SRC, ROOT, loose_rows

OUTPUT = ROOT / "backend/src/main/resources/gameplay/hero-summon-pools.json"


def project_full(src=DEFAULT_SRC):
    """按旧抽取顺序保留各池星级和星内权重，并归档实际引用的高级保底奖组。"""
    stars = loose_rows(src / "lotterytype.xlsx", "lotterytype")
    heroes = loose_rows(src / "lotteryweight.xlsx", "lotteryweight")
    system = {row["key"]: row["value"] for row in loose_rows(src / "system.xlsx", "system")}
    reward_groups = loose_rows(src / "rewardgroup.xlsx", "rewardgroup")
    prices = loose_rows(src / "shopseniorticket.xlsx", "shopseniorticket")
    pools = {}
    for index, (name, chance) in enumerate([
        ("NORMAL", "chance_normal"), ("FRIENDSHIP", "chance_friend"),
        ("ADVANCED", "chance_advance"), ("POINTS", "chance_point"),
    ], 1):
        pool = []
        for star in stars:
            if star["lottery_type"] != index or star["chance"] == 0:
                continue
            choices = [
                {"id": hero["hero_type"], "weight": hero[chance]}
                for hero in heroes if hero["star"] == star["star"] and hero[chance] != 0
            ]
            if star["chance"] < 0 or not choices or any(choice["weight"] < 0 for choice in choices):
                raise ValueError(f"{name} 星级 {star['star']} 权重池无效")
            pool.append({
                "star": star["star"], "weight": star["chance"], "heroes": choices,
                "lower": star["happen_lower_times"], "upper": star["happen_upper_times"],
            })
        if not pool:
            raise ValueError(f"{name} 召唤星级池为空")
        pools[name] = pool
    groups = {}
    for key in [
        "adv_summon_t1_guarantee_reward_group", "adv_summon_guarantee_reward_group",
        "first_adv_summon_guarantee_reward_group",
    ]:
        group_id = system[key]
        group = []
        for row in reward_groups:
            if row["group_id"] != group_id or not row["weight"]:
                continue
            [item] = json.loads(row["item"])
            if item["item_num"] != 1 or row["weight"] < 0:
                raise ValueError(f"召唤奖组 {group_id} 未给出一个有效英雄")
            group.append({"id": item["item_type"], "weight": row["weight"]})
        if not group:
            raise ValueError(f"召唤奖组 {group_id} 权重池为空")
        groups[group_id] = group
    [one_price] = [row["need_gem"] for row in prices if row["item_num"] == 1]
    return {"pools": pools, "groups": groups, "advancedSingleDiamonds": one_price}


def main():
    """检查生成结果与源策划一致，显式写入时更新召唤权重投影。"""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    content = json.dumps(project_full(), ensure_ascii=False, separators=(",", ":")) + "\n"
    if args.write:
        OUTPUT.write_text(content, encoding="utf-8", newline="\n")
    elif OUTPUT.read_text(encoding="utf-8") != content:
        raise SystemExit("召唤池投影已过期，请运行 tools/export_normal_summon.py --write")


if __name__ == "__main__":
    main()
