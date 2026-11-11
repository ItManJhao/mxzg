"""战斗布局审查的九宫格回归：保护旧原尺寸零边距节点，并拒绝无边距拉伸。

使用纯数据调用检查函数，不修改Prefab、图片meta或人工视觉验收记录。
"""
import unittest

from check_battle_prefab_layout import validate_sliced_frame


class SlicedFrameTest(unittest.TestCase):
    """覆盖旧184×67标题原尺寸及尺寸变化边界，防止校验被整体放宽。"""

    def setUp(self):
        """准备与旧标题尺寸相同的零边距数据，测试中不读取或改动源图片。"""
        self.frame = {"rawWidth": 184, "rawHeight": 67}

    def test_zero_border_original_size_is_valid(self):
        """旧Scale9使用原尺寸不产生拉伸，应允许保留原表现。"""
        validate_sliced_frame(self.frame, {"width": 184, "height": 67})

    def test_zero_border_resize_is_rejected(self):
        """放大和缩小两个方向都必须拒绝，不能将零边距当作可拉伸面板。"""
        for size in ({"width": 185, "height": 67}, {"width": 183, "height": 67},
                     {"width": 184, "height": 68}, {"width": 184, "height": 66}):
            with self.subTest(size=size), self.assertRaisesRegex(AssertionError, "不得拉伸"):
                validate_sliced_frame(self.frame, size)

    def test_valid_borders_allow_stretching(self):
        """存在合法九宫格边距时保留拉伸能力，仍拒绝越界和负边距。"""
        frame = {**self.frame, "borderLeft": 8, "borderRight": 8, "borderTop": 8, "borderBottom": 8}
        validate_sliced_frame(frame, {"width": 300, "height": 90})
        with self.assertRaisesRegex(AssertionError, "不能为负"):
            validate_sliced_frame({**frame, "borderLeft": -1}, {"width": 300, "height": 90})
        with self.assertRaisesRegex(AssertionError, "超出原图"):
            validate_sliced_frame({**frame, "borderLeft": 185}, {"width": 300, "height": 90})


if __name__ == "__main__":
    unittest.main()
