"""Bundle离线路径回归：覆盖任意普通父目录、旧证据解析、重名和越界拒绝，不改现有资源。"""
import json
import tempfile
import unittest
from pathlib import Path

from bundle_paths import bundle_asset_path, bundle_directory, discover_bundles, resolve_asset_path


class BundlePathTests(unittest.TestCase):
    """用临时目录的真实meta声明验证发现能力，不复制项目包名分组清单。"""

    def setUp(self):
        """创建任意层级的测试包与普通父目录，包身份只来自meta。"""
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.assets = Path(self.temporary.name) / "assets"
        self.directory = self.assets / "bundles/arbitrary/deeper/art"
        self.directory.mkdir(parents=True)
        Path(str(self.directory) + ".meta").write_text(json.dumps({
            "userData": {"isBundle": True, "bundleName": "fixture"}}), encoding="utf-8")
        self.image = self.directory / "ui/icon.png"
        self.image.parent.mkdir()
        self.image.write_bytes(b"fixture")

    def test_identity_comes_from_meta(self):
        """普通父目录不产生额外包，声明名与目录末段不同也能定位。"""
        self.assertEqual(discover_bundles(self.assets), {"fixture": self.directory.resolve()})
        self.assertEqual(bundle_directory("fixture", self.assets), self.directory.resolve())
        with self.assertRaisesRegex(ValueError, "未发现Bundle"):
            bundle_directory("arbitrary", self.assets)

    def test_legacy_path_resolves_without_changing_evidence(self):
        """旧包路径可定位迁移后的原资源，错误资源名仍不存在，不能仅凭包存在报通过。"""
        old = self.assets / "bundles/fixture/ui/icon.png"
        self.assertEqual(resolve_asset_path(old, self.assets), self.image.resolve())
        self.assertFalse(old.exists())
        self.assertFalse(resolve_asset_path("bundles/fixture/ui/missing.png", self.assets).exists())
        self.assertEqual(resolve_asset_path(self.image, self.assets), self.image.resolve())

    def test_bundle_relative_paths_cannot_escape(self):
        """离线导出与检查都拒绝包内目录穿越和绝对盘符路径。"""
        for relative in ("../outside", "/outside", "C:/outside"):
            with self.subTest(relative=relative), self.assertRaisesRegex(ValueError, "安全相对路径"):
                bundle_asset_path("fixture", relative, self.assets)

    def test_duplicate_names_fail(self):
        """同一次发现中的重名包必须失败，不能任取一个目录遮盖问题。"""
        other_assets = self.assets / "other-root"
        for name in ("one", "two"):
            directory = other_assets / name
            directory.mkdir(parents=True)
            Path(str(directory) + ".meta").write_text(json.dumps({
                "userData": {"isBundle": True, "bundleName": "duplicate"}}), encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "名称重复"):
            discover_bundles(other_assets)


if __name__ == "__main__":
    unittest.main()
