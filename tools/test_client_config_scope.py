"""当前客户端配置范围回归：验证完整读取闭包、缺表/空表拒绝与全量归档边界，不修改源资源。"""
import json
import shutil
import tempfile
import unittest
from pathlib import Path
import test_bundle_paths

from export_gameconfig import DEFAULT_OUT, DEFAULT_SRC, ROOT, check_table_reads, current_client_tables, export_current, require_output_mode, validate_current_scope


class ClientConfigScopeTests(unittest.TestCase):
    """在工作区临时目录模拟缺失与错误资源，现有配置与meta保持不变。"""

    def test_current_sources(self):
        """现有31表必须覆盖schema、原始动态读取、战斗美术、领域投影和全部语言依赖。"""
        tables = current_client_tables()
        self.assertEqual(len(tables), 31)
        self.assertIn("client/tools/battle-presentation-audit.ts", tables["buffart"])
        self.assertIn("chapterreward", tables)
        self.assertIn("heroevolvelevel", tables)
        self.assertIn("maincity/maincitypos", tables)
        self.assertIn("languagetype", tables)
        self.assertNotIn("arena", tables)
        counts = validate_current_scope(DEFAULT_OUT)
        self.assertEqual(counts["chapterreward"], 850)
        self.assertGreater(counts["item"], 100)
        self.assertGreater(counts["language"], 1000)

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

    def test_current_export_matches_assets(self):
        """默认导出到临时目录后，31份内容必须与现用资源逐字节一致，不能改主城或裁数据行。"""
        temporary = ROOT / "client/temp"
        temporary.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=temporary) as directory:
            out = Path(directory)
            export_current(DEFAULT_SRC, out)
            for name in current_client_tables():
                self.assertEqual((out / (name + ".json")).read_bytes(),
                                 (DEFAULT_OUT / (name + ".json")).read_bytes(), name)
            self.assertFalse((out / "manifest.json").exists())


def load_tests(loader, tests, pattern):
    """统一配置范围专项同时执行Bundle路径边界，不增加主检查入口或另一份分组表。"""
    tests.addTests(loader.loadTestsFromModule(test_bundle_paths))
    return tests


if __name__ == "__main__":
    unittest.main()
