/** UI自动图集构建副本清理：只处理配置中已核实的模块原图，不改源码、meta 或资源索引。
 * Creator 3.8.8 仍输出无使用者的原始 ImageAsset；先证明帧已合图、原图无路径及引用，再备份清理。
 * 默认只检查；--apply 才修改指定 Web 构建，备份位于 client/temp/bag-build-dedupe。
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');

/** Creator资源UUID的22字符压缩形式：前两位十六进制保留，其余15字节用Base64表示。 */
function compressedUuid(uuid) {
    assert(/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(uuid), '清理名单UUID格式错误');
    const hex = uuid.replace(/-/g, '');
    return hex.slice(0, 2) + Buffer.from(hex.slice(2), 'hex').toString('base64');
}

/** 只枚举普通文件，拒绝符号链接，避免清理越出所选构建目录。 */
function filesIn(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        assert(!entry.isSymbolicLink(), '构建目录不能含符号链接');
        const file = path.join(directory, entry.name);
        return entry.isDirectory() ? filesIn(file) : [file];
    });
}

/** 计算原始文件摘要；只有与项目原图完全一致的副本才允许清理。 */
function hash(file) {
    return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

/** 收集压缩数组和Texture2D对象中的字符串引用；不遗漏跨包或嵌套依赖。 */
function stringsIn(value) {
    if (typeof value === 'string') {
        return [value];
    }
    if (value && typeof value === 'object') {
        return Object.values(value).flatMap(stringsIn);
    }
    return [];
}

/** 逐项校验并生成清理计划；任一不变量失败时不写入、不删除。 */
function plan(build, candidates) {
    assert(build.startsWith(path.join(root, 'client/build') + path.sep), '只允许项目 client/build 内的独立构建');
    assert.equal(fs.realpathSync(build), build, '构建路径不能通过链接跳转');
    assert(fs.existsSync(path.join(build, 'index.html')), '必须先完成 Web 构建');
    // 远程Bundle输出在remote；与本地包一并核对引用，不能遗漏远程使用者。
    const files = ['assets', 'remote'].flatMap(directory => {
        const target = path.join(build, directory);
        return fs.existsSync(target) ? filesIn(target) : [];
    });
    const imports = files.filter(file => file.includes(path.sep + 'import' + path.sep) && file.endsWith('.json'));
    const bundles = files.filter(file => path.basename(file) === 'config.json').map(file => ({
        directory: path.dirname(file), config: JSON.parse(fs.readFileSync(file, 'utf8')),
    }));
    // 每个import只读取一次；跨包依赖仍全部检查，不因提速缩小检查范围。
    const dependencies = imports.map(file => {
        const json = JSON.parse(fs.readFileSync(file, 'utf8'));
        return { file, ids: stringsIn(json) };
    });
    const rows = [];
    assert.equal(new Set(candidates.map(image => image.uuid)).size, candidates.length, '清理名单有重复UUID');
    for (const { group, source, uuid } of candidates) {
        const name = path.basename(source);
        const sourceFile = path.resolve(root, source);
        const sourceRoots = ['client/assets/bundles'];
        assert(sourceRoots.some(directory => sourceFile.startsWith(path.join(root, directory) + path.sep)),
            '原图必须属于项目UI或Bundle目录');
        assert.equal(JSON.parse(fs.readFileSync(sourceFile + '.meta', 'utf8')).uuid, uuid, '原图UUID与清理名单不符');
        const compressed = compressedUuid(uuid);
        const owners = bundles.filter(bundle => bundle.config.uuids?.includes(compressed + '@f9941'));
        assert(owners.length > 0, name + ' 帧登记缺失');
        const originalIds = [uuid, compressed, uuid + '@6c48a', compressed + '@6c48a'];
        for (const bundle of bundles) {
            for (const id of originalIds) {
                const index = bundle.config.uuids.indexOf(id);
                assert(index < 0 || !bundle.config.paths[index], name + ' 原图或纹理仍可按路径动态加载，拒绝清理');
            }
        }
        // common可能在多个包保留帧登记。每一份实际帧包都必须指向同一张已存在的共享纹理。
        const textures = new Set();
        for (const { directory, config } of owners) {
            const frameIndex = config.uuids.indexOf(compressed + '@f9941');
            const packs = Object.entries(config.packs).filter(([, entries]) => entries.includes(frameIndex));
            if (!packs.length) {
                const redirects = config.redirect || [];
                const offset = redirects.findIndex((value, index) => index % 2 === 0 && value === frameIndex);
                const targetName = offset >= 0 ? config.deps[Number(redirects[offset + 1])] : undefined;
                const target = bundles.find(bundle => path.basename(bundle.directory) === targetName);
                const targetIndex = target?.config.uuids.indexOf(compressed + '@f9941') ?? -1;
                assert(targetIndex >= 0 && Object.values(target.config.packs).some(entries => entries.includes(targetIndex)),
                    '帧重定向必须指向已核实的实际帧包：' + name);
                continue;
            }
            assert.equal(packs.length, 1, '只支持已核实的合图帧打包格式');
            const pack = packs[0][0];
            const data = JSON.parse(fs.readFileSync(path.join(directory, 'import', pack.slice(0, 2), pack + '.json'), 'utf8'));
            assert(Array.isArray(data[1]) && data[1].length === 1, '合图帧包必须只依赖共享纹理');
            const texture = data[1][0];
            assert(typeof texture === 'string' && texture.endsWith('@6c48a') && !texture.startsWith(uuid) && !texture.startsWith(compressed),
                '帧仍引用原纹理，拒绝清理');
            textures.add(texture);
        }
        assert.equal(textures.size, 1, name + ' 跨包帧引用不一致，拒绝清理');
        const texture = Array.from(textures)[0];
        const atlasImage = texture.split('@')[0];
        const atlasFiles = files.filter(file => file.includes(path.sep + 'native' + path.sep) && path.basename(file) === atlasImage + '.png');
        assert.equal(atlasFiles.length, 1, '合图图片必须唯一存在');
        for (const entry of dependencies) {
            assert(!entry.ids.some(id => originalIds.includes(id)), '发现原图或原纹理使用者：' + entry.file);
        }
        const copies = files.filter(file => file.includes(path.sep + 'native' + path.sep) && path.basename(file) === uuid + '.png');
        assert(copies.length <= 1, '原图存在多个副本，需重新核对：' + name);
        if (!copies.length) {
            continue;
        }
        const file = copies[0];
        assert.equal(hash(file), hash(sourceFile), '不是原图副本');
        rows.push({ group, source, file, bytes: fs.statSync(file).size, sha256: hash(file), texture });
    }
    return rows;
}

/** 对指定构建先完整校验，再备份清理；返回数量与备份位置，重复执行可安全跳过。 */
function dedupeBagBuild(buildDirectory, apply = false) {
    const build = path.resolve(root, buildDirectory);
    // 每次构建读取最新范围，避免Creator常驻进程沿用旧名单；不扫描目录猜测可删资源。
    const candidates = JSON.parse(fs.readFileSync(path.join(root, 'config/ui-atlas-dedupe.json'), 'utf8')).images;
    const rows = plan(build, candidates);
    let backup = null;
    if (apply && rows.length) {
        const backupRoot = path.join(root, 'client/temp/bag-build-dedupe');
        fs.mkdirSync(backupRoot, { recursive: true });
        backup = fs.mkdtempSync(path.join(backupRoot, 'build-'));
        // 全部校验与备份成功后才删除；可由备份和记录恢复相同文件。
        for (const row of rows) {
            fs.copyFileSync(row.file, path.join(backup, path.basename(row.file)));
        }
        fs.writeFileSync(path.join(backup, 'manifest.json'), JSON.stringify({ build, rows }, null, 2));
        for (const row of rows) {
            fs.unlinkSync(row.file);
        }
    }
    return {
        applied: apply,
        files: rows.length,
        bytes: rows.reduce((sum, row) => sum + row.bytes, 0),
        groups: Array.from(new Set(candidates.map(image => image.group))).map(group => ({
            group,
            files: rows.filter(row => row.group === group).length,
            bytes: rows.filter(row => row.group === group).reduce((sum, row) => sum + row.bytes, 0),
        })),
        backup,
    };
}

module.exports = { dedupeBagBuild };

// Creator 直接调用同一入口；仅命令行运行时读取参数，保留手动排查能力。
if (require.main === module) {
    const directory = process.argv.slice(2).find(value => !value.startsWith('--')) || 'client/build/bag-atlas-review';
    console.log(JSON.stringify(dedupeBagBuild(directory, process.argv.includes('--apply'))));
}
