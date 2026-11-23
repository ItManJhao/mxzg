"""从同源策划表投影宝石、镶嵌门槛、合成配方和套装到客户端及服务端。"""

import argparse
import json
from pathlib import Path

from export_gameconfig import DEFAULT_SRC, ROOT, loose_rows


OUTPUTS = (
    ROOT / "backend/src/main/resources/gameplay/hero-jewels.json",
    ROOT / "client/assets/bundles/resources/config/hero-jewels.json",
)


def attributes(raw):
    """保留同源属性顺序和原始整数，转换为两端共用的属性列表。"""
    values = [
        {"attr": int(key), "value": value}
        for row in json.loads(raw)
        for key, value in row.items()
    ]
    if any(entry["attr"] <= 0 or type(entry["value"]) is not int for entry in values):
        raise ValueError("宝石属性格式无效")
    return values


def project(source):
    """读取宝石及套装全部数据，校对库存类型、槽位和每级配方链。"""
    jewel_rows = loose_rows(source / "jeweltype.xlsx", "equipmenttype")
    set_rows = loose_rows(source / "jewelsettype.xlsx", "equipmentsettype")
    item_rows = loose_rows(source / "item.xlsx", "item")
    system = loose_rows(source / "system.xlsx", "system")
    [slot_setting] = [row["value"] for row in system if row["key"] == "jewel_single_open_star"]
    slots = [tuple(map(int, entry.split("_"))) for entry in slot_setting.split(";") if entry]
    if [slot for slot, _ in slots] != [1, 2, 3] or any(star <= 0 for _, star in slots):
        raise ValueError("宝石槽解锁配置无效")

    item_by_id = {row["idx"]: row for row in item_rows}
    slot_rows = {}
    jewels = []
    for row in jewel_rows:
        item_id, slot, star = row["jewel_type"], row["place"], row["star"]
        item = item_by_id[item_id]
        if item["type"] != 6 or item["star"] != star or item["rare_mark"] != row["rare"]:
            raise ValueError(f"宝石物品配置不一致：{item_id}")
        jewel = {
            "itemId": item_id,
            "slot": slot,
            "star": star,
            "rarity": row["rare"],
            "recipe": [
                {"itemId": entry["item_type"], "quantity": entry["item_num"]}
                for entry in json.loads(row["need_equipment"])
            ],
            "attributes": attributes(row["ability"]),
            "fighting": attributes(row["get_fighting"]),
        }
        if slot not in dict(slots) or star <= 0 or (slot, star) in slot_rows:
            raise ValueError(f"宝石槽位或星级无效：{item_id}")
        slot_rows[slot, star] = row
        jewels.append(jewel)

    if len({entry["itemId"] for entry in jewels}) != len(jewels):
        raise ValueError("宝石配置编号重复")
    # 服务端 4106 从合成目标读取 need_equipment，旧 combine_target 不决定资格。
    # 现用表的攻击9星有悬空目标，生命1星无反向指针但生命2星具备有效配方。
    for jewel in jewels:
        slot, star = jewel["slot"], jewel["star"]
        previous = slot_rows.get((slot, star - 1))
        expected = [{"itemId": previous["jewel_type"], "quantity": 3}] if previous else []
        if (star > 1 and not previous) or jewel["recipe"] != expected:
            raise ValueError(f"宝石合成链无效：{jewel['itemId']}")

    if len({row["star"] for row in set_rows}) != len(set_rows):
        raise ValueError("宝石套装星级重复")
    sets = [{"star": row["star"], "attributes": attributes(row["attr"])} for row in set_rows]
    if not sets or any((slot, row["star"]) not in slot_rows for row in sets for slot, _ in slots):
        raise ValueError("宝石套装的星级无法达成")
    return {
        "slotStars": [{"slot": slot, "star": star} for slot, star in slots],
        "jewels": sorted(jewels, key=lambda jewel: (jewel["slot"], jewel["star"])),
        "sets": sorted(sets, key=lambda row: row["star"]),
    }


def main():
    """生成两端配置；默认核对现有文件，可指定正式服策划目录进行一致性检查。"""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--src", type=Path, default=DEFAULT_SRC)
    args = parser.parse_args()
    content = json.dumps(project(args.src), ensure_ascii=False, indent=2) + "\n"
    for output in OUTPUTS:
        if args.write:
            output.write_text(content, encoding="utf-8", newline="\n")
        elif output.read_text(encoding="utf-8") != content:
            raise SystemExit(f"宝石投影已过期：{output}")


if __name__ == "__main__":
    main()
