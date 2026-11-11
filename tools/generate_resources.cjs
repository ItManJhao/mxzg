/** 生成预制体UUID回退与玩法准入；资源按实际路径加载，不生成图片或模块资源清单。 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const assets = path.join(root, 'client/assets');
const check = process.argv.includes('--check');
/** 按稳定顺序收集文件；只为预制体导入回退读取meta。 */
function files(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))
        .flatMap(entry => entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
}
/** 检查生成结果；正常模式只写变化文件，避免重复触发Creator导入。 */
function write(relative, text) {
    const file = path.join(root, relative);
    if (check) {
        if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text) {
            throw Error('生成结果已过期：' + relative);
        }
    } else if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text) {
        fs.writeFileSync(file, text);
    }
}
const prefabIds = {};
for (const file of files(assets).filter(file => file.endsWith('.prefab'))) {
    const relative = path.relative(assets, file).split(path.sep).join('/').replace(/\.prefab$/, '');
    prefabIds[relative] = JSON.parse(fs.readFileSync(file + '.meta', 'utf8')).uuid;
}
// UUID 索引随 Prefab 改名重建，其他导出的入口常量由既有文件保留。
const catalogFile = path.join(root, 'client/assets/scripts/config/PrefabCatalog.ts');
let catalog = fs.readFileSync(catalogFile, 'utf8');
catalog = catalog.replace(/export const PREFAB_UUID[^=]*=\s*\{[\s\S]*?\n\};/, 'export const PREFAB_UUID: Readonly<Record<string, string>> = ' + JSON.stringify(Object.fromEntries(Object.entries(prefabIds).sort()), null, 2) + ';');
write('client/assets/scripts/config/PrefabCatalog.ts', catalog);
console.log("预制体索引验证：" + Object.keys(prefabIds).length + " Prefab；不生成资源名称清单");

// GM 等新增资源登记后同步运行时准入清单；只生成索引，不删除资源。
const prefabPlan = JSON.parse(fs.readFileSync(path.join(root, 'tools/prefab-plan.json'), 'utf8'));
const plannedPaths = [...new Set(prefabPlan.groups.flatMap(group => group.names.map(name => group.directory + '/' + name)))].sort();
write('client/assets/scripts/config/PrefabPlan.ts', '/** Generated from tools/prefab-plan.json by tools/generate_resources.cjs. */\nconst paths = new Set<string>([\n' + plannedPaths.map(value => '  ' + JSON.stringify(value)).join(',\n') + '\n]);\nexport function prefabInPlan(assetPath: string): boolean { return paths.has(assetPath); }\n');
