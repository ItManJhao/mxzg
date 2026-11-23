"""从相同的圣器策划表生成服务端规则与前端显示投影。"""

import argparse
import json
from export_gameconfig import json_content
from export_god_equipment_rules import attributes, rows, ROOT, SOURCE


def amounts(source):
    """解析原物品消耗并保留配方顺序。"""
    return [{"itemId": row["item_type"], "quantity": row["item_num"]} for row in json.loads(source)]


def project(source=SOURCE):
    """从所选策划目录生成两格激活、八件圣器、培养配方和旧套装规则。"""
    return {
        "slots": [
            {"slot": row["place"], "level": row["level"], "star": row["start"],
             "costs": amounts(row["cost_item"]), "rewardTemplateId": row["reiki_equip_id"]}
            for row in rows("reikiequipactive", source)
        ],
        "items": [
            {"templateId": row["idx"], "slot": row["place"], "rarity": row["rare"], "setId": row["suit_id"],
             "heroMaterials": [{"templateId": material["type"], "element": material["elem"],
                                "star": material["star"], "count": material["num"],
                                "replacementItemId": material.get("replace_item", 0)}
                               for material in json.loads(row["cost_star_hero"])],
             "upgradeCosts": amounts(row["up_star_cost"]), "upgradeTargets": json.loads(row["up_star_target"]),
             "transformCosts": amounts(row["transform_cost"]), "transformTarget": row["transform_target"],
             "attributes": attributes(row["ability"]), "specialAttributes": attributes(row["special_ability"]),
             "score": row["sroce"]}
            for row in rows("reikiequip", source)
        ],
        "sets": [
            {"setId": row["suit_id"], "count": row["active_need_num"], "attributes": attributes(row["suit_ability"]),
             "skillId": row["skill"], "skillLevel": row["skill_level"], "name": row["name"]}
            for row in rows("reikiequipsuit", source)
        ],
    }


def main():
    """按统一配置序列化校验前后端产物，指定 --write 时更新两份文件。"""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true")
    options = parser.parse_args()
    expected = json_content(project())
    for path in ("backend/src/main/resources/gameplay/hero-artifacts.json",
                 "client/assets/bundles/resources/config/hero-artifacts.json"):
        target = ROOT / path
        if options.write:
            target.write_text(expected, encoding="utf-8")
        elif target.read_text(encoding="utf-8") != expected:
            raise SystemExit(f"圣器配置已漂移：{path}")
    print("圣器前后端配置一致")


if __name__ == "__main__":
    main()
