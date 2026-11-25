"""人工Prefab指纹的换行专项：仅允许CRLF/LF等价，不修改源资源、人工签收或生成报告。"""
import hashlib
import unittest

from audit_prefabs import report_fingerprints


class AcceptanceFingerprintTest(unittest.TestCase):
    """保护跨平台文本检出，同时拒绝真正的Prefab文本和内容变化。"""

    def test_report_is_stable_across_checkouts_and_preserves_manual_sha(self):
        """已签与未签资源在两种检出下报告一致，人工签收的原 SHA 始终独立校验。"""
        lf = b'{\n    "opacity": 255\n}\n'
        crlf = lf.replace(b'\n', b'\r\n')
        canonical = hashlib.sha256(lf).hexdigest()
        signed_crlf = hashlib.sha256(crlf).hexdigest()
        for current in (lf, crlf):
            with self.subTest(current=current):
                for recorded in (None, canonical):
                    self.assertEqual(report_fingerprints(current, recorded, 'Fixture.prefab'), {'sha256': canonical})
                self.assertEqual(report_fingerprints(current, signed_crlf, 'Fixture.prefab'), {
                    'sha256': canonical,
                    'acceptanceFingerprintDifference': {
                        'difference': '仅CRLF/LF差异',
                        'recordedSha256': signed_crlf,
                        'normalizedLfSha256': canonical,
                    },
                })

    def test_content_format_bom_and_lone_cr_changes_are_rejected(self):
        """值、缩进、BOM、结尾空行和孤立CR不是换行制式转换，不能冒用旧签收。"""
        original = b'{\n    "opacity": 255\n}\n'
        changed = [
            original.replace(b'255', b'254'),
            original.replace(b'    ', b'  '),
            b'\xef\xbb\xbf' + original,
            original + b'\n',
            original.replace(b'\n', b'\r'),
            original.replace(b'\n', b'\r\r\n'),
        ]
        for signed in (original, original.replace(b'\n', b'\r\n')):
            recorded = hashlib.sha256(signed).hexdigest()
            for source in changed:
                with self.subTest(signed=signed, source=source), self.assertRaisesRegex(AssertionError, '须重新核对'):
                    report_fingerprints(source, recorded, 'Fixture.prefab')


if __name__ == '__main__':
    unittest.main()
