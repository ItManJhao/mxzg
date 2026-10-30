"""Explicit-plan Prefab cleanup. Default is read-only; --apply deletes only audited asset pairs."""
import argparse
import hashlib
import json
import re
import uuid
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'client/assets'
PLAN = ROOT / 'tools/prefab-plan.json'
REPORT = ROOT / 'docs/prefab-cleanup-manifest.json'

def read(path): return json.loads(path.read_text(encoding='utf-8-sig'))
def tokens(value):
    if isinstance(value, str): yield value
    elif isinstance(value, dict):
        for child in value.values(): yield from tokens(child)
    elif isinstance(value, list):
        for child in value: yield from tokens(child)

def inventory():
    files = {p.relative_to(ASSETS).as_posix()[:-7]: p for p in ASSETS.rglob('*.prefab')}
    ids = {read(Path(str(p)+'.meta'))['uuid']: name for name,p in files.items()}
    groups = read(PLAN)['groups']
    keep = {}
    for group in groups:
        for name in group['names']:
            key = group['directory']+'/'+name
            if key not in files: raise ValueError('Missing planned Prefab: '+key)
            keep[key] = {'reason':group['reason'], 'phases':group['phases']}
    pending = list(keep)
    while pending:
        key = pending.pop()
        for token in tokens(read(files[key])):
            target = ids.get(token.split('@')[0])
            if target and target not in keep:
                keep[target] = {'reason':'Serialized dependency of '+key, 'phases':keep[key]['phases']}
                pending.append(target)
    # Verify all scene Prefab links survive. A scene cannot silently override the plan.
    for scene in ASSETS.rglob('*.scene'):
        for token in tokens(read(scene)):
            target = ids.get(token.split('@')[0])
            if target and target not in keep: raise ValueError('Unplanned scene dependency: '+str(scene)+' -> '+target)
    sites = {key:[] for key in files if key not in keep}
    for script in (ASSETS/'scripts').rglob('*.ts'):
        for number,line in enumerate(script.read_text(encoding='utf-8-sig').splitlines(),1):
            for path in re.findall(r'[\"\'](prefabs/ui/[\w/-]+)[\"\']',line):
                if path in sites: sites[path].append(str(script.relative_to(ASSETS))+':'+str(number))
    removed = [{'path':key+'.prefab','uuid':read(Path(str(p)+'.meta'))['uuid'],
                'source_bytes':p.stat().st_size,'legacy_code_sites':sites[key]}
               for key,p in sorted(files.items()) if key not in keep]
    return files, keep, removed

def write_runtime(keep):
    path=ASSETS/'scripts/config/PrefabPlan.ts'
    text='/** Generated from tools/prefab-plan.json by tools/prune_prefabs.py. */\n'
    text+='const paths = new Set<string>('+json.dumps(sorted(keep),indent=2)+');\n'
    text+='export function prefabInPlan(path: string): boolean { return paths.has(path); }\n'
    path.write_text(text,encoding='utf-8')
    meta=Path(str(path)+'.meta')
    if not meta.exists():
        meta.write_text(json.dumps(dict(ver='4.0.24',importer='typescript',imported=True,
            uuid=str(uuid.uuid5(uuid.NAMESPACE_URL,'mxzg/PrefabPlan.ts')),files=[],subMetas={},userData={}),indent=2)+'\n',encoding='utf-8')

def apply(files,keep,removed):
    if not removed:
        write_runtime(keep)
        print('Already matches plan; previous deletion manifest preserved.')
        return
    fingerprints={str(path):hashlib.sha256(path.read_bytes()).hexdigest()
        for key in keep for path in [files[key],Path(str(files[key])+'.meta')]}
    # Back up exact bytes outside assets, including any uncommitted/importer metadata.
    backup=ROOT/'client/temp/prefab-cleanup'/('removed-'+uuid.uuid4().hex+'.zip')
    backup.parent.mkdir(parents=True,exist_ok=True)
    targets=[]
    for item in removed:
        path=(ASSETS/item['path']).resolve()
        if not path.is_relative_to(ASSETS.resolve()) or path.suffix!='.prefab': raise ValueError('Unsafe deletion '+str(path))
        targets.extend([path,Path(str(path)+'.meta')])
    backup_targets=set(targets)
    for path in targets:
        for parent in path.parents:
            if parent==ASSETS: break
            if parent.is_relative_to(ASSETS):
                meta=Path(str(parent)+'.meta')
                if meta.is_file():backup_targets.add(meta)
    with zipfile.ZipFile(backup,'w',zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(backup_targets):
            if path.is_file(): archive.write(path,path.relative_to(ASSETS).as_posix())
    for path in targets:
        if path.exists(): path.unlink()
    # Only empty folders are removed; never recursively delete arbitrary contents.
    for folder in sorted((p for p in (ASSETS/'prefabs').rglob('*') if p.is_dir()),key=lambda p:len(p.parts),reverse=True):
        resolved=folder.resolve()
        if not resolved.is_relative_to((ASSETS/'prefabs').resolve()): raise ValueError('Unsafe directory '+str(folder))
        if not any(folder.iterdir()):
            folder.rmdir()
            meta=Path(str(folder)+'.meta')
            if meta.exists(): meta.unlink()
    # Remove retired entries from UUID fallback and shell registration, not game data.
    loader=ASSETS/'scripts/ui/prefabLoad.ts'
    loader.write_text('\n'.join(line for line in loader.read_text(encoding='utf-8-sig').splitlines()
        if not any('"'+item['path'][:-7]+'":' in line for item in removed))+'\n',encoding='utf-8')
    shell=ASSETS/'scripts/ui/prefabShellMap.ts'
    shell.write_text('\n'.join(line for line in shell.read_text(encoding='utf-8-sig').splitlines()
        if not any('shell("'+item['path'][:-7]+'"' in line for item in removed))+'\n',encoding='utf-8')
    write_runtime(keep)
    for path,digest in fingerprints.items():
        if hashlib.sha256(Path(path).read_bytes()).hexdigest()!=digest:raise ValueError('Retained asset changed: '+path)
    REPORT.write_text(json.dumps({'plan':'tools/prefab-plan.json','kept_count':len(keep),
        'removed_count':len(removed),'backup':str(backup.relative_to(ROOT)),
        'kept':[{'path':key+'.prefab',**value} for key,value in sorted(keep.items())],
        'removed':removed},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Backup:',backup)

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--apply',action='store_true')
    args=parser.parse_args();files,keep,removed=inventory()
    print('Prefab plan: total',len(files),'keep',len(keep),'remove',len(removed))
    print('Removed source bytes:',sum(row['source_bytes'] for row in removed))
    if args.apply: apply(files,keep,removed)
    return 0
if __name__=='__main__':raise SystemExit(main())
