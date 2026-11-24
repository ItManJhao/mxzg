"""从原开放条件和公会等级表导出当前公会阶段的服务端门槛与人数上限。"""

import argparse

from export_gameconfig import DEFAULT_SRC, ROOT, json_content, loose_rows


TARGET = ROOT / "backend/src/main/resources/gameplay/guild-rules.json"
# 负责人确认公会使用日服 system.lua 的 64 个显示字节。角色名字保留独立的本项目规则。
JP_GUILD_NAME_LIMIT = 64


def project():
    """选择原 main_clan 入口和一级公会，只投影已接入的等级条件与人数上限。"""
    gate = next(row for row in loose_rows(DEFAULT_SRC / "opencondition.xlsx", "opencondition")
                if row["atom"] == "main_clan")
    level = next(row for row in loose_rows(DEFAULT_SRC / "clanlevel.xlsx", "clanlevel")
                 if row["level"] == 1)
    if gate["open"] != 1 or gate["condition_type"] != 1:
        raise ValueError("公会开放条件不再是启用的角色等级门槛")
    return {
        "levelRequired": gate["condition_value"],
        "worldLevelRequired": gate["world_level"],
        "capacity": level["member"],
        "nameLimit": JP_GUILD_NAME_LIMIT,
    }


def main():
    """默认检查原表投影漂移；只有指定 --write 才更新服务端文件。"""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true")
    options = parser.parse_args()
    expected = json_content(project())
    if options.write:
        TARGET.write_text(expected, encoding="utf-8")
    elif TARGET.read_text(encoding="utf-8") != expected:
        raise SystemExit("公会配置已漂移，请检查策划表或显式重新导出")
    print("公会开放条件与人数配置一致")


if __name__ == "__main__":
    main()
