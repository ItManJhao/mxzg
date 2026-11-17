"""从原样旧客户端Lua投影角色升级的下一功能候选，供正常配置导出流程调用。

此表只服务升级页预告，不修改XLSX导出的导航门槛或开放任何玩法。
解析器只接受原配置中的整数/字符串字面量，不执行Lua；重复键按最后定义覆盖。
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

from bundle_paths import bundle_asset_path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "config/legacy-client/opencondition.lua"
SOURCE_METADATA = SOURCE.with_suffix(".source.json")
TABLE_NAME = "roleupgradefeature"
NOTE = (
    "derived from config/legacy-client/opencondition.lua for role-upgrade preview only. "
    "Lua duplicate keys use the last definition; JumpManager parent keys, condition_type=1, open!=4/5. "
    "Source definition order is retained; no idx priority is added for equal level thresholds. "
    "Does not change OpenCondition navigation gates or enable features."
)
ROW_PATTERN = re.compile(r'\t\t\["([^"\r\n]+)"\] = \{\r?\n(.*?)\r?\n\t\t\},', re.DOTALL)
FIELD_PATTERN = re.compile(r'\s*([a-z_]+)\s*=\s*(.*?)\s*,\s*')


def parse_definitions(text: str) -> list[dict]:
    """只读解析原Lua字面量并保留源行号；不识别的表达式或必要字段缺失立即拒绝。"""
    definitions = []
    for match in ROW_PATTERN.finditer(text):
        row = {"source_line": text[:match.start()].count("\n") + 1}
        for line in match.group(2).splitlines():
            if not line.strip():
                continue
            field = FIELD_PATTERN.fullmatch(line)
            if field is None or field.group(1) in row:
                raise ValueError("旧功能配置包含无法解析或重复的字段：" + line)
            raw = field.group(2)
            if re.fullmatch(r"-?\d+", raw):
                value = int(raw)
            elif raw.startswith('"'):
                value = json.loads(raw)
                if not isinstance(value, str):
                    raise ValueError("旧功能配置字段必须是字符串或整数")
            else:
                raise ValueError("旧功能配置不允许表达式：" + raw)
            row[field.group(1)] = value
        if row.get("atom") != match.group(1):
            raise ValueError("旧功能配置键与atom不一致：" + match.group(1))
        for name in ("idx", "open", "condition_type", "condition_value", "world_level"):
            if not isinstance(row.get(name), int):
                raise ValueError("旧功能配置缺少整数字段：" + name)
        if not isinstance(row.get("parent"), str):
            raise ValueError("旧功能配置缺少父键字符串：" + row["atom"])
        definitions.append(row)
    if not definitions:
        raise ValueError("旧功能配置没有可解析记录")
    return definitions


def project_definitions(definitions: list[dict]) -> tuple[list[dict], dict]:
    """先按Lua最后键覆盖，再复现父系统键及预告筛选；候选保持源顺序，不按idx添加优先级。"""
    runtime = {row["atom"]: row for row in definitions}
    ordered = sorted(runtime.values(), key=lambda row: row["source_line"])
    system_keys = {row["atom"] for row in ordered if row["parent"] == ""}
    system_keys.update(row["parent"] for row in ordered if row["parent"] != "")
    missing = system_keys - runtime.keys()
    if missing:
        raise ValueError("旧功能配置父系统不存在：" + repr(sorted(missing)))
    candidates = [row for row in ordered if row["atom"] in system_keys
                  and row["condition_type"] == 1 and row["open"] not in (4, 5)]
    rows = []
    for candidate in candidates:
        row = {"id": candidate["atom"], "atom": candidate["atom"],
               "condition_value": candidate["condition_value"]}
        for source, target in (("name", "name_lang"), ("desc", "desc"), ("note", "note")):
            value = candidate.get(source)
            if value is not None and value != "":
                row[target] = value
        rows.append(row)
    duplicates = []
    for atom in runtime:
        previous = [row for row in definitions if row["atom"] == atom]
        if len(previous) > 1:
            duplicates.append({"atom": atom, "definitions": [
                {"line": row["source_line"], "idx": row["idx"],
                 "condition_value": row["condition_value"]} for row in previous],
                "retained_line": previous[-1]["source_line"]})
    return rows, {"definition_count": len(definitions), "unique_count": len(runtime),
                  "system_key_count": len(system_keys), "candidate_count": len(rows),
                  "candidate_order": "source-definition-order; no idx priority for equal thresholds",
                  "duplicates": duplicates}


def build_projection(source: Path = SOURCE) -> tuple[dict, dict]:
    """由仓库内旧源生成候选与来源元数据；不依赖旧工程路径，不写资源或修改原源字节。"""
    content = source.read_bytes()
    rows, stats = project_definitions(parse_definitions(content.decode("utf-8-sig")))
    payload = {"table": TABLE_NAME, "note": NOTE, "rows": rows}
    metadata = {
        "generated_by": "tools/export_role_upgrade_features.py",
        "source": "config/legacy-client/opencondition.lua",
        "original_repository": "G:/work/FsGame/Demo/mj/program",
        "original_path": "client/cocos_mxzg/client/idle/src/config/opencondition.lua",
        "source_sha256": hashlib.sha256(content).hexdigest(), "source_bytes": len(content),
        "decision_date": "2026-11-16",
        "decision": "负责人选择旧客户端Lua作为升级页下一功能提示依据；不改变现有导航门槛，不开放功能。",
        "output": "config/" + TABLE_NAME, **stats,
    }
    return payload, metadata


def check_generated() -> None:
    """只读核对实际候选、来源哈希及生成元数据，拒绝手工改候选或丢失原meta。"""
    payload, metadata = build_projection()
    target = bundle_asset_path("config", TABLE_NAME + ".json")
    if json.loads(target.read_text(encoding="utf-8-sig")) != payload:
        raise ValueError("升级功能提示投影已过期，请运行tools/export_gameconfig.py")
    if json.loads(SOURCE_METADATA.read_text(encoding="utf-8-sig")) != metadata:
        raise ValueError("旧功能配置来源元数据已过期，请运行tools/export_gameconfig.py")
    asset_meta = json.loads(Path(str(target) + ".meta").read_text(encoding="utf-8-sig"))
    if not asset_meta.get("uuid"):
        raise ValueError("升级功能提示投影缺少资源UUID")
    print("角色升级功能预告投影通过：%d定义/%d唯一/%d父键/%d候选" % (
        metadata["definition_count"], metadata["unique_count"],
        metadata["system_key_count"], metadata["candidate_count"]))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Check the legacy role-upgrade feature projection")
    parser.add_argument("--check", action="store_true", required=True)
    parser.parse_args()
    check_generated()
