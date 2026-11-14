"""共享配置范围回归：验证客户端读取闭包、Maven资源源目录与归档边界，拒绝旧构建缓存掩盖缺失输入。"""
import json
import shutil
import tempfile
import unittest
from unittest.mock import patch
import xml.etree.ElementTree as ET
from pathlib import Path
import test_bundle_paths
import test_idle_activity_export
import test_spirit_export

from export_gameconfig import DEFAULT_OUT, DEFAULT_SRC, ROOT, check_table_reads, current_client_tables, export_current, project_attrshow, refresh_config_package, require_output_mode, validate_current_scope


class ClientConfigScopeTests(unittest.TestCase):
    """在工作区临时目录模拟缺失与错误资源，现有配置与meta保持不变。"""

    def test_current_sources(self):
        """共享配置必须覆盖客户端、后端打包、规则投影和语言依赖，不能借用旧target缓存。"""
        tables = current_client_tables()
        self.assertIn("backend/pom.xml:gameplay", tables["worldlevelgainexp"])
        self.assertIn("backend/pom.xml:gameplay", tables["clergyprivilege"])
        self.assertIn("backend/pom.xml:gameplay", tables["promotionprivilegegift"])
        self.assertIn("backend/pom.xml:gameplay", tables["inituser"])
        self.assertIn("backend/pom.xml:gameplay", tables["goddessvip"])
        self.assertIn("client/tools/battle-presentation-audit.ts", tables["buffart"])
        self.assertIn("chapterreward", tables)
        self.assertIn("heroevolvelevel", tables)
        self.assertIn("maincity/maincitypos", tables)
        self.assertIn("languagetype", tables)
        self.assertIn("spirit-display", tables)
        self.assertIn("client-schema:AttributeShow", tables["attrshow"])
        self.assertIn("client-schema:ScoreCount", tables["scorecount"])
        self.assertIn("client-schema:EquipmentSetType", tables["equipmentsettype"])
        self.assertNotIn("arena", tables)
        counts = validate_current_scope(DEFAULT_OUT)
        self.assertEqual(counts["chapterreward"], 850)
        self.assertGreater(counts["item"], 100)
        self.assertGreater(counts["language"], 1000)
        self.assertEqual(counts["spirit-display"], 1)
        self.assertEqual(counts["attrshow"], 50)

    def test_missing_and_empty_table_fail(self):
        """缺少必需配置、额外旧表或空内容都必须失败，不能替换成空数组后报成功。"""
        temporary = ROOT / "client/temp"
        temporary.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=temporary) as directory:
            out = Path(directory)
            for name in current_client_tables():
                target = out / (name + ".json")
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(DEFAULT_OUT / (name + ".json"), target)
            for name in ("chapterreward", "buffart"):
                required = out / (name + ".json")
                required.unlink()
                with self.assertRaisesRegex(ValueError, "缺失.*" + name):
                    validate_current_scope(out)
                required.write_text('{"rows":[]}', encoding="utf-8")
                with self.assertRaisesRegex(ValueError, "内容为空.*" + name):
                    validate_current_scope(out)
                shutil.copyfile(DEFAULT_OUT / (name + ".json"), required)
            (out / "arena.json").write_text('{"rows":[{"idx":1}]}', encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "多余.*arena"):
                validate_current_scope(out)

    def test_all_export_stays_outside_assets(self):
        """全量旧表只可归档到工具临时目录，不允许直接或经相对路径返回运行资源。"""
        with self.assertRaisesRegex(ValueError, "assets之外"):
            require_output_mode(DEFAULT_OUT, True)
        with self.assertRaisesRegex(ValueError, "assets之外"):
            require_output_mode(ROOT / "client/assets/bundles/resources/config/../config", True)
        require_output_mode(ROOT / "client/temp/all-config-archive", True)

    def test_indirect_rows_reader(self):
        """专项通过变量路径rows(name)读表时，闭包必须从调用处收齐表名，不能漏掉buffart。"""
        source = '''function rows(name: string): any[] {
            return JSON.parse(readFileSync(`client/assets/bundles/resources/config/${name}.json`, "utf8")).rows;
        }
        const arts = new Map(rows("buffart").map(row => [row.idx, row]));
        const buffs = rows("buff");'''
        self.assertEqual(check_table_reads(source), {"buffart", "buff"})
        self.assertEqual(check_table_reads('const rows = ["not_a_config"]; rows.map(row => row);'), set())
        helper_source = '''SOURCE = bundle_directory("config")
        def rows(name):
            return json.loads((SOURCE / (name + ".json")).read_text())["rows"]
        arts = rows("buffart")
        buffs = rows("buff")'''
        self.assertEqual(check_table_reads(helper_source), {"buffart", "buff"})
        self.assertEqual(check_table_reads('bundle_asset_path("config", "chapterreward.json")'), {"chapterreward"})

    def test_attrshow_identical_duplicate_matches_legacy_key_semantics(self):
        """旧Lua按attr键覆盖；只合并完全一致的226行，异内容重复必须拒绝，且不修改源行。"""
        rows = [{"attr": 226, "icon": 220, "description": "技能固定伤害增加"},
                {"attr": 226, "icon": 220, "description": "技能固定伤害增加"},
                {"attr": 227, "icon": 220, "description": "无视所有防御"}]
        before = json.dumps(rows, ensure_ascii=False)
        self.assertEqual(project_attrshow(rows), [rows[0], rows[2]])
        self.assertEqual(json.dumps(rows, ensure_ascii=False), before)
        with self.assertRaisesRegex(ValueError, "attrshow同属性存在不同显示配置"):
            project_attrshow([rows[0], {**rows[1], "icon": 224}])

    def test_current_export_matches_assets(self):
        """默认导出到临时目录后必须与现用共享表逐字节一致，不能改主城或裁数据行。"""
        temporary = ROOT / "client/temp"
        temporary.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=temporary) as directory:
            out = Path(directory)
            export_current(DEFAULT_SRC, out)
            for name in current_client_tables():
                self.assertEqual((out / (name + ".json")).read_bytes(),
                                 (DEFAULT_OUT / (name + ".json")).read_bytes(), name)
            self.assertFalse((out / "manifest.json").exists())

    def test_default_export_updates_package_only_for_runtime_directory(self):
        """正常共享导出调用唯一包生成器；临时导出不改真实配置包，生成失败须传播给调用者。"""
        with patch("export_gameconfig.subprocess.run") as run:
            refresh_config_package(ROOT / "client/temp/config-export-fixture")
            run.assert_not_called()
            refresh_config_package(DEFAULT_OUT)
            run.assert_called_once_with(
                ["node", str(ROOT / "tools/generate_config_package.cjs"), "--write"],
                cwd=ROOT,
                check=True,
            )
        with patch("export_gameconfig.subprocess.run", side_effect=RuntimeError("配置包生成失败")):
            with self.assertRaisesRegex(RuntimeError, "配置包生成失败"):
                refresh_config_package(DEFAULT_OUT)


class MavenResourceInputTests(unittest.TestCase):
    """检查Maven声明的真实资源输入；不读取target产物，不另维护服务端配置表清单。"""

    @staticmethod
    def validate_resource_inputs(pom):
        """返回各资源源目录的实际文件；目录或include没有有效输入时失败，不能借用旧target缓存。"""
        namespace = {"m": "http://maven.apache.org/POM/4.0.0"}
        project = ET.parse(pom).getroot()
        resources = project.findall("m:build/m:resources/m:resource", namespace)
        if not resources:
            raise ValueError("Maven未声明资源输入")
        inputs = {}
        for resource in resources:
            source = resource.findtext("m:directory", default="", namespaces=namespace).strip()
            source = source.replace("${project.basedir}", str(pom.parent))
            if not source or "${" in source:
                raise ValueError(f"Maven资源目录无法静态解析：{source}")
            directory = (pom.parent / source).resolve()
            if not directory.is_dir():
                raise ValueError(f"Maven资源源目录不存在：{source}")
            excluded = set()
            for exclude in resource.findall("m:excludes/m:exclude", namespace):
                pattern = (exclude.text or "").strip()
                if not pattern:
                    raise ValueError("Maven资源exclude不能为空")
                excluded.update(path for path in directory.glob(pattern) if path.is_file())
            selected = set()
            includes = resource.findall("m:includes/m:include", namespace)
            for include in includes:
                pattern = (include.text or "").strip()
                if not pattern:
                    raise ValueError("Maven资源include不能为空")
                matches = {path for path in directory.glob(pattern) if path.is_file()} - excluded
                if not matches:
                    raise ValueError(f"Maven资源include无匹配文件：{source}/{pattern}")
                selected.update(matches)
            if not includes:
                selected.update(path for path in directory.rglob("*") if path.is_file() and path not in excluded)
            if not selected:
                raise ValueError(f"Maven资源源目录无有效文件：{source}")
            inputs[directory] = selected
        return inputs

    def setUp(self):
        """创建独立Maven资源样板和旧target缓存，反例不改项目配置或实际构建产物。"""
        temporary = ROOT / "client/temp"
        temporary.mkdir(parents=True, exist_ok=True)
        # 本用例独享的临时目录，在清理阶段移除，不修改项目源资源。
        self.temporary = tempfile.TemporaryDirectory(dir=temporary)
        self.addCleanup(self.temporary.cleanup)
        # 样板项目根路径，用于解析其相对资源目录。
        self.fixture = Path(self.temporary.name)
        # 本次用例写入并解析的Maven构建定义。
        self.pom = self.fixture / "pom.xml"
        # 样板中唯一可信的资源源目录，与旧target缓存分开。
        self.source = self.fixture / "source"
        self.source.mkdir()
        (self.source / "table.json").write_text('{"rows":[1]}', encoding="utf-8")
        cached = self.fixture / "target/classes/gameplay/table.json"
        cached.parent.mkdir(parents=True)
        cached.write_text('{"rows":["stale"]}', encoding="utf-8")

    def write_fixture_pom(self, directory="source", include="table.json", exclude=None):
        """只改临时POM的资源输入，用于验证源目录、通配符和排除项。"""
        exclusion = f"<excludes><exclude>{exclude}</exclude></excludes>" if exclude else ""
        self.pom.write_text(
            '<project xmlns="http://maven.apache.org/POM/4.0.0"><build><resources>'
            f'<resource><directory>{directory}</directory><includes><include>{include}</include></includes>'
            f'{exclusion}</resource></resources></build></project>', encoding="utf-8")

    def test_current_backend_resources(self):
        """服务端全部资源目录和include必须有真实源文件，共享配置必须来自当前Bundle目录。"""
        inputs = self.validate_resource_inputs(ROOT / "backend/pom.xml")
        self.assertIn(DEFAULT_OUT.resolve(), inputs)
        self.assertTrue(all(path.suffix == ".json" for path in inputs[DEFAULT_OUT.resolve()]))

    def test_missing_source_fails_with_stale_target(self):
        """即使target缓存存在，旧资源源目录已移走也必须失败。"""
        self.write_fixture_pom(directory="old-source")
        with self.assertRaisesRegex(ValueError, "源目录不存在.*old-source"):
            self.validate_resource_inputs(self.pom)

    def test_missing_include_fails_with_stale_target(self):
        """目录存在但include错误或被全部排除时必须失败，不能得到零文件成功结果。"""
        self.write_fixture_pom(include="missing.json")
        with self.assertRaisesRegex(ValueError, "include无匹配文件.*missing.json"):
            self.validate_resource_inputs(self.pom)
        self.write_fixture_pom(exclude="table.json")
        with self.assertRaisesRegex(ValueError, "include无匹配文件.*table.json"):
            self.validate_resource_inputs(self.pom)

    def test_wildcard_and_basedir_resolve_to_source(self):
        """项目基目录及Maven常见递归include可找到当前源文件，并忽略旧target。"""
        self.write_fixture_pom(directory="${project.basedir}/source", include="**/*.json")
        inputs = self.validate_resource_inputs(self.pom)
        self.assertEqual(inputs, {self.source.resolve(): {(self.source / "table.json").resolve()}})


def load_tests(loader, tests, pattern):
    """统一配置专项覆盖Bundle、挂机活动和精灵定向导出，不另增一套人工检查入口。"""
    tests.addTests(loader.loadTestsFromModule(test_bundle_paths))
    tests.addTests(loader.loadTestsFromModule(test_idle_activity_export))
    tests.addTests(loader.loadTestsFromModule(test_spirit_export))
    return tests


if __name__ == "__main__":
    unittest.main()
