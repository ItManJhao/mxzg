"""当前已实现Prefab范围检查；默认只读，--apply只删除明确计划外的资源与meta并备份。"""
import argparse
import hashlib
import json
import re
import subprocess
import uuid
import zipfile
from pathlib import Path
from bundle_paths import resolve_asset_path

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
    """根据当前入口计划及序列化依赖计算保留范围，场景不得绕过计划增加未开放页面。"""
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
            for path in re.findall(r'[\"\'](bundles/(?:[\w-]+/)+prefabs/[\w-]+)[\"\']',line):
                current = resolve_asset_path(path).relative_to(ASSETS).as_posix()
                if current in sites: sites[current].append(str(script.relative_to(ASSETS))+':'+str(number))
    removed = [{'path':key+'.prefab','uuid':read(Path(str(p)+'.meta'))['uuid'],
                'source_bytes':p.stat().st_size,'legacy_code_sites':sites[key]}
               for key,p in sorted(files.items()) if key not in keep]
    return files, keep, removed

def write_runtime(keep):
    """复用唯一生成器刷新身份索引与准入，不另写输出格式或重建脚本UUID。"""
    subprocess.run(['node', str(ROOT/'tools/generate_resources.cjs')], cwd=ROOT, check=True)


def write_current_report(keep):
    """仅刷新保留项的现有地址，保留历史删除路径、UUID及备份记录；不修改assets。"""
    report = read(REPORT)
    report['kept_count'] = len(keep)
    report['kept'] = [{'path': key + '.prefab', **value} for key, value in sorted(keep.items())]
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

def apply(files,keep,removed):
    """先备份待删资源，保留文件按摘要保护；删除范围限定bundles，不触碰脚本与场景。"""
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
        if not path.is_relative_to((ASSETS/'bundles').resolve()) or path.suffix!='.prefab': raise ValueError('Unsafe deletion '+str(path))
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
    for folder in sorted((p for p in (ASSETS/'bundles').rglob('*') if p.is_dir()),key=lambda p:len(p.parts),reverse=True):
        resolved=folder.resolve()
        if not resolved.is_relative_to((ASSETS/'bundles').resolve()): raise ValueError('Unsafe directory '+str(folder))
        if not any(folder.iterdir()):
            folder.rmdir()
            meta=Path(str(folder)+'.meta')
            if meta.exists(): meta.unlink()
    # 按实际资源重新生成身份索引与准入，不手工编辑生成文件或修改业务配置。
    write_runtime(keep)
    for path,digest in fingerprints.items():
        if hashlib.sha256(Path(path).read_bytes()).hexdigest()!=digest:raise ValueError('Retained asset changed: '+path)
    REPORT.write_text(json.dumps({'plan':'tools/prefab-plan.json','kept_count':len(keep),
        'removed_count':len(removed),'backup':str(backup.relative_to(ROOT)),
        'kept':[{'path':key+'.prefab',**value} for key,value in sorted(keep.items())],
        'removed':removed},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Backup:',backup)

def main():
    """默认只读检查；--report只更新当前报告，--apply才允许执行原有备份删除流程。"""
    parser=argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument('--apply',action='store_true')
    modes.add_argument('--report',action='store_true')
    args=parser.parse_args();files,keep,removed=inventory()
    print('Prefab plan: total',len(files),'keep',len(keep),'remove',len(removed))
    print('Removed source bytes:',sum(row['source_bytes'] for row in removed))
    if args.apply: apply(files,keep,removed)
    if args.report:
        if removed:
            raise ValueError('存在计划外Prefab，不能只刷新报告来跳过资源审查')
        write_current_report(keep)
    return 0
if __name__=='__main__':raise SystemExit(main())
