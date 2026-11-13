"""只读检查运行源码的相对导入、架构边界、文件命名和自由函数导出。

只扫描client/assets/scripts中的手写TypeScript；生成文件、声明及第三方源码不套用人工写法。
静态结果不覆盖Prefab或动态引用，不能单独据此删除资源。
"""
import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "client/assets/scripts"
BASELINE = ROOT / "tools/architecture-baseline.json"
TOKENS = re.compile(r'"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'|//[^\n]*|/\*[\s\S]*?\*/')
IMPORTS = re.compile(r'\bfrom\s+["\'](\.[^"\']+)["\']|\bimport\s*["\'](\.[^"\']+)["\']')
FREE_FUNCTION = re.compile(r"\bexport\s+(?:default\s+)?(?:declare\s+)?(?:async\s+)?function\b")
EXPORTED_VALUE = re.compile(r"\bexport\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)(?:\s*:[^;]+?)?\s*=(?!=|>)")
FUNCTION_VALUE = re.compile(
    r"(?:async\s+)?(?:function\b|(?:<[\s\S]*?>\s*)?\([^;]*?\)\s*(?::[^;]*?)?=>|[A-Za-z_$][\w$]*\s*=>)"
)


def source_convention_issues(relative: str, text: str) -> list[str]:
    """检查手写运行TS的文件名和明确函数导出形态，不误判类型、常量及类静态方法。"""
    name = Path(relative).name
    # 声明、协议/配置生成器及第三方保持各自格式；构建脚本不在运行scripts扫描根下。
    if (name.endswith(".d.ts") or ".generated." in name
            or any(part in {"vendor", "third-party", "third_party"} for part in Path(relative).parts)
            or re.match(r"\s*/\*\*?\s*(?:Generated\b|由[^\n]*生成)", text)):
        return []
    issues = []
    if not re.fullmatch(r"[A-Z][A-Za-z0-9]*\.ts", name):
        issues.append("手写运行TS文件名必须使用有语义的PascalCase")
    # 保留换行和长度，忽略注释及字面量里的示例；这里只检查明确声明，不推断变量的运行时类型。
    clean = TOKENS.sub(lambda match: re.sub(r"[^\n]", " ", match[0]), text)
    if FREE_FUNCTION.search(clean):
        issues.append("自由导出函数应收进对应类的显式静态入口")
    for match in EXPORTED_VALUE.finditer(clean):
        if FUNCTION_VALUE.match(clean[match.end():].lstrip()):
            issues.append("函数变量导出应收进对应类的显式静态入口：" + match[1])
    return issues


def check_convention_rules() -> None:
    """自检正反例，保证规则拒绝自由导出，同时保留类型、常量和生成器边界。"""
    valid = """export interface Data { value: number; }
export type Callback = () => void;
export const CONSTANT = { callback: () => 1 };
export class SampleUtils { public static run(): number { return 1; } }
// export function oldExample() {}
const text = 'export const oldExample = () => 1';"""
    assert source_convention_issues("framework/SampleUtils.ts", valid) == []
    for statement in ("export function run() {}", "export async function run() {}",
                      "export const run = () => 1;", "export const run = value => value;",
                      "export const run = async <T>(value: T): Promise<T> => value;",
                      "export const run: () => number = () => 1;"):
        assert source_convention_issues("framework/SampleUtils.ts", statement), statement
    assert source_convention_issues("framework/sampleUtils.ts", valid)
    assert source_convention_issues("framework/example.d.ts", "export function run(): void;") == []
    assert source_convention_issues("platform/GameProtocol.generated.ts", "export function decode() {}") == []
    assert source_convention_issues("config/GConfig.ts", "/** Generated configuration. */\nexport function legacy() {}") == []


def source_imports(text):
    clean = TOKENS.sub(lambda m: "" if m[0].startswith(("//", "/*")) else m[0], text)
    return [m[1] or m[2] for m in IMPORTS.finditer(clean)]


def inventory():
    """生成架构及写法检查报告；规则失败只报告，不修改源码、资源或历史例外。"""
    check_convention_rules()
    files = sorted(SCRIPTS.rglob("*.ts"))
    edges, unresolved, sizes, conventions = [], [], [], []
    for path in files:
        text = path.read_text(encoding="utf-8-sig")
        name = path.relative_to(SCRIPTS).as_posix()
        sizes.append({"file": name, "lines": len(text.splitlines())})
        conventions.extend({"file": name, "reason": reason} for reason in source_convention_issues(name, text))
        for spec in source_imports(text):
            target = path.parent / spec
            candidates = (Path(str(target) + ".ts"), target / "index.ts")
            resolved = next((p.resolve() for p in candidates if p.is_file()), None)
            if resolved is None:
                unresolved.append({"file": name, "import": spec})
                continue
            try:
                dest = resolved.relative_to(SCRIPTS).as_posix()
            except ValueError:
                unresolved.append({"file": name, "import": spec})
                continue
            edges.append((name, dest))
    violations = []
    for src, dest in sorted(set(edges)):
        reason = None
        if src.startswith("framework/") and dest.startswith(("features/", "module/", "ui/")):
            reason = "framework depends on business or legacy UI"
        elif src.startswith("module/") and dest.startswith(("ui/", "features/")):
            reason = "module depends on presentation or features"
        if reason:
            violations.append({"from": src, "to": dest, "reason": reason})
    accepted = json.loads(BASELINE.read_text(encoding="utf-8"))["exceptions"]
    allowed = {(v["from"], v["to"]) for v in accepted}
    current = {(v["from"], v["to"]) for v in violations}
    new = [v for v in violations if (v["from"], v["to"]) not in allowed]
    stale = [v for v in accepted if (v["from"], v["to"]) not in current]
    assets = ROOT / "client/assets/bundles"
    resource_bytes, resource_files = 0, 0
    for path in assets.rglob("*"):
        if path.is_file() and path.suffix != ".meta":
            resource_bytes += path.stat().st_size
            resource_files += 1
    return {
        "scope": "static runtime TypeScript imports/conventions; source assets excluding .meta; not build output",
        "script_files": len(files), "import_edges": len(set(edges)),
        "largest_files": sorted(sizes, key=lambda v: (-v["lines"], v["file"]))[:12],
        "prefabs": len(list((ROOT / "client/assets/bundles").rglob("*.prefab"))),
        "resources": {"files": resource_files, "bytes": resource_bytes,
                      "mib": round(resource_bytes / 1024 / 1024, 2)},
        "boundary_exceptions": violations, "new_violations": new,
        "stale_exceptions": stale, "unresolved_imports": unresolved,
        "source_convention_violations": conventions,
    }


def main():
    """输出本轮只读报告，任一架构、导入或写法违规都返回失败状态。"""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true", help="Print the complete inventory as JSON")
    args = parser.parse_args()
    report = inventory()
    if args.json:
        print(json.dumps(report, ensure_ascii=True, indent=2))
    else:
        print("Scripts: {script_files}; imports: {import_edges}; prefabs: {prefabs}".format(**report))
        print("Resources (source, excluding meta): {files} files, {mib} MiB".format(**report["resources"]))
        for row in report["largest_files"][:5]:
            print("  {lines:5} lines  {file}".format(**row))
        print("Accepted boundary debt: {}".format(len(report["boundary_exceptions"])))
        for key in ("new_violations", "stale_exceptions", "unresolved_imports", "source_convention_violations"):
            for row in report[key]:
                print(key + ": " + json.dumps(row, ensure_ascii=True))
    return 1 if any(report[k] for k in (
        "new_violations", "stale_exceptions", "unresolved_imports", "source_convention_violations"
    )) else 0


if __name__ == "__main__":
    raise SystemExit(main())
