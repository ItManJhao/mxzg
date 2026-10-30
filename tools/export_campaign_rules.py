"""Reproduce the basic campaign's content projection. Default checks; --write updates."""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "client/assets/resources/config"
OUTPUT = ROOT / "backend/src/main/resources/gameplay/campaign-rules.json"


def project():
    def rows(name):
        return json.loads((SOURCE / (name + ".json")).read_text(encoding="utf-8-sig"))["rows"]
    types = {row["type"]: row for row in rows("herotype")}
    chapters = rows("chapter")
    starters = [10101001, 10201001, 10301001]
    needed = {(template, 1) for template in starters}
    stages = []
    for stage in rows("chapterreward"):
        if stage.get("mode_id") != 1 or not 1 <= stage["idx"] <= 20:
            continue
        enemies = [{"templateId": row["hero_type"], "star": row["hero_star"],
                    "level": row["hero_level"], "position": row["pos"]}
                   for row in chapters if row.get("mode_id") == 1 and row.get("note") == stage["idx"] and row.get("hero_type", 0) > 0]
        if not enemies:
            raise ValueError(f"Stage {stage['idx']} has no enemy")
        needed.update((enemy["templateId"], enemy["star"]) for enemy in enemies)
        stages.append({"id": stage["idx"], "enemies": enemies,
                       "rewards": [{"itemId": item["item_type"], "quantity": item["item_num"]}
                                   for item in json.loads(stage["first_reward"])]})
    heroes = [{"templateId": row["type"], "star": row["star"], "name": types[row["type"]]["note"],
               **{key: row[key] for key in ("hp", "atk", "def", "spd")}}
              for row in rows("herobase") if (row["type"], row["star"]) in needed]
    if {(hero["templateId"], hero["star"]) for hero in heroes} != needed:
        raise ValueError("Missing hero base stats")
    return {"version": "basic-attacks-v1", "starters": starters, "heroes": heroes, "stages": stages}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true")
    options = parser.parse_args()
    data = project()
    if options.write:
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    elif json.loads(OUTPUT.read_text(encoding="utf-8-sig")) != data:
        raise SystemExit("Campaign content drift: inspect game tables, then run export_campaign_rules.py --write")
    print(f"Campaign rules: {len(data['heroes'])} hero bases, {len(data['stages'])} stages; projection verified")
