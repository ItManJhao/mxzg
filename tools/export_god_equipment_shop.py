"""从同源策划表导出神装图鉴、固定货架和只在服务端使用的兑换奖池。"""

import argparse
from export_gameconfig import json_content
from export_god_equipment_rules import ROOT, SOURCE, rows, attributes, item_quantity


BACKEND = ROOT / "backend/src/main/resources/gameplay/god-equipment-shop.json"
CLIENT = ROOT / "client/assets/bundles/resources/config/hero-god-equipment-catalog.json"


def project(source=SOURCE):
    """读取指定目录，校验货架与奖池，分别返回服务端兑换规则及客户端图鉴。"""
    control = next(row for row in rows("shopcontrol", source) if row["idx"] == 101600)
    currency = control["cost_item"]
    if (
        control["auto_refresh_mode"] != 1
        or control["goods_limit"] != 0
        or control["manual_refresh_mode"] != 0
        or control["show_time"] != 1
        or currency != 901812
    ):
        raise ValueError("神装商城仍需固定货架、每日重置和原价货币")

    templates = {row["equipment_type"]: row for row in rows("godequipment", source)}
    items = {row["idx"]: row for row in rows("item", source)}
    exchange = rows("itemexchange", source)
    goods = []
    pools = {}
    for row in rows("shopgodequipment", source):
        item_id, quantity = item_quantity(row["item_type"])
        cost_id, cost = item_quantity(row["need_item"])
        item_kind = items[item_id]["type"]
        if cost_id != currency or row["buy_limit"] < 0 or item_kind not in (6, 14):
            raise ValueError(f"神装商城不支持商品 {row['idx']} 的价格、限购或发奖类型")
        goods.append({
            "productId": row["idx"],
            "section": row["type"],
            "itemId": item_id,
            "quantity": quantity,
            "costQuantity": cost,
            "purchaseLimit": row["buy_limit"],
        })
        if item_kind != 14:
            continue
        pool = []
        for candidate in exchange:
            if candidate["item_type"] != item_id:
                continue
            template_id, count = item_quantity(candidate["reward"])
            template = templates[template_id]
            if candidate["weight"] <= 0 or template["settype"] != row["type"] or template["star"] != 1:
                raise ValueError(f"神装商城商品 {row['idx']} 的兑换权重或套装不符")
            pool.append({"templateId": template_id, "quantity": count, "weight": candidate["weight"]})
        if not pool or len({templates[item["templateId"]]["place"] for item in pool}) != 1:
            raise ValueError(f"神装商城商品 {row['idx']} 缺少同部位兑换奖池")
        pools[item_id] = pool

    catalog = sorted(
        ({
            "templateId": row["equipment_type"],
            "star": row["star"],
            "setType": row["settype"],
            "attributes": attributes(row["ability"]),
        } for row in templates.values() if row["rare"] > 3 and row["star"] <= 5),
        key=lambda row: (row["star"], row["setType"], row["templateId"]),
    )
    sets = [{
        "setType": row["settype"],
        "star": row["star"],
        "count": row["num"],
        "attributes": attributes(row["ability"]),
        "skillId": row["skill"],
    } for row in rows("godequipmentsettype", source)]
    return (
        {"currency": currency, "products": goods, "pools": pools},
        {"currency": currency, "products": goods, "equipment": catalog, "sets": sets},
    )


def main():
    """按统一配置序列化校验双端投影，--write 时才写入生成结果。"""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true")
    options = parser.parse_args()
    for output, payload in zip((BACKEND, CLIENT), project()):
        expected = json_content(payload)
        if options.write:
            output.write_text(expected, encoding="utf-8")
        elif not output.exists() or output.read_text(encoding="utf-8") != expected:
            raise SystemExit(f"神装图鉴或商店投影过期：{output.relative_to(ROOT)}")
    print("神装图鉴、商城及兑换奖池投影一致")


if __name__ == "__main__":
    main()
