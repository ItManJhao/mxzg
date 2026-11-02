/** 从明确资源范围和 Creator meta 生成类型化描述、动态 ID 映射及 Prefab UUID；不加载资源或推断缺失图片。 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const assets = path.join(root, 'client/assets');
const check = process.argv.includes('--check');
const input = JSON.parse(fs.readFileSync(path.join(root, 'config/resource-catalog.json'), 'utf8'));
/** 稳定遍历指定范围；不扫描无关美术目录。 */
function files(dir) { return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en')).flatMap(e => e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]); }
/** 读取相对仓库的 JSON。 */
function json(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
/** 将资源名转换为合法字段名，碰撞由登记步骤拒绝。 */
function key(name) { const k = name.replace(/[^A-Za-z0-9_]/g, '_'); return /^\d/.test(k) ? '_' + k : k; }
const groups = {}, byPath = {}, descriptors = [], prefabIds = {};
/** 根据最近 Bundle 目录定位加载路径，不把目录名当成 Bundle 名。 */
function location(file) {
    let dir = path.dirname(file);
    while (dir.startsWith(assets)) {
        if (path.basename(dir) === 'resources') return { bundle: 'resources', path: path.relative(dir, file).replace(/\\/g, '/').replace(/\.[^.]+$/, '') };
        if (fs.existsSync(dir + '.meta')) {
            const data = json(dir + '.meta').userData;
            if (data?.isBundle) return { bundle: data.bundleName || path.basename(dir), path: path.relative(dir, file).replace(/\\/g, '/').replace(/\.[^.]+$/, '') };
        }
        dir = path.dirname(dir);
    }
    throw Error('资源不在可加载 Bundle：' + path.relative(root, file));
}
/** 登记真实路径、类型和 UUID；规范化同名必须显式区分，不能覆盖。 */
function register(file, group, name, type, sub) {
    const meta = json(file + '.meta'), loc = location(file), k = key(input.keyOverrides?.[loc.path] || name);
    const uuid = sub?.uuid || meta.uuid;
    const loadPath = type === 'SpriteFrame' ? loc.path + '/' + (sub?.name || 'spriteFrame') : loc.path;
    const descriptor = { bundle: loc.bundle, path: loc.path, assetPath: path.relative(assets, file).replace(/\\/g, '/').replace(/\.[^.]+$/, ''), loadPath, type, uuid };
    groups[group] ||= {};
    if (groups[group][k] && groups[group][k].uuid !== uuid) throw Error('资源键碰撞：' + group + '.' + k);
    groups[group][k] = descriptor;
    byPath[loc.path] = { group, key: k, descriptor };
    descriptors.push(descriptor);
    return { group, key: k, descriptor };
}
/** 依据 meta importer 与子资源类型登记，图片纹理与 SpriteFrame 不混用。 */
function registerFile(file, forcedGroup) {
    const meta = json(file + '.meta'), loc = location(file);
    const group = forcedGroup || (loc.path.startsWith('ui/') ? loc.path.split('/')[1] : loc.path.split('/')[0]);
    const name = path.basename(file, path.extname(file));
    if (meta.importer === 'image') {
        const frames = Object.values(meta.subMetas || {}).filter(s => s.importer === 'sprite-frame');
        if (frames.length !== 1) throw Error('独立图片需要唯一 SpriteFrame：' + loc.path);
        return register(file, group, name, 'SpriteFrame', frames[0]);
    }
    if (meta.importer === 'prefab') {
        const item = register(file, group, name, 'Prefab');
        prefabIds[path.relative(assets, file).replace(/\\/g, '/').replace(/\.prefab$/, '')] = meta.uuid;
        return item;
    }
    if (meta.importer === 'sprite-atlas') {
        for (const frame of Object.values(meta.subMetas || {}).filter(s => s.importer === 'sprite-frame'))
            register(file, group, name + '__' + frame.name, 'SpriteFrame', frame);
        return register(file, group, name + '__atlas', 'SpriteAtlas');
    }
    const type = { 'audio-clip': 'AudioClip', 'spine-data': 'SkeletonData', json: 'JsonAsset' }[meta.importer];
    if (!type) throw Error('未声明资源类型：' + loc.path + ' / ' + meta.importer);
    return register(file, group, name, type);
}
/** 查找资源源文件；同一加载路径多个类型时拒绝模糊推断。 */
function source(relative) {
    const extensions = input.extensions?.[relative] ? [input.extensions[relative]] : ['.png', '.jpg', '.json', '.mp3', '.wav', '.plist'];
    const candidates = extensions.map(ext => path.join(assets, 'resources', relative + ext)).filter(fs.existsSync);
    if (candidates.length !== 1) throw Error('资源路径缺失或类型不唯一：' + relative);
    return candidates[0];
}
for (const relative of input.commonPaths) registerFile(source(relative), 'common');
for (const relative of json(path.join(root, 'config/resource-catalog.json')).staticPaths) registerFile(source(relative));
for (const file of files(assets).filter(f => f.endsWith('.prefab'))) registerFile(file, 'prefab_' + key(path.basename(path.dirname(file))));
const staticKeys = Object.fromEntries(Object.entries(groups).map(([group, entries]) => [group, Object.keys(entries)]));
const itemIcons = {}, heroIcons = {}, missing = [];
/** 动态 ID 只映射实际存在的配置资源；缺失项保留报告，由业务使用明确占位图。 */
function icon(map, id, relative) {
    const file = path.join(assets, 'resources', relative + '.png');
    if (!fs.existsSync(file)) { missing.push({ id, path: relative }); return; }
    const registered = byPath[relative] || registerFile(file);
    map[id] = registered;
}
for (const row of json(path.join(assets, 'resources/config/item.json')).rows) {
    // 配置允许多种道具共用一张图，不能用物品 ID 代替显式 icon 而制造缺图或显示错误图片。
    const relative = typeof row.icon === 'string' && row.icon.startsWith('hero-icon/') ? 'ui/hero/hero-icon_' + row.icon.slice(10)
        : typeof row.icon === 'string' && row.icon.startsWith('backpack/') ? 'ui/bag/backpack_' + row.icon.slice(9)
        : 'ui/bag/backpack_' + row.idx;
    icon(itemIcons, row.idx, relative);
}
for (const row of json(path.join(assets, 'resources/config/herotype.json')).rows) if (row.item_id) icon(heroIcons, row.type, 'ui/hero/hero-icon_' + row.item_id);
const output = ['/** 由 tools/generate_resources.cjs 生成；只登记资源描述，不预加载。修改扫描输入后重新生成。 */',
    'export type ResourceKind = "SpriteFrame" | "SpriteAtlas" | "Prefab" | "AudioClip" | "SkeletonData" | "JsonAsset";',
    'export interface ResourceDescriptor<K extends ResourceKind = ResourceKind> { readonly bundle: string; readonly path: string; readonly assetPath: string; readonly loadPath: string; readonly type: K; readonly uuid: string; }',
    'export const ResourceCatalog = {'];
for (const group of Object.keys(staticKeys).sort()) {
    output.push('  ' + group + ': {');
    for (const name of staticKeys[group].sort()) output.push('    ' + name + ': ' + JSON.stringify(groups[group][name]) + ',');
    output.push('  },');
}
output.push('} as const;');
const icons = ['/** 由资源生成器按当前道具和英雄配置生成的实际图标映射；缺失 ID 不拼接未知地址。 */', 'import type { ResourceDescriptor } from "./ResourceCatalog";'];
for (const [name, map] of [['ItemIconById', itemIcons], ['HeroIconById', heroIcons]]) {
    icons.push('export const ' + name + ': Readonly<Partial<Record<number, ResourceDescriptor<"SpriteFrame">>>> = {');
    for (const id of Object.keys(map).sort((a, b) => Number(a) - Number(b))) icons.push('  ' + id + ': ' + JSON.stringify(map[id].descriptor) + ',');
    icons.push('};');
}
/** 检查模式逐字核对生成物；正常模式仅在内容变化时写入，避免导入抖动。 */
function write(relative, text) {
    const file = path.join(root, relative);
    if (check) { if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text) throw Error('生成结果已过期：' + relative); }
    else if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text) fs.writeFileSync(file, text);
}
write('client/assets/scripts/framework/assets/ResourceCatalog.ts', output.join('\n') + '\n');
write('client/assets/scripts/framework/assets/IconCatalog.ts', icons.join('\n') + '\n');
write('config/resource-missing.json', JSON.stringify(missing, null, 2) + '\n');
// UUID 索引随 Prefab 改名重建，其他导出的入口常量由既有文件保留。
const catalogFile = path.join(root, 'client/assets/scripts/config/PrefabCatalog.ts');
let catalog = fs.readFileSync(catalogFile, 'utf8');
catalog = catalog.replace(/export const PREFAB_UUID[^=]*=\s*\{[\s\S]*?\n\};/, 'export const PREFAB_UUID: Readonly<Record<string, string>> = ' + JSON.stringify(Object.fromEntries(Object.entries(prefabIds).sort()), null, 2) + ';');
write('client/assets/scripts/config/PrefabCatalog.ts', catalog);
console.log('资源目录验证：' + Object.keys(groups).length + ' 组，' + Object.keys(prefabIds).length + ' Prefab，缺失动态图标 ' + missing.length + ' 项（记录于 config/resource-missing.json）');
