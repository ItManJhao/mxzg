"""导出首次命名使用的简体姓名片段及配置敏感词，仅供服务端打包。"""

import argparse
import json

from export_gameconfig import DEFAULT_SRC, ROOT, loose_rows

OUTPUT = ROOT / "backend/src/main/resources/gameplay/role-name-rules.json"


def values(table: str) -> list[str]:
    """读取旧表的简体 value 列，保留姓名抽选的原行顺序和采样权重。"""
    rows = loose_rows(DEFAULT_SRC / f"{table}.xlsx", "wishpoolreward")
    result = [row["value"] for row in rows if isinstance(row.get("value"), str) and row["value"].strip()]
    if not result:
        raise ValueError(f"首次命名配置为空：{table}")
    return result


def main() -> None:
    """默认校验投影文件，显式写入时从仓库的策划源表重新导出。"""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    rules = {"prefixes": values("xing"), "suffixes": values("nick"), "blocked": values("sensitive")}
    content = json.dumps(rules, ensure_ascii=False, separators=(",", ":")) + "\n"
    if args.write:
        OUTPUT.write_text(content, encoding="utf-8", newline="\n")
    elif OUTPUT.read_text(encoding="utf-8") != content:
        raise SystemExit("首次命名配置已过期，请运行 tools/export_role_name_rules.py --write")


if __name__ == "__main__":
    main()
