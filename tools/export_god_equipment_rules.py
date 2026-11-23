"""从当前原版策划表导出神装实例、套装、随机属性和探宝奖池。"""

import argparse
import json
from pathlib import Path

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "config/gameconfig"
OUTPUT = ROOT / "backend/src/main/resources/gameplay/god-equipment-rules.json"


def rows(name, source=SOURCE):
    """从指定策划目录的首张工作表读取有效行，缺表时向导出调用方报告实际路径。"""
    book = load_workbook(source / (name + ".xlsx"), read_only=True, data_only=True)
    try:
        content = list(book.worksheets[0].values)
        return [dict(zip(content[2], row)) for row in content[3:] if type(row[0]) is int]
    finally:
        book.close()


def attributes(text):
    """把原属性 JSON 表投影成有类型和值的属性行，保留历史顺序。"""
    raw = json.loads(text)
    return [{"type": int(key), "value": value} for entry in raw for key, value in entry.items()]


def item_quantity(raw):
    """探宝奖池和付费规则每行都是一个正数量的物品。"""
    [item] = json.loads(raw)
    if type(item["item_type"]) is not int or item["item_type"] <= 0:
        raise ValueError("神装探宝物品编号无效")
    if type(item["item_num"]) is not int or item["item_num"] <= 0:
        raise ValueError("神装探宝物品数量无效")
    return item["item_type"], item["item_num"]


def project():
    """选取实际实现所用的配置并验证同源关联，避免生成无规则的资产。"""
    system = {row["key"]: row["value"] for row in rows("system")}
    definitions = [{
        "templateId": row["equipment_type"], "slot": row["place"], "star": row["star"],
        "quality": row["rare"], "setType": row["settype"], "attributes": attributes(row["ability"]),
    } for row in rows("godequipment")]
    sets = [{
        "setType": row["settype"], "star": row["star"], "count": row["num"],
        "attributes": attributes(row["ability"]), "skillId": row["skill"],
    } for row in rows("godequipmentsettype")]
    modifiers = [{
        "slot": row["place"], "star": row["star"], "type": row["ability_type"],
        "level": row["level"], "attributes": attributes(row["ability"]),
    } for row in rows("godequipmentrandomability")]
    modifier_types = [{
        "slot": row["place"], "type": row["ability_type"], "weight": row["weight"],
    } for row in rows("godequipmentrandomabilitytype")]
    qualities = [{
        "quality": row["equipment_rare"], "count": row["random_ability_num"], "startLevel": row["random_ability_start_level"],
    } for row in rows("godequipmentrare")]
    draw_types = [{"type": row["type"], "weight": row["weight"]} for row in rows("godequipmentlotterytype")]
    draw_rewards = []
    for row in rows("godequipmentlottery"):
        # 原表当前无特殊可见周期。若策划新增，生成时要求实现对应计数，再同步投影。
        if row["show_min"] != 0 or row["show_max"] != 0:
            raise ValueError(f"神装探宝出现需支持特殊周期的配置：{row['idx']}")
        item_id, count = item_quantity(row["reward"])
        draw_rewards.append({
            "type": row["reward_type"], "templateId": item_id, "quantity": count,
            "weight": row["weight"], "guarantee": row["guarantee"] == 1,
        })
    ticket, tickets_one = item_quantity(system["god_equipment_lottery_one_item"])
    ticket_ten, tickets_ten = item_quantity(system["god_equipment_lottery_ten_item"])
    gem, diamonds_one = item_quantity(system["god_equipment_lottery_one_gem"])
    gem_ten, diamonds_ten = item_quantity(system["god_equipment_lottery_ten_gem"])
    if ticket != ticket_ten or gem != gem_ten or gem != 900002:
        raise ValueError("神装单次和十次探宝的付费物品类型不一致")
    return {
        "requiredRoleLevel": system["god_equipment_main_level"],
        # 用户按日服客户端的实装门槛确认世界等级 1，原策划表的通用值为 65。
        "requiredWorldLevel": 1,
        "requiredHeroStar": system["god_equipment_hero_star"],
        "definitions": definitions, "sets": sets, "modifiers": modifiers,
        "modifierTypes": modifier_types, "qualities": qualities, "drawTypes": draw_types,
        "drawRewards": draw_rewards, "drawCost": {
            "ticket": ticket, "ticketsOne": tickets_one, "ticketsTen": tickets_ten,
            "diamondsOne": diamonds_one, "diamondsTen": diamonds_ten,
            "guarantee": system["god_equipment_lottery_guarantee"],
        },
    }


def main():
    """默认比较版本漂移，指定 --write 明确重新生成。"""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true")
    options = parser.parse_args()
    expected = json.dumps(project(), ensure_ascii=False, separators=(",", ":")) + "\n"
    if options.write:
        OUTPUT.write_text(expected, encoding="utf-8")
    elif OUTPUT.read_text(encoding="utf-8") != expected:
        raise SystemExit("神装配置投影过期，请核对源表后使用 --write")
    print("神装配置投影一致")


if __name__ == "__main__":
    main()
