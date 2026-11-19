"""校验保留的预制体及依赖，同时检查页面和模块代码是否仍引用已退役的预制体地址。"""
import json
import re
from prune_prefabs import ASSETS, REPORT, inventory, read, tokens
from bundle_paths import resolve_asset_path

files, keep, removed = inventory()
if removed: raise SystemExit('Out-of-plan Prefabs reintroduced: '+', '.join(row['path'] for row in removed))
report=read(REPORT)
retired={row['uuid'] for row in report['removed']}
for path in [*ASSETS.rglob('*.prefab'),*ASSETS.rglob('*.scene')]:
    for token in tokens(read(path)):
        if token.split('@')[0] in retired:raise SystemExit('Dangling deleted Prefab reference: '+str(path))
retired_paths = set()
for row in report['removed']:
    path=row['path'][:-7]
    current = resolve_asset_path(path).relative_to(ASSETS).as_posix() if path.startswith('bundles/') else path
    retired_paths.update((path, current))
# 页面在自身类上声明预制体，也可能从业务模块直接打开。检查真实引用处并报告文件名。
asset_literal = re.compile(r"""(["'`])((?:[\w.-]+/)+[\w.-]+)\1""")
for script in (ASSETS / 'scripts').rglob('*.ts'):
    for _, path in asset_literal.findall(script.read_text(encoding='utf-8-sig')):
        if path in retired_paths:
            raise SystemExit(f'Retired prefab still referenced in {script.relative_to(ASSETS)}: {path}')
runtime=(ASSETS/'scripts/config/PrefabPlanUtils.ts').read_text(encoding='utf-8-sig')
for path in keep:
    if json.dumps(path) not in runtime:raise SystemExit('Runtime plan missing '+path)
print(f'Prefab plan passed: {len(keep)} retained; deleted UUID references/registrations absent.')
