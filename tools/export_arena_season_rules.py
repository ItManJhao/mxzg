"""从旧策划表生成竞技场排名奖励、赛季宝箱、点赞及兑换规则。"""

import argparse
import json
from pathlib import Path

from export_gameconfig import DEFAULT_SRC, ROOT, loose_rows


DESTINATION = ROOT / "backend/src/main/resources/gameplay/arena-season-rules.json"


def project(source):
    """保留原奖励档、邮件文字和竞技场商店的完整固定目录。"""
    def rows(table):
        """读取原表的全部有效字段。"""
        return loose_rows(source / f"{table}.xlsx", table)

    def items(raw):
        """把原资产配置投影为统一服务端奖励格式。"""
        return [{"itemId": item["item_type"], "quantity": item["item_num"]} for item in json.loads(raw)]

    def tiers(table, scene):
        """顺次展开名次上限，绑定原本服结算邮件标题与正文。"""
        data = []
        first = 1
        for row in sorted(rows(table), key=lambda item: item["rank"]):
            last = row["rank"]
            if first > last:
                raise ValueError(f"{table} 的奖励档重复或有误")
            data.append({"minRank": first, "maxRank": last, "rewards": items(row["reward"])})
            first = last + 1
        mail = scene_rows[scene]
        return {"tiers": data, "title": names[mail["title_lang"]], "content": names[mail["content_lang"]]}

    controls = {row["key"]: row["value"] for row in rows("system")}
    scene_rows = {row["idx"]: row for row in rows("mail") if row["idx"] in (31, 32)}
    names = {row["key"]: row["value"] for row in rows("language")
             if row["key"] in (990000311, 990000312, 990000321, 990000322)}
    [shop] = [row for row in rows("shopcontrol") if row["idx"] == 100500]
    if (shop["goods_limit"], shop["auto_refresh_mode"], shop["cost_item"], shop["manual_refresh_mode"]) != (0, 2, 900901, 0):
        raise ValueError("竞技场商店的原刷新或价格类型变化")
    offers = []
    for values in rows("shoppvpnormal"):
        [price] = items(values["need_item"])
        if price["itemId"] != shop["cost_item"] or values.get("limit_type", 0) not in (0, None):
            raise ValueError(f"竞技场商品 {values['idx']} 使用新购买配置")
        offers.append({"id": values["idx"], "requiredLevel": values["appear_level"],
                       "purchaseLimit": values["buy_limit"], "price": price["quantity"],
                       "rewards": items(values["item_type"])})
    return {
        "daily": tiers("pvpdailyreward", 31),
        "season": tiers("pvpweeklyreward", 32),
        "cupReduction": [int(value) for value in controls["pvp_cup_reduce_factor"].split("_")],
        "likeLimit": controls["pvp_like_times_daily"], "likeRewards": items(controls["pvp_like_reward"]),
        "chests": [{"id": row["idx"], "requiredChallenges": row["times"], "boxPic": row["box_pic"],
                    "rewards": items(row["reward"])} for row in rows("pvptimesreward")],
        "shopCurrency": shop["cost_item"], "offers": offers,
    }


def main():
    """默认核对投影一致性，显式传 --write 才覆盖派生文件。"""
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=DEFAULT_SRC)
    parser.add_argument("--write", action="store_true")
    options = parser.parse_args()
    content = json.dumps(project(options.source), ensure_ascii=False, separators=(",", ":")) + "\n"
    if options.write:
        DESTINATION.write_bytes(content.encode("utf-8"))
    elif not DESTINATION.is_file() or DESTINATION.read_text(encoding="utf-8") != content:
        raise SystemExit(f"竞技场赛季规则派生文件已过期：{DESTINATION}")
    print("竞技场赛季、每日、点赞和兑换配置通过")


if __name__ == "__main__":
    main()
