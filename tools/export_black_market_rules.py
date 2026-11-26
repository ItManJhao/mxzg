"""从原策划表导出黑市页签、货架和刷新规则，由服务端提供展示与成交依据。"""

import argparse
import json

from export_gameconfig import DEFAULT_SRC, ROOT, loose_rows


OUTPUT = ROOT / "backend/src/main/resources/gameplay/black-market-rules.json"
STALL = 100800
ARENA = 100500

# 有些旧工作簿沿用复制模板页名。竞技货架由现有竞技场规则提供。
CATALOGS = {
    STALL: ("shopstall", "shopstall"),
    101000: ("shophero", "shopprophecy"),
    100300: ("shopprophecy", "shopprophecy"),
    102100: ("shopsuperrank", "shopsuperhero"),
    102300: ("shoptimetower", "shopsuperhero"),
    101500: ("shopfashion", "shopprophecy"),
    102200: ("shopfloatingisland", "shopsuperhero"),
    102500: ("shopdifferentworld", "shopprophecy"),
    102800: ("shopcountrywar", "shopcountrywar"),
    101700: ("shopchampion", "shopchampion"),
}


def project(source):
    """保留原页签门槛和实际价格。活动未接通的页签只导出策划目录。"""
    [gate] = [row for row in loose_rows(source / "opencondition.xlsx", "opencondition")
              if row["atom"] == "main_black_market"]
    if gate["condition_type"] != 1 or gate["world_level"] != 1:
        raise ValueError("黑市开放条件已变化")

    controls = {row["idx"]: row for row in loose_rows(source / "shopcontrol.xlsx", "shopcontrol")}
    stall = controls[STALL]
    if (stall["goods_limit"], stall["auto_refresh_mode"], stall["auto_goods_refresh"],
            stall["auto_limits_refresh"], stall["cost_item"]) != (0, 1, 1, 1, 900002):
        raise ValueError("黑市道具摊位规则已变化")

    pages = sorted(loose_rows(source / "blackshopconfig.xlsx", "battlehalo"), key=lambda row: row["idx"])
    if len(pages) != len(CATALOGS) + 1 or {row["tag"] for row in pages} != set(CATALOGS) | {ARENA}:
        raise ValueError("黑市实际页签归属已变化")
    language_ids = {str(row["label"]) for row in pages}
    names = {str(row["key"]): row["value"] for row in loose_rows(source / "language.xlsx", "language")
             if str(row["key"]) in language_ids}
    item_ids = {row["idx"] for row in loose_rows(source / "item.xlsx", "item")}
    tabs = []
    for row in pages:
        shop_type = row["tag"]
        control = controls[shop_type]
        if row["level"] < 1 or control["manual_refresh_mode"] != 0 or control["auto_refresh_mode"] not in (0, 1, 2, 3):
            raise ValueError(f"黑市页签刷新或等级配置已变化：{shop_type}")
        source_file = CATALOGS.get(shop_type)
        products = [] if source_file is None else project_catalog(source, source_file, item_ids, shop_type)
        tabs.append({
            "shopType": shop_type, "name": names[str(row["label"])], "minimumLevel": row["level"],
            "refreshMode": control["auto_refresh_mode"], "currencyItemId": control["cost_item"],
            "showRefreshTime": control["show_time"] == 1, "products": products,
        })
    return {"minimumLevel": gate["condition_value"], "tabs": tabs}


def project_catalog(source, source_file, item_ids, shop_type):
    """提取各摊位的一份商品和对应成交价格，拒绝丢失多项奖励或价格。"""
    basename, sheet = source_file
    products = []
    for row in loose_rows(source / f"{basename}.xlsx", sheet):
        [reward] = json.loads(row["item_type"])
        [cost] = json.loads(row["need_item"])
        product = {
            "id": row["idx"], "minimumLevel": row.get("appear_level", 1),
            "requiredClergy": row.get("clergy_require", 0), "itemId": reward["item_type"],
            "quantity": reward["item_num"], "costItemId": cost["item_type"],
            "costQuantity": cost["item_num"], "purchaseLimit": row["buy_limit"],
            "discount": row.get("discount", 100),
        }
        if (any(type(value) is not int or value < 0 for value in product.values())
                or any(product[key] == 0 for key in ("id", "minimumLevel", "quantity", "costQuantity", "discount"))
                or product["discount"] > 100 or product["itemId"] not in item_ids
                or product["costItemId"] not in item_ids or row.get("noble_require", 0) != 0
                or shop_type == STALL and (product["costItemId"] != 900002 or product["purchaseLimit"] <= 0)):
            raise ValueError(f"黑市商品配置无效：{shop_type}/{product['id']}")
        products.append(product)
    if not products or len(products) != len({product["id"] for product in products}):
        raise ValueError(f"黑市货架为空或商品编号重复：{shop_type}")
    return sorted(products, key=lambda product: product["id"])


def main():
    """仅显式传入 --write 时更新服务端投影，默认检查策划表与产物一致。"""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    content = json.dumps(project(DEFAULT_SRC), ensure_ascii=False, separators=(",", ":")) + "\n"
    if args.write:
        OUTPUT.write_text(content, encoding="utf-8", newline="\n")
    elif OUTPUT.read_text(encoding="utf-8") != content:
        raise SystemExit("黑市投影已过期，请运行 tools/export_black_market_rules.py --write")


if __name__ == "__main__":
    main()
