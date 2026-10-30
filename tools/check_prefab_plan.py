"""Validate retained assets and reject accidental reintroduction of out-of-scope Prefabs."""
import json
from pathlib import Path
from prune_prefabs import ASSETS, ROOT, REPORT, inventory, read, tokens

files, keep, removed = inventory()
if removed: raise SystemExit('Out-of-plan Prefabs reintroduced: '+', '.join(row['path'] for row in removed))
report=read(REPORT)
retired={row['uuid'] for row in report['removed']}
for path in [*ASSETS.rglob('*.prefab'),*ASSETS.rglob('*.scene')]:
    for token in tokens(read(path)):
        if token.split('@')[0] in retired:raise SystemExit('Dangling deleted Prefab reference: '+str(path))
loader=(ASSETS/'scripts/ui/prefabLoad.ts').read_text(encoding='utf-8-sig')
shell=(ASSETS/'scripts/ui/prefabShellMap.ts').read_text(encoding='utf-8-sig')
for row in report['removed']:
    path=row['path'][:-7]
    if '"'+path+'":' in loader or 'shell("'+path+'"' in shell:
        raise SystemExit('Retired prefab still registered: '+path)
runtime=(ASSETS/'scripts/config/PrefabPlan.ts').read_text(encoding='utf-8-sig')
for path in keep:
    if json.dumps(path) not in runtime:raise SystemExit('Runtime plan missing '+path)
print(f'Prefab plan passed: {len(keep)} retained; deleted UUID references/registrations absent.')
