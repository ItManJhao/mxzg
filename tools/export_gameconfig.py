#!/usr/bin/env python3
"""客户端配置导出：默认输出当前读取闭包并更新压缩包，--all只允许在assets外归档旧项目全表。

Source of truth is the in-repo directory config/gameconfig (override with
--src or GAMECONFIG_SRC). Shared JSON remains in the config Bundle directory
for the backend and export checks. The client reads startup JSON and the
generated BufferAsset package. xlsx is not loaded by Creator.

Header rows match the old ExcelReader layout:
  row 1  Chinese note
  row 2  export flag: 1 server, 2 client, 3 both, blank/0 skip
  row 3  field name
  row 4+ data

当前共享JSON只输出1/2/3标记列；未标记不等于服务端无用字段。
旧服务端还读取活动gain_chance等未标记列，恢复对应功能时须定向投影，不能全局放开导出。
system_gate.json is derived from system.xlsx integer *_open_day / *_days keys.
opencondition.json keeps the client fields id/name/condition_type/level/
open_server_day and also keeps the raw columns. main_cafe is an alias of
main_pub_task, mail is an alias of main_mail. The nav id bag has no atom, so
a level-1 row is added for that id. Existing gate ids still resolve.
"""

from __future__ import annotations

import argparse
import ast
import io
import json
import math
import os
import re
import subprocess
import sys
import uuid
import xml.etree.ElementTree as ET
import zipfile
from datetime import date, datetime, time
from pathlib import Path
from bundle_paths import bundle_directory

try:
    import openpyxl
except ImportError:
    sys.stderr.write("missing openpyxl. pip install -r tools/requirements.txt\n")
    sys.exit(2)

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SRC = ROOT / "config" / "gameconfig"
DEFAULT_OUT = bundle_directory("config")
FIELD_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
INT_RE = re.compile(r"^-?\d+$")
# 保留既有导出说明，默认窄范围与显式全量归档使用同一描述，不因整理范围改变JSON字节。
PRIMARY_NOTE = "exported from config/gameconfig/%s sheet %s. flag 1/2/3 columns only."
SYSTEM_GATE_NOTE = (
    "derived from config/gameconfig/system.xlsx. integer keys containing open_day or ending with _days. "
    "open_server_day is that value. remark is note."
)
OPEN_CONDITION_NOTE = (
    "exported from config/gameconfig/opencondition.xlsx. id=atom, name=note, level=condition_value, "
    "open_server_day from system *_open_day when the key is {atom}_open_day. main_cafe aliases main_pub_task. "
    "mail aliases main_mail. bag is a level-1 nav row because the sheet has no bag atom. raw columns kept."
)

META_TEMPLATE = """{{
  "ver": "2.0.1",
  "importer": "json",
  "imported": true,
  "uuid": "{uuid}",
  "files": [
    ".json"
  ],
  "subMetas": {{}},
  "userData": {{}}
}}
"""


def check_table_reads(text: str) -> set[str]:
    """提取配置专项的直接路径及rows(name)辅助调用；变量模板本身不能代替实际调用表名。"""
    prefixes = {DEFAULT_OUT.relative_to(ROOT).as_posix(), "client/assets/bundles/config"}
    names = set()
    for prefix in prefixes:
        names.update(re.findall(r'''["'`]''' + re.escape(prefix) + r'''/([A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)*)\.json["'`]''', text))
    names.update(re.findall(r'''bundle_asset_path\(\s*["']config["']\s*,\s*["']([A-Za-z0-9_/-]+)\.json["']''', text))
    defines_rows = re.search(r"\b(?:function\s+rows\s*\(|(?:const|let)\s+rows\s*=|def\s+rows\s*\()", text)
    config_reader = any(prefix in text for prefix in prefixes) or re.search(r'''bundle_(?:directory|asset_path)\(\s*["']config["']''', text)
    if config_reader and defines_rows:
        names.update(re.findall(r'''\brows\s*\(\s*["']([A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)*)["']\s*\)''', text))
    return names


def current_client_tables() -> dict[str, list[str]]:
    """从schema、客户端读取、后端实际打包依赖及现用检查求共享导出范围，不另建模块清单。"""
    tables: dict[str, list[str]] = {}

    def add(name: str, reason: str) -> None:
        """登记明确表路径及审计来源，拒绝目录穿越和空路径。"""
        if not re.fullmatch(r"[A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)*", name):
            raise ValueError("非法客户端配置路径：" + name)
        tables.setdefault(name, []).append(reason)

    schema = json.loads((ROOT / "config/client-schema.json").read_text(encoding="utf-8-sig"))
    for key, spec in schema["tables"].items():
        if not spec["path"].startswith("config/"):
            raise ValueError("schema配置缺少config包前缀：" + key)
        add(spec["path"][len("config/"):], "client-schema:" + key)
    # 后端从同一配置包打包gameplay输入，不能被客户端零调用误判成未实现资源。
    # 直接读取现有POM，避免再维护一份服务端表名列表；目录及实际文件另由配置专项检查。
    namespace = {"m": "http://maven.apache.org/POM/4.0.0"}
    pom = ROOT / "backend/pom.xml"
    for resource in ET.parse(pom).getroot().findall("m:build/m:resources/m:resource", namespace):
        directory = resource.findtext("m:directory", default="", namespaces=namespace)
        if (pom.parent / directory).resolve() != DEFAULT_OUT.resolve():
            continue
        for include in resource.findall("m:includes/m:include", namespace):
            name = (include.text or "").strip()
            if not name.endswith(".json"):
                raise ValueError("共享配置POM必须明确引用JSON表：" + name)
            add(name[:-5], "backend/pom.xml:gameplay")
    # GConfig由schema生成，不能用旧生成结果反过来保活已经从schema删除的表。
    for source in sorted((ROOT / "client/assets/scripts").rglob("*.ts")):
        if source.name == "GConfig.ts":
            continue
        text = source.read_text(encoding="utf-8-sig")
        for name in re.findall(r'''["']config/([A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)*)["']''', text):
            add(name, source.relative_to(ROOT).as_posix())

    # 当前主线/挂机/英雄规则投影仍以原始导出为输入；不因玩法入口暂停而破坏规则校验。
    readers = {"tools/export_idle_rules.py", "tools/export_campaign_rules.py", "tools/check_chapter_end.cjs"}
    registered = (ROOT / "client/tools/check-project.mjs").read_text(encoding="utf-8-sig")
    readers.update(re.findall(r'''["']((?:client/tools|tools)/[A-Za-z0-9_/-]+\.(?:ts|cjs))["']''', registered))
    for relative in sorted(readers):
        source = ROOT / relative
        for name in check_table_reads(source.read_text(encoding="utf-8-sig")):
            add(name, relative)
    growth = ROOT / "tools/export_hero_growth.py"
    for entry in ast.parse(growth.read_text(encoding="utf-8-sig")).body:
        if isinstance(entry, ast.Assign) and any(isinstance(target, ast.Name) and target.id == "FIELDS" for target in entry.targets):
            for name in ast.literal_eval(entry.value):
                add(name, "tools/export_hero_growth.py:FIELDS")
    # 语言表不裁行，语言元数据连同原字体归属保留，避免本批资源整理删掉多语言依赖。
    add("languagetype", "完整语言元数据；本批不裁语言依赖")
    return dict(sorted((name, sorted(set(reasons))) for name, reasons in tables.items()))


def validate_current_scope(out: Path) -> dict[str, int]:
    """检查所有必需表都存在且非空、无未实现旧表；缺失或非法JSON不能用空数组冒充通过。"""
    expected = current_client_tables()
    actual = {file.relative_to(out).as_posix()[:-5] for file in out.rglob("*.json")}
    missing, extra = set(expected) - actual, actual - set(expected)
    if missing or extra:
        raise ValueError("客户端配置范围不符；缺失=" + repr(sorted(missing)) + "；多余=" + repr(sorted(extra)))
    schema = json.loads((ROOT / "config/client-schema.json").read_text(encoding="utf-8-sig"))
    containers = {spec["path"][len("config/"):]: spec["container"] for spec in schema["tables"].values()}
    counts = {}
    for name in expected:
        data = json.loads((out / (name + ".json")).read_text(encoding="utf-8-sig"))
        container = containers.get(name, "rows")
        rows = data[container]
        if not isinstance(rows, (list, dict)) or not rows:
            raise ValueError("必需配置内容为空或结构非法：" + name + ":" + container)
        counts[name] = len(rows)
    return counts


def require_output_mode(out: Path, export_all: bool) -> None:
    """全量旧表仅可显式归档到assets之外，禁止再把未实现模块导回运行资源。"""
    if export_all and out.resolve().is_relative_to((ROOT / "client/assets").resolve()):
        raise ValueError("--all全量归档必须输出到client/assets之外")


def project_attrshow(rows: list[dict]) -> list[dict]:
    """按旧Lua主键语义合并完全相同的attrshow重复行；同键异内容拒绝，不猜覆盖次序。"""
    seen: dict[int, dict] = {}
    result: list[dict] = []
    for row in rows:
        key = row.get("attr")
        if key in seen:
            if seen[key] != row:
                raise ValueError("attrshow同属性存在不同显示配置：" + str(key))
            continue
        seen[key] = row
        result.append(row)
    return result


def export_current(src: Path, out: Path) -> int:
    """导出当前读取闭包并在默认目录更新配置包；隔离导出不改项目包，主城保留已核对投影。"""
    targets = current_client_tables()
    schema = json.loads((ROOT / "config/client-schema.json").read_text(encoding="utf-8-sig"))
    specs = {spec["path"][len("config/"):]: spec for spec in schema["tables"].values()}
    books: dict[str, dict] = {}

    def primary(stem: str) -> dict:
        """按实际源表读一次主sheet，缺少源表或有效内容时拒绝导出。"""
        if stem not in books:
            file = src / (stem + ".xlsx")
            sheets = read_book(file)
            if not sheets:
                raise ValueError("必需源表没有有效sheet：" + str(file))
            books[stem] = pick_primary(stem, sheets)
        return books[stem]

    system = primary("system")
    gates = build_system_gate(loose_rows(src / "system.xlsx", system["sheet"]))
    for name in targets:
        stem = name.split("/")[-1]
        if name == "spirit-display":
            # 该表由真实精灵随机/显示闭包派生，不存在同名XLSX；与专项导出共用唯一算法。
            from export_spirit_rules import build_display, build_projection

            target = out / (name + ".json")
            write_json(target, build_display(build_projection(src)))
            ensure_meta(Path(str(target) + ".meta"))
            continue
        if name.startswith("maincity/"):
            # 这三份当前页面输入与现存XLSX存在已记录差异，完整规则专项前保持原容器和字节。
            source = ROOT / "config/client-maincity" / (stem + ".json")
            content = source.read_bytes()
            target = out / (name + ".json")
            target.parent.mkdir(parents=True, exist_ok=True)
            if not target.exists() or target.read_bytes() != content:
                target.write_bytes(content)
            ensure_meta(Path(str(target) + ".meta"))
            continue
        if name == "system_gate":
            rows = gates
            note = SYSTEM_GATE_NOTE
        else:
            rows = primary(stem)["rows"]
            note = PRIMARY_NOTE % (stem + ".xlsx", primary(stem)["sheet"])
        if name == "attrshow":
            rows = project_attrshow(rows)
            note += " Identical duplicate attribute keys merged with legacy Lua key semantics."
        if name == "opencondition":
            rows = project_opencondition(rows, gates)
            note = OPEN_CONDITION_NOTE
        spec = specs.get(name)
        if spec and spec["container"] != "rows":
            projected = [{key: value for key, value in row.items() if key in spec["fields"]} for row in rows]
            # 主城活动表旧格式以atom为字典键，另外两个容器仍是数组。
            payload = {row[spec["key"]]: row for row in projected} if spec["container"] == "act" else projected
            target = out / (name + ".json")
            write_json(target, {spec["container"]: payload})
            ensure_meta(Path(str(target) + ".meta"))
        else:
            write_table(out, name, note, rows)
    counts = validate_current_scope(out)
    refresh_config_package(out)
    print("当前客户端配置导出：%d表；完整原始行保留，不导出未实现模块或旧manifest" % len(counts))
    return 0


def refresh_config_package(out: Path) -> None:
    """默认共享目录导出成功后调用唯一 Node 生成器；临时范围验证与离线归档不修改运行包。"""
    if out.resolve() != DEFAULT_OUT.resolve():
        return
    subprocess.run(
        ["node", str(ROOT / "tools/generate_config_package.cjs"), "--write"],
        cwd=ROOT,
        check=True,
    )


def main() -> int:
    """默认只导出当前读取闭包；只读范围检查和全量离线归档均须显式选择。"""
    parser = argparse.ArgumentParser(description="Export gameconfig xlsx to client JSON")
    parser.add_argument("--src", default=os.environ.get("GAMECONFIG_SRC", str(DEFAULT_SRC)))
    parser.add_argument("--out", default=os.environ.get("GAMECONFIG_OUT", str(DEFAULT_OUT)))
    parser.add_argument("--all", action="store_true", help="全量旧表离线归档，只能输出到assets之外")
    parser.add_argument("--check-scope", action="store_true", help="只核对当前配置闭包，不导出或删除")
    parser.add_argument("--list", action="store_true", help="列出当前配置闭包与源码读取证据，不写文件")
    args = parser.parse_args()
    src = Path(args.src)
    out = Path(args.out)
    require_output_mode(out, args.all)
    if args.list:
        print(json.dumps(current_client_tables(), ensure_ascii=False, indent=2))
        return 0
    if args.check_scope:
        print("当前客户端配置范围通过：%d表" % len(validate_current_scope(out)))
        return 0
    if not src.is_dir():
        sys.stderr.write("gameconfig directory not found: %s\n" % src)
        return 2
    books = sorted(p for p in src.glob("*.xlsx") if not p.name.startswith("~$"))
    if not books:
        sys.stderr.write("no xlsx in %s\n" % src)
        return 2
    out.mkdir(parents=True, exist_ok=True)
    if not args.all:
        return export_current(src, out)

    written: list[str] = []
    failed: list[str] = []
    extra = 0
    system_rows: list[dict] | None = None
    open_rows: list[dict] | None = None
    for index, path in enumerate(books, 1):
        if index == 1 or index % 40 == 0 or index == len(books):
            print("read %d/%d %s" % (index, len(books), path.name), flush=True)
        try:
            sheets = read_book(path)
        except Exception as err:
            failed.append("%s: %s" % (path.name, err))
            continue
        if not sheets:
            failed.append("%s: no header" % path.name)
            continue
        primary = pick_primary(path.stem, sheets)
        note = PRIMARY_NOTE % (
            path.name,
            primary["sheet"],
        )
        write_table(out, path.stem, note, primary["rows"])
        written.append(path.stem)
        if path.stem == "system":
            system_rows = loose_rows(path, primary["sheet"])
        if path.stem == "opencondition":
            open_rows = primary["rows"]
        for index, sheet in enumerate(sheets):
            if sheet is primary:
                continue
            if not sheet["rows"]:
                continue
            slug = sheet_slug(sheet["sheet"], index)
            name = "%s__%s" % (path.stem, slug)
            if name in written:
                name = "%s_%d" % (name, index)
            write_table(
                out,
                name,
                "exported from config/gameconfig/%s extra sheet %s." % (path.name, sheet["sheet"]),
                sheet["rows"],
            )
            written.append(name)
            extra += 1

    gates = build_system_gate(system_rows or [])
    write_table(
        out,
        "system_gate",
        SYSTEM_GATE_NOTE,
        gates,
    )
    if "system_gate" not in written:
        written.append("system_gate")

    projected = project_opencondition(open_rows or [], gates)
    write_table(
        out,
        "opencondition",
        OPEN_CONDITION_NOTE,
        projected,
    )

    names = sorted(set(written))
    manifest = {
        "table": "manifest",
        "note": "client load list. source config/gameconfig. xlsx=%d json=%d extra_sheets=%d failed=%d%s"
        % (
            len(books),
            len(names),
            extra,
            len(failed),
            ("; " + "; ".join(failed)) if failed else "",
        ),
        "tables": names,
        "rows": [],
    }
    write_json(out / "manifest.json", manifest)
    ensure_meta(out / "manifest.json.meta")

    print(
        "xlsx=%d tables=%d extra_sheets=%d opencondition=%d system_gate=%d failed=%d"
        % (len(books), len(names), extra, len(projected), len(gates), len(failed))
    )
    for line in failed:
        print("FAIL", line)
    return 0 if not failed else 1


def read_book(path: Path) -> list[dict]:
    wb = open_book(path)
    found = []
    try:
        for sheet_name in wb.sheetnames:
            ws = wb[sheet_name]
            rows = [tuple(row) for row in ws.iter_rows(values_only=True)]
            parsed = parse_sheet(rows)
            if parsed is None:
                continue
            found.append({"sheet": sheet_name, "rows": parsed})
    finally:
        wb.close()
    return found


def open_book(path: Path):
    # Not read_only: several workbooks lie about their dimension, and read_only
    # then stops after the first cell.
    try:
        return openpyxl.load_workbook(path, data_only=True)
    except Exception:
        # Some workbooks store zip entry names with backslashes.
        raw = path.read_bytes()
        buf = io.BytesIO()
        with zipfile.ZipFile(io.BytesIO(raw)) as zin, zipfile.ZipFile(buf, "w") as zout:
            for info in zin.infolist():
                zout.writestr(info.filename.replace("\\", "/"), zin.read(info.filename))
        buf.seek(0)
        return openpyxl.load_workbook(buf, data_only=True)


def loose_rows(path: Path, sheet_name: str) -> list[dict]:
    wb = open_book(path)
    try:
        ws = wb[sheet_name]
        rows = [tuple(row) for row in ws.iter_rows(values_only=True)]
    finally:
        wb.close()
    return parse_sheet(rows, flagged_only=False) or []


TYPE_WORDS = {"string", "int", "integer", "json", "float", "number", "bool", "double", "long", "text"}


def parse_sheet(rows: list[tuple], flagged_only: bool = True) -> list[dict] | None:
    if len(rows) < 3:
        return None
    flags = [flag_of(cell) for cell in rows[1]]
    fields = list(rows[2])
    known = sum(1 for flag in flags if flag in (0, 1, 2, 3))
    other = sum(1 for flag in flags if flag == "other")
    type_words = sum(1 for cell in rows[1] if is_type_word(cell))
    idents = [(index, str(field).strip()) for index, field in enumerate(fields) if is_field(field)]
    type_header = type_words >= 1 and known == 0 and len(idents) >= 1
    if len(idents) < 1:
        return None
    if not type_header and (known < 1 or other > known):
        return None
    columns = []
    used: dict[str, int] = {}
    for index, name in idents:
        flag = flags[index] if index < len(flags) else None
        if flagged_only and not type_header and flag not in (1, 2, 3):
            continue
        if name in used:
            used[name] += 1
            name = "%s_%d" % (name, used[name])
        else:
            used[name] = 1
        columns.append((index, name))
    if not columns:
        return None
    data = []
    for raw in rows[3:]:
        obj = {}
        for index, name in columns:
            if index >= len(raw):
                continue
            value = cell_value(raw[index])
            if value is None:
                continue
            obj[name] = value
        if obj:
            data.append(obj)
    return data


def pick_primary(stem: str, sheets: list[dict]) -> dict:
    def rank(sheet: dict) -> tuple:
        name = str(sheet["sheet"]).casefold().replace(" ", "")
        key = stem.casefold()
        if name == key or name == key + ".csv":
            band = 3
        elif key in name:
            band = 2
        else:
            band = 1
        return (band, len(sheet["rows"]))

    return max(sheets, key=rank)


def build_system_gate(rows: list[dict]) -> list[dict]:
    gates = []
    for row in rows:
        key = row.get("key")
        if not isinstance(key, str) or not key:
            continue
        if "open_day" not in key and not key.endswith("_days"):
            continue
        day = as_int(row.get("value"))
        if day is None:
            continue
        item = {"key": key, "open_server_day": day}
        remark = row.get("remark")
        if isinstance(remark, str) and remark:
            item["note"] = remark
        gates.append(item)
    gates.sort(key=lambda item: item["key"])
    return gates


def project_opencondition(rows: list[dict], gates: list[dict]) -> list[dict]:
    days = {}
    for gate in gates:
        key = gate["key"]
        if key.endswith("_open_day"):
            days[key[: -len("_open_day")]] = gate["open_server_day"]
    projected = []
    for row in rows:
        atom = row.get("atom")
        if atom is None or atom == "":
            continue
        atom_text = str(atom)
        level = as_int(row.get("condition_value"))
        kind = as_int(row.get("condition_type"))
        note = row.get("note")
        name = note if isinstance(note, str) and note else atom_text
        item = dict(row)
        lang = item.get("name")
        item["id"] = atom_text
        item["name"] = name
        if lang is not None and lang != name:
            item["name_lang"] = lang
        item["condition_type"] = 0 if kind is None else kind
        item["level"] = 0 if level is None else level
        item["open_server_day"] = days.get(atom_text, 0)
        projected.append(item)
    alias(projected, "main_pub_task", "main_cafe")
    alias(projected, "main_mail", "mail")
    ensure_nav_bag(projected)
    return projected


def ensure_nav_bag(rows: list[dict]) -> None:
    """City nav uses id bag. The sheet has backpack_* atoms, not bag."""
    if any(row.get("id") == "bag" for row in rows):
        return
    rows.append(
        {
            "id": "bag",
            "name": "背包",
            "condition_type": 1,
            "level": 1,
            "open_server_day": 0,
            "note": "客户端导航 id。opencondition 没有 bag 原子，等级 1 与原来的入口门槛一致。",
        }
    )


def alias(rows: list[dict], source_id: str, alias_id: str) -> None:
    if any(row.get("id") == alias_id for row in rows):
        return
    for row in rows:
        if row.get("id") == source_id:
            copy = dict(row)
            copy["id"] = alias_id
            copy["alias_of"] = source_id
            rows.append(copy)
            return


def write_table(out: Path, name: str, note: str, rows: list[dict]) -> None:
    path = out / ("%s.json" % name)
    write_json(path, {"table": name, "note": note, "rows": rows})
    ensure_meta(Path(str(path) + ".meta"))


def write_json(path: Path, payload: dict) -> None:
    """写入指定导出路径，创建必要容器目录；相同内容不重写，避免无意义Creator导入。"""
    text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    text += "\n"
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists() or path.read_text(encoding="utf-8") != text:
        path.write_text(text, encoding="utf-8")


def ensure_meta(path: Path) -> None:
    if path.exists():
        return
    path.write_text(META_TEMPLATE.format(uuid=str(uuid.uuid4())), encoding="utf-8")


def sheet_slug(name: str, index: int) -> str:
    chars = []
    for ch in name:
        if ("a" <= ch <= "z") or ("A" <= ch <= "Z") or ("0" <= ch <= "9") or ch in "-_":
            chars.append(ch)
        else:
            chars.append("_")
    text = "".join(chars).strip("_")
    while "__" in text:
        text = text.replace("__", "_")
    if not text:
        text = "sheet%d" % index
    return text[:48]


def is_type_word(value) -> bool:
    return isinstance(value, str) and value.strip().lower() in TYPE_WORDS


def is_field(value) -> bool:
    if not isinstance(value, str):
        return False
    return FIELD_RE.match(value.strip()) is not None


def flag_of(value):
    if value is None or value == "":
        return None
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    if isinstance(value, int) and value in (0, 1, 2, 3):
        return value
    if isinstance(value, str) and value.strip() in ("0", "1", "2", "3"):
        return int(value.strip())
    return "other"


def as_int(value):
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float) and value.is_integer():
        return int(value)
    if isinstance(value, str) and INT_RE.match(value.strip()):
        return int(value.strip())
    return None


def cell_value(value):
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
        if value.is_integer():
            return int(value)
        return value
    if isinstance(value, datetime):
        return value.isoformat(sep=" ")
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, time):
        return value.isoformat()
    text = str(value).replace("\r\n", "\n").replace("\r", "\n").strip()
    if not text:
        return None
    return text


if __name__ == "__main__":
    sys.exit(main())
