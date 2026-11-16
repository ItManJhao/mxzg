"""人工Prefab指纹的换行专项：仅允许CRLF/LF等价，不修改源资源、人工签收或生成报告。"""
import hashlib
import unittest

from audit_prefabs import acceptance_fingerprint


class AcceptanceFingerprintTest(unittest.TestCase):
    """保护跨平台文本检出，同时拒绝真正的Prefab文本和内容变化。"""

    def test_exact_bytes_need_no_equivalence_annotation(self):
        """字节一致继续使用人工原记录，不虚构换行差异。"""
        source = b'{\n    "opacity": 255\n}\n'
        recorded = hashlib.sha256(source).hexdigest()
        self.assertIsNone(acceptance_fingerprint(source, recorded, 'Fixture.prefab'))

    def test_lf_and_crlf_are_equivalent_in_both_directions(self):
        """两种统一换行互换都保留原记录，并明确报告等价原因及LF指纹。"""
        lf = b'{\n    "opacity": 255\n}\n'
        crlf = lf.replace(b'\n', b'\r\n')
        for original, current in ((lf, crlf), (crlf, lf)):
            with self.subTest(original=original):
                recorded = hashlib.sha256(original).hexdigest()
                difference = acceptance_fingerprint(current, recorded, 'Fixture.prefab')
                self.assertEqual(difference, {
                    'difference': '仅CRLF/LF差异',
                    'recordedSha256': recorded,
                    'normalizedLfSha256': hashlib.sha256(lf).hexdigest(),
                })

    def test_content_format_bom_and_lone_cr_changes_are_rejected(self):
        """值、缩进、BOM、结尾空行和孤立CR不是换行制式转换，不能冒用旧签收。"""
        original = b'{\n    "opacity": 255\n}\n'
        recorded = hashlib.sha256(original).hexdigest()
        changed = [
            original.replace(b'255', b'254'),
            original.replace(b'    ', b'  '),
            b'\xef\xbb\xbf' + original,
            original + b'\n',
            original.replace(b'\n', b'\r'),
        ]
        for source in changed:
            with self.subTest(source=source), self.assertRaisesRegex(AssertionError, '须重新核对'):
                acceptance_fingerprint(source, recorded, 'Fixture.prefab')


if __name__ == '__main__':
    unittest.main()
