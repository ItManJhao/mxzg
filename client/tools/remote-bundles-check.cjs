/** 整体远程资源离线检查：从现有目录meta读取包配置，不产生运行时资源清单。
 * 默认检查源码归属；传入构建目录时检查实际远程输出、启动依赖及包循环。
 * 只读验证，不删除资源、不替代Creator构建或浏览器下载验收。
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');

/** 遍历已有文件，用于发现Bundle与统计产物，不扫描网络或修改目录。 */
function files(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const file = path.join(directory, entry.name);
        return entry.isDirectory() ? files(file) : [file];
    });
}

/** 拒绝循环和不存在的依赖；成功表示元数据图可按顺序加载，不表示资源下载已通过。 */
function checkDependencies(configs, name, ancestors = []) {
    assert(!ancestors.includes(name), 'Bundle循环：' + ancestors.concat(name).join(' → '));
    assert(configs.has(name), '依赖包缺失：' + name);
    for (const dependency of configs.get(name).deps || []) {
        checkDependencies(configs, dependency, ancestors.concat(name));
    }
}

for (const old of ['ui', 'resources', 'prefabs']) {
    assert(!fs.existsSync(path.join(root, 'client/assets', old)), '旧顶层目录仍存在：' + old);
}
const settings = JSON.parse(fs.readFileSync(path.join(root, 'client/settings/v2/packages/builder.json')));
const bundles = files(path.join(root, 'client/assets')).filter(file => file.endsWith('.meta')).map(file => {
    const meta = JSON.parse(fs.readFileSync(file));
    return { file, meta };
}).filter(({ meta }) => meta.importer === 'directory' && meta.userData?.isBundle);
const remoteNames = [];
for (const { file, meta } of bundles) {
    const name = meta.userData.bundleName;
    if (name === 'bootstrap') {
        assert.equal(meta.userData.bundleConfigID, 'default');
        assert.equal(meta.userData.priority, 19);
    } else {
        const config = settings.bundleConfig.custom[meta.userData.bundleConfigID];
        for (const platform of ['web', 'native', 'miniGame']) {
            assert.equal(config?.configs[platform].preferredOptions.isRemote, true, file + ' 未配置远程');
        }
        remoteNames.push(name);
    }
}
const scene = JSON.parse(fs.readFileSync(path.join(root, 'client/assets/scenes/Remake.scene')));
const app = scene.find(row => row.loadingPrefab && row.socketUrl);
assert(app && !app.loginPrefab, '启动场景不得绑定完整登录页');
const bootMeta = JSON.parse(fs.readFileSync(path.join(root, 'client/assets/bundles/bootstrap/prefabs/LoadingLayer.prefab.meta')));
assert.equal(app.loadingPrefab.__uuid__, bootMeta.uuid);
assert(!fs.existsSync(path.join(root, 'client/assets/bundles/login/prefabs/LoadingLayer.prefab')), '旧加载层副本仍存在');
console.log('源码远程包：' + remoteNames.length + '个；本地仅bootstrap和引擎/场景，旧顶层资源目录已移除。');

if (process.argv[2]) {
    const build = path.resolve(root, process.argv[2]);
    const built = JSON.parse(fs.readFileSync(path.join(build, 'src/settings.json')));
    assert(built.assets.preloadBundles.some(entry => entry.bundle === 'bootstrap'), '引擎启动前未预载bootstrap');
    assert.deepEqual([...built.assets.remoteBundles].sort(), remoteNames.sort(), '构建远程包与当前源码不一致');
    const configs = new Map();
    for (const base of ['assets', 'remote']) {
        for (const file of files(path.join(build, base)).filter(file => path.basename(file) === 'config.json')) {
            const config = JSON.parse(fs.readFileSync(file));
            assert(!configs.has(config.name), '同名包重复输出：' + config.name);
            configs.set(config.name, config);
        }
    }
    for (const name of configs.keys()) {
        checkDependencies(configs, name);
    }
    for (const name of ['bootstrap', 'main']) {
        const pending = [name], seen = new Set();
        while (pending.length) {
            const current = pending.pop();
            if (seen.has(current)) continue;
            seen.add(current);
            assert(!remoteNames.includes(current), name + ' 启动依赖包含远程包：' + current);
            pending.push(...(configs.get(current)?.deps || []));
        }
    }
    for (const name of remoteNames) {
        assert(fs.existsSync(path.join(build, 'remote', name, 'config.json')), name + ' 未输出到remote');
        assert(!fs.existsSync(path.join(build, 'assets', name)), name + ' 仍有本地整包');
    }
    const size = base => files(path.join(build, base)).reduce((sum, file) => sum + fs.statSync(file).size, 0);
    console.log(JSON.stringify({ localAssetBytes: size('assets'), remoteAssetBytes: size('remote'), dependencies: 'passed' }));
}
