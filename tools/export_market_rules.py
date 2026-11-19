"""从原策划表导出普通市场商品、刷新规则和开启条件，默认核对产物。"""

import argparse
import json
from collections import Counter

from export_gameconfig import DEFAULT_SRC, ROOT, loose_rows

OUTPUT = ROOT / "backend/src/main/resources/gameplay/market-rules.json"


def project(source):
    """保留原商品的等级、权重和实际成交价，按原表关联女神 VIP 次数。"""
    [control] = [row for row in loose_rows(source / "shopcontrol.xlsx", "shopcontrol")
                 if row["idx"] == 100100]
    [condition] = [row for row in loose_rows(source / "opencondition.xlsx", "opencondition")
                   if row["atom"] == "main_shop"]
    if (control["auto_refresh_mode"], control["manual_refresh_mode"], control["zero_free_refresh"]) != (0, 1, 0):
        raise ValueError("普通市场的自动轮换或手动刷新规则已变化")
    if condition["condition_type"] != 1 or condition["world_level"] != 1:
        raise ValueError("普通市场的开放条件已变化")

    [refresh_cost] = json.loads(control["charge_item_cost"])
    paid = control["daily_charge_refresh"] + control["daily_free_refresh"]
    vip_limits = {row["vip_level"]: paid + row["extra_market_times"]
                  for row in loose_rows(source / "goddessvip.xlsx", "goddessvip")}
    if not vip_limits or 0 not in vip_limits or min(vip_limits.values()) <= 0:
        raise ValueError("普通市场缺少女神 VIP 付费刷新次数")

    products = []
    configured_items = {row["idx"] for row in loose_rows(source / "item.xlsx", "item")}
    for row in loose_rows(source / "shopmarket.xlsx", "shopmarket"):
        [reward] = json.loads(row["item_type"])
        [cost] = json.loads(row["need_item"])
        product = {
            "id": row["idx"], "weight": row["chance"], "minimumLevel": row["level_require_min"],
            "maximumLevel": row["level_require_max"], "itemId": reward["item_type"], "quantity": reward["item_num"],
            "costItemId": cost["item_type"], "costQuantity": cost["item_num"],
            "purchaseLimit": row["buy_limit"], "discount": row["discount"],
        }
        if (any(type(value) is not int or value <= 0 for value in product.values())
                or product["minimumLevel"] > product["maximumLevel"] or product["discount"] > 100
                or product["itemId"] not in configured_items or product["costItemId"] not in (900001, 900002)):
            raise ValueError(f"普通市场商品配置无效：{product['id']}")
        products.append(product)
    if any(count > 1 for count in Counter(product["id"] for product in products).values()):
        raise ValueError("普通市场商品编号重复")
    shelf_size = control["goods_limit"]
    for level in range(condition["condition_value"], max(product["maximumLevel"] for product in products) + 1):
        candidate_count = sum(product["minimumLevel"] <= level <= product["maximumLevel"] for product in products)
        if candidate_count < shelf_size:
            raise ValueError(f"普通市场等级 {level} 的候选不足 {shelf_size} 件")

    return {
        "minimumLevel": condition["condition_value"], "shelfSize": shelf_size,
        "freeRefreshLimit": control["max_refresh_count"], "freeRefreshSeconds": control["free_refresh_time"],
        "refreshCostItemId": refresh_cost["item_type"], "refreshCostQuantity": refresh_cost["item_num"],
        "paidLimits": vip_limits, "products": products,
    }


def main():
    """写入或核对服务端市场投影，不将商品权重打入客户端配置包。"""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    content = json.dumps(project(DEFAULT_SRC), ensure_ascii=False, separators=(",", ":")) + "\n"
    if args.write:
        OUTPUT.write_text(content, encoding="utf-8", newline="\n")
    elif OUTPUT.read_text(encoding="utf-8") != content:
        raise SystemExit("普通市场投影已过期，请运行 tools/export_market_rules.py --write")


if __name__ == "__main__":
    main()
