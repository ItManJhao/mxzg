"""核对重做版不再依赖旧业务目录，并检查序列化对象引用没有因组件删除断裂。"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "client/assets/scripts"


def check_retired_entries():
    """确认旧目录、状态所有者、场景和启停入口已移除，禁止恢复兼容壳。"""
    for name in ["module", "module.meta", "net", "net.meta", "core/Boot.ts", "core/GameStore.ts", "core/Session.ts", "ui/MainApp.ts"]:
        assert not (SCRIPTS / name).exists(), f"旧入口仍存在：{name}"
    assert not (ROOT / "client/assets/scenes/legacy").exists()
    for file in (ROOT / "scripts").iterdir():
        assert not re.match(r"(?:start|stop)-(?:local-all|local-server|ws-bridge)\.", file.name), file
    for file in SCRIPTS.rglob("*.ts"):
        text = file.read_text(encoding="utf-8-sig")
        for spec in re.findall(r'(?:from\s*|import\s*\()\s*["\']([^"\']+)', text):
            assert not re.search(r"(?:^|/)(?:module|net)(?:/|$)|(?:GameStore|WireSession)$", spec), (file, spec)


def check_serialized_references():
    """检查全部 Prefab/scene 的对象索引，保留有效绑定和人工编辑结构。"""
    count = 0
    for file in (ROOT / "client/assets").rglob("*"):
        if file.suffix not in {".prefab", ".scene"}:
            continue
        data = json.loads(file.read_text(encoding="utf-8-sig"))
        if not isinstance(data, list):
            continue

        def visit(value):
            """递归检查局部对象引用，不将资源 UUID 当成数组索引。"""
            if isinstance(value, dict):
                if "__id__" in value:
                    index = value["__id__"]
                    assert isinstance(index, int) and 0 <= index < len(data), (file, index)
                for child in value.values():
                    visit(child)
            elif isinstance(value, list):
                for child in value:
                    visit(child)

        visit(data)
        count += 1
    return count


if __name__ == "__main__":
    check_retired_entries()
    print(f"旧链清理检查通过；{check_serialized_references()} 份界面/场景的序列化索引有效。")
