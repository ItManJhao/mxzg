import json
import tempfile
import unittest
from pathlib import Path
from resource_audit import audit

class ResourceAuditTest(unittest.TestCase):
    def test_serialized_closure_atlas_bundle_and_duplicates(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            ids = [f"00000000-0000-0000-0000-{i:012d}" for i in range(1, 6)]
            def put(name, data, uid):
                p = root/name; p.parent.mkdir(parents=True, exist_ok=True)
                p.write_text(data, encoding="utf-8")
                Path(str(p)+'.meta').write_text(json.dumps({'uuid':uid}), encoding='utf-8')
            put('scenes/Remake.scene', json.dumps({'home':{'__uuid__':ids[1]}}), ids[0])
            put('feature/Home.prefab', json.dumps({'source':{'__uuid__':ids[2]}}), ids[1])
            put('resources/cast.json', '{}', ids[2])
            Path(str(root/'resources/cast.json')+'.meta').write_text(json.dumps({'uuid':ids[2], 'userData':{'atlasUuid':ids[3]}}),encoding='utf-8')
            put('resources/cast.atlas', 'cast.png\nsize: 1,1\n', ids[3])
            put('resources/cast.png', 'same-pixels', ids[4])
            (root/'duplicate.png').write_text('same-pixels',encoding='utf-8')
            (root/'feature.meta').write_text(json.dumps({'uuid':'folder', 'userData':{'isBundle':True,'bundleName':'feature'}}),encoding='utf-8')
            report = audit(root, True)
            self.assertEqual(report['errors'], [])
            self.assertEqual(report['scenes'][0]['files'],5)
            self.assertEqual(report['bundles']['feature']['files'],1)
            self.assertEqual(report['duplicates'][0]['extra_source_bytes'],len('same-pixels'))
            (root/'scenes/Remake.scene').write_text('{}',encoding='utf-8')
            after = audit(root)
            self.assertEqual(after['scenes'][0]['files'],1)
            self.assertFalse(after['duplicate_scan'])

    def test_unknown_uuid_and_broken_atlas_are_not_unused_asset_proof(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            (root/'entry.scene').write_text(json.dumps({'__uuid__':'11111111-1111-1111-1111-111111111111'}),encoding='utf-8')
            (root/'bad.atlas').write_text('missing.png\nsize: 1,1\n',encoding='utf-8')
            report=audit(root)
            self.assertEqual(len(report['unresolved_uuids']),1)
            self.assertIn('missing atlas page',report['errors'][0]['error'])

if __name__ == '__main__': unittest.main()
