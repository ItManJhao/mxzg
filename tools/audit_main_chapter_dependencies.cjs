/**
 * 850关主线离线依赖审计入口：实际Java能力预检与客户端表现解析共同决定静态支持性。
 * node tools/audit_main_chapter_dependencies.cjs --write 先运行只读Java测试，当前报告写入client/temp。
 * 保留证据时显式追加--snapshot=YYYYMMDD或YYYYMMDD-批次标签，才写docs/validation，避免覆盖历史报告。
 * --from-java仅复用摘要完全匹配的本次Java证据；--check比较已保存报告，不启动服务、不运行玩家战斗或发奖。
 * 审计结果不是运行时资源清单、玩法开放许可或完整战斗/Creator画面验收；不猜测未知字段的依赖语义。
 */
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');
const { createBundlePaths } = require('./bundle-paths.cjs');

/** 默认工作区；报告不包含每次运行时间，便于复验差异。 */
const ROOT = path.resolve(__dirname, '..');

class MainChapterDependencyAudit {
    /** 只提供离线入口，不创建隐式资源池、玩家状态或运行时索引。 */
    constructor() {
        throw new Error('请使用静态审计入口');
    }

    /** 计算原始字节摘要；源换行变化也会要求重新取得Java证据。 */
    static hash(content) {
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    /** 读取真实JSON，兼容UTF-8 BOM；缺失或损坏直接阻断整个扫描。 */
    static json(file) {
        return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
    }

    /** 规范为报告中的仓库相对路径，不泄露机器绝对路径。 */
    static relative(root, file) {
        return path.relative(root, file).replaceAll('\\', '/');
    }

    /** 枚举真实源文件，用于能力摘要和元数据依赖检查；不访问Creator缓存。 */
    static files(directory) {
        return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
            const file = path.join(directory, entry.name);
            assert(!entry.isSymbolicLink(), '审计源目录不接受链接：' + file);
            return entry.isDirectory() ? this.files(file) : [file];
        }).sort();
    }

    /** 编译并运行唯一只读能力测试；失败时不继续生成看似完整的扫描报告。 */
    static runJava(root) {
        const bundledJdk = path.join(root, 'backend/.tools/jdk-21.0.13.0.2+1');
        const env = { ...process.env };
        env.JAVA_HOME = env.MXZG_JAVA_HOME || (fs.existsSync(bundledJdk) ? bundledJdk : env.JAVA_HOME);
        const command = this.mavenCommand(root);
        assert(!/["\r\n%]/.test(command), 'Maven路径含不支持的命令解释字符');
        const args = ['-q', '-Dtest=MainChapterDependencyAuditTest', 'test'];
        const result = process.platform === 'win32'
            ? childProcess.spawnSync('"' + command + '" ' + args.join(' '), {
                cwd: path.join(root, 'backend'), env, encoding: 'utf8',
                shell: true, maxBuffer: 16 * 1024 * 1024,
            })
            : childProcess.spawnSync(command, args, {
                cwd: path.join(root, 'backend'), env, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
            });
        if (result.error || result.status !== 0) {
            throw new Error('真实Java能力预检失败：\n' + (result.error || '') + result.stdout + result.stderr);
        }
    }

    /** 优先使用仓库声明版本已缓存的Maven，避免Windows脚本包装器受宿主PowerShell差异影响。 */
    static mavenCommand(root) {
        if (process.env.MXZG_MAVEN) return process.env.MXZG_MAVEN;
        if (process.platform === 'win32') {
            const properties = fs.readFileSync(path.join(root, 'backend/.mvn/wrapper/maven-wrapper.properties'), 'utf8');
            const match = /distributionUrl=.*\/(apache-maven-[\d.]+)-bin\.zip/.exec(properties);
            const home = process.env.USERPROFILE;
            if (match && home) {
                const directory = path.join(home, '.m2/wrapper/dists', match[1]);
                if (fs.existsSync(directory)) {
                    const commands = this.files(directory).filter(file => file.endsWith(path.join('bin', 'mvn.cmd')));
                    if (commands.length === 1) return commands[0];
                }
            }
            return 'mvnw.cmd';
        }
        return './mvnw';
    }

    /** 接受真实日期及可选短小写批次标签；标签不参与日期判断，也不能成为任意路径。 */
    static outputPath(root, snapshot) {
        if (snapshot == null) return path.join(root, 'client/temp/main-chapter-dependencies-current');
        const match = /^(\d{8})(?:-([a-z0-9]+(?:-[a-z0-9]+)*))?$/.exec(snapshot);
        assert(match && (!match[2] || match[2].length <= 32), 'snapshot必须为YYYYMMDD，可追加不超过32字符的小写字母数字连字符标签');
        const day = match[1];
        const date = new Date(day.slice(0, 4) + '-' + day.slice(4, 6) + '-' + day.slice(6, 8) + 'T00:00:00Z');
        assert(!Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10).replaceAll('-', '') === day,
            'snapshot不是有效日期');
        return path.join(root, 'docs/validation/main-chapter-dependencies-' + snapshot);
    }

    /** 按实际后端配置来源核对Java能力证据，拒绝缺失、过期或不完整的850关目录。 */
    static validateEvidence(root, evidence, bundles) {
        assert.equal(evidence.schemaVersion, 1, 'Java能力证据版本不匹配');
        const actualSources = this.files(path.join(root, 'backend/src/main/java'))
            .filter(file => file.endsWith('.java'));
        assert.deepEqual(Object.keys(evidence.sourceHashes).sort(), actualSources.map(file => this.relative(root, file)).sort(),
            'Java能力源集合变化，请重新运行审计入口');
        for (const file of actualSources) {
            assert.equal(evidence.sourceHashes[this.relative(root, file)], this.hash(fs.readFileSync(file)),
                'Java能力证据过期：' + this.relative(root, file));
        }
        assert.equal(evidence.auditSourceHash,
            this.hash(fs.readFileSync(path.join(root, 'backend/src/test/java/com/funsgamex/mxzg/MainChapterDependencyAuditTest.java'))),
            'Java审计器本身变化，请重新取得能力证据');
        assert.equal(evidence.pomHash, this.hash(fs.readFileSync(path.join(root, 'backend/pom.xml'))),
            'Maven资源构建配置变化，请重新取得能力证据');
        const gameplay = path.join(root, 'backend/src/main/resources/gameplay');
        const backendSources = new Map();
        for (const file of this.files(gameplay).filter(file => file.endsWith('.json'))) {
            const name = this.relative(gameplay, file).replace(/\.json$/, '');
            assert(evidence.classpathHashes[name], 'Java证据漏掉服务端规则投影：' + name);
            backendSources.set(name, file);
        }
        for (const [name, digest] of Object.entries(evidence.classpathHashes)) {
            // 召唤等功能可以保留同名的客户端展示表，Java证据以服务端实际打包的规则表为准。
            const file = backendSources.get(name) || bundles.resolveBundleFile('config/' + name + '.json');
            assert.equal(this.hash(fs.readFileSync(file)), digest, 'Maven配置资源过期：' + name);
        }
        assert.equal(evidence.stages.length, 850, '真实850关目录不可被小夹具替代');
    }

    /** 在Node中装配实际无状态TS工具，不复制BattleAttackUtils的白名单或帧数。 */
    static loadTools(root) {
        const esbuild = require(path.join(root, 'client/node_modules/esbuild'));
        const load = relative => {
            const result = esbuild.buildSync({ entryPoints: [path.join(root, relative)],
                bundle: true, platform: 'node', format: 'cjs', write: false });
            const module = { exports: {} };
            new Function('module', 'exports', 'require', result.outputFiles[0].text)(module, module.exports, require);
            return module.exports;
        };
        return {
            attack: load('client/assets/scripts/features/battle/utils/BattleAttackUtils.ts').BattleAttackUtils,
            spine: load('client/assets/scripts/framework/assets/SpineJsonUtils.ts').SpineJsonUtils,
        };
    }

    /** 严格读取表内JSON数组，保留未知内容原值；非法数据不默默当成空集合。 */
    static array(value, owner) {
        const result = typeof value === 'string' ? JSON.parse(value) : value;
        assert(Array.isArray(result), owner + '必须为数组');
        return result;
    }

    /** 递归动作与Buff声明闭包；返回路径完整的缺行/环，拒绝无限递归或遗漏后续分支。 */
    static collectSkill(skill, tables) {
        const arts = new Map();
        const buffs = new Map();
        const gaps = [];
        const visiting = new Set();
        const activeBuffs = new Set();
        const visitBuff = (id, chain) => {
            if (activeBuffs.has(id)) {
                gaps.push({ code: 'BUFF_CYCLE', key: String(id), reason: chain.concat('buff:' + id).join(' -> ') });
                return;
            }
            const buff = tables.buffs.get(id);
            if (!buff) {
                gaps.push({ code: 'BUFF_MISSING', key: String(id), reason: chain.join(' -> ') });
                return;
            }
            if (buffs.has(id)) return;
            activeBuffs.add(id);
            buffs.set(id, buff);
            for (const child of this.array(buff.art_list, 'buff:' + id)) visitArt(child, chain);
            for (const child of tables.buffReferences?.get(String(id)) || []) visitBuff(child, chain.concat('buff:' + id));
            if (buff.type === 162) {
                const key = Number(String(buff.value).split('|')[0]) + ':' + skill.level;
                const replacement = tables.skills?.get(key);
                if (!replacement || replacement.active_type !== 2) {
                    gaps.push({ code: 'SKILL_MISSING', key, reason: '原入场普攻替换引用无效：' + id });
                } else {
                    for (const child of this.array(replacement.art_list, 'skill:' + key)) visitArt(child, chain.concat('skill:' + key));
                }
            }
            if (buff.type === 154) {
                const fallback = Number(String(buff.value).split('|')[1]);
                if (fallback > 0) visitArt(fallback, chain.concat('buff:' + id));
            }
            activeBuffs.delete(id);
        };
        const visitArt = (id, chain) => {
            if (visiting.has(id)) {
                gaps.push({ code: 'ART_CYCLE', key: String(id), reason: chain.concat(id).join(' -> ') });
                return;
            }
            if (arts.has(id)) return;
            const art = tables.arts.get(id);
            if (!art) {
                gaps.push({ code: 'ART_MISSING', key: String(id), reason: chain.concat(id).join(' -> ') });
                return;
            }
            arts.set(id, art);
            visiting.add(id);
            for (const buffId of this.array(art.buff_list, 'buffart:' + id)) {
                visitBuff(buffId, chain.concat(id));
            }
            visiting.delete(id);
        };
        for (const id of this.array(skill.art_list, 'skill:' + skill.type + ':' + skill.level)) visitArt(id, []);
        return { arts: [...arts.values()], buffs: [...buffs.values()], gaps };
    }

    /** 合并已证实阻塞及未核实边界；“supported”仅代表本工具实际覆盖的静态依赖闭合。 */
    static status(blockers, unverified) {
        return blockers.length ? 'blocked' : unverified.length ? 'unverified' : 'supported';
    }

    /** 读取真实表、Java能力和Bundle素材并建立自包含审计报告；不写运行时清单或配置。 */
    static build(root, evidence, options = {}) {
        const bundles = options.bundles || createBundlePaths(root);
        this.validateEvidence(root, evidence, bundles);
        const tools = options.tools || this.loadTools(root);
        const sources = {};
        for (const relative of ['tools/audit_main_chapter_dependencies.cjs', 'tools/bundle-paths.cjs',
            'client/assets/scripts/features/battle/utils/BattleAttackUtils.ts',
            'client/assets/scripts/framework/assets/SpineJsonUtils.ts']) {
            sources[relative] = this.hash(fs.readFileSync(path.join(root, relative)));
        }
        sources['backend/pom.xml'] = evidence.pomHash;
        sources['backend/src/test/java/com/funsgamex/mxzg/MainChapterDependencyAuditTest.java'] = evidence.auditSourceHash;
        const table = name => {
            const file = bundles.resolveBundleFile('config/' + name + '.json');
            sources[this.relative(root, file)] = this.hash(fs.readFileSync(file));
            const rows = this.json(file).rows;
            assert(Array.isArray(rows) && rows.length, '缺少真实源表：' + name);
            return rows;
        };
        const rewards = table('chapterreward');
        const enemyRows = table('chapter');
        const skills = new Map(table('heroskill').map(row => [row.type + ':' + row.level, row]));
        const tables = {
            arts: new Map(table('buffart').map(row => [row.idx, row])),
            buffs: new Map(table('buff').map(row => [row.idx, row])),
            buffReferences: new Map(Object.entries(evidence.semanticBuffReferences || {})),
            skills,
        };
        const items = new Map(table('item').map(row => [row.idx, row]));
        const heroes = new Map(table('herotype').map(row => [row.type, row]));
        const triggers = table('droptrigger');
        const drops = table('dropgroup');
        const idleFile = path.join(root, 'backend/src/main/resources/gameplay/idle-rules.json');
        const idle = this.json(idleFile);
        sources[this.relative(root, idleFile)] = this.hash(fs.readFileSync(idleFile));
        const resources = {};
        const skillCatalog = {};
        const rewardCatalog = {};

        /** 未被实际表现解析器接纳的资源声明只保留原文，不能猜目录/帧数并把存在性报为通过。 */
        const unresolvedResource = (buff, field, value, reason) => {
            const key = 'unresolved:buff:' + buff.idx + ':' + field;
            resources[key] = { address: null, kind: 'unresolved-declaration', exists: null,
                owner: 'buff:' + buff.idx, field, declaration: value, sources: [], problems: [reason] };
            return key;
        };

        /** 解析实际逻辑资源地址；源和meta都须存在，未知资源保持具体失败，不猜替代素材。 */
        const resource = (address, kind) => {
            const key = kind + ':' + address;
            if (resources[key]) return key;
            const base = address.replace(/\/spriteFrame$/, '');
            const candidates = /\.[a-z0-9]+$/i.test(base) ? [base]
                : kind === 'audio' ? ['.mp3', '.ogg', '.wav'].map(extension => base + extension)
                    : kind === 'spine' ? [base + '.json']
                        : ['.png', '.jpg', '.jpeg', '.webp'].map(extension => base + extension);
            const files = candidates.map(candidate => bundles.resolveBundleFile(candidate, { optional: true })).filter(Boolean);
            const result = { address, kind, exists: files.length === 1, sources: [], problems: [] };
            if (files.length !== 1) result.problems.push(files.length ? '逻辑资源有多个候选源' : '真实资源源文件缺失');
            for (const file of files) {
                const meta = file + '.meta';
                result.sources.push({ path: this.relative(root, file), sha256: this.hash(fs.readFileSync(file)),
                    uuid: fs.existsSync(meta) ? this.json(meta).uuid : null });
                if (!fs.existsSync(meta)) result.problems.push('资源meta缺失：' + this.relative(root, meta));
                if (kind === 'spine') {
                    const raw = this.json(file);
                    const converted = tools.spine.upgradeSpine37Json(raw);
                    result.animations = Object.keys(raw.animations || {});
                    result.runtimeVersion = converted?.skeleton?.spine || null;
                    const atlas = file.replace(/\.json$/, '.atlas');
                    if (!fs.existsSync(atlas)) result.problems.push('Spine atlas缺失');
                    else {
                        result.sources.push({ path: this.relative(root, atlas), sha256: this.hash(fs.readFileSync(atlas)) });
                        const lines = fs.readFileSync(atlas, 'utf8').replace(/\r/g, '').split('\n');
                        const pages = lines.filter((line, index) => /\.(png|jpe?g)$/i.test(line)
                            && (index === 0 || !lines[index - 1].trim()));
                        if (!pages.length) result.problems.push('Spine atlas纹理页无法确定');
                        for (const page of pages) {
                            const texture = path.resolve(path.dirname(atlas), page);
                            assert.equal(path.dirname(texture), path.dirname(atlas), 'atlas纹理页越出骨骼目录');
                            if (!fs.existsSync(texture)) result.problems.push('Spine纹理缺失：' + page);
                            else result.sources.push({ path: this.relative(root, texture), sha256: this.hash(fs.readFileSync(texture)) });
                        }
                    }
                }
            }
            result.exists = result.exists && result.problems.length === 0;
            resources[key] = result;
            return key;
        };

        /** 为技能建立完整声明闭包和实际表现预检；Java拒绝不阻止继续列出所有依赖。 */
        const skillDetails = key => {
            if (skillCatalog[key]) return skillCatalog[key];
            const row = skills.get(key);
            assert(row, 'Java选择的技能在客户端源表缺失：' + key);
            const closure = this.collectSkill(row, tables);
            const entry = { config: row, arts: closure.arts, buffs: closure.buffs,
                presentation: [], resources: [], blockers: closure.gaps };
            const refs = new Set();
            for (const buff of closure.buffs) {
                try {
                    if (buff.type > 0 && buff.type < 100) {
                        for (const action of tools.attack.legacyActions(buff)) {
                            const plan = tools.attack.plan(action);
                            entry.presentation.push({ buffId: buff.idx, action, plan });
                            for (const frame of plan.effect?.paths || []) refs.add(resource(frame, 'image'));
                            for (const name of plan.sounds) refs.add(resource('audio/' + name, 'audio'));
                        }
                    } else {
                        if (this.array(buff.file, 'buff.file:' + buff.idx).length && buff.type !== 1005) {
                            refs.add(unresolvedResource(buff, 'file', buff.file,
                                '逻辑Buff存在file声明，当前表现入口未按动作帧解析，不猜持续效果目录或帧数'));
                        }
                        if (buff.type === 100) {
                            for (const name of tools.attack.damageSounds(buff)) refs.add(resource('audio/' + name, 'audio'));
                        }
                        if (buff.buff_icon) refs.add(resource('hero/ui/skill-icon_' + buff.buff_icon + '/spriteFrame', 'image'));
                        if (buff.type === 1005) {
                            for (const frame of tools.attack.dizzyFrames()) refs.add(resource(frame, 'image'));
                        }
                    }
                } catch (error) {
                    entry.blockers.push({ code: 'PRESENTATION_UNSUPPORTED', key: String(buff.idx), reason: error.message });
                    // file可能仅作旧预载或受动作覆盖，不借通用拼接规则假定其实际播放帧目录。
                    if (this.array(buff.file, 'buff.file:' + buff.idx).length) {
                        refs.add(unresolvedResource(buff, 'file', buff.file, '表现解析器拒绝，无法确认实际帧目录、覆盖与帧数'));
                    }
                    for (const name of this.array(buff.sound, 'buff.sound:' + buff.idx)) {
                        if (typeof name === 'string' && /^[A-Za-z0-9_-]+$/.test(name)) refs.add(resource('audio/' + name, 'audio'));
                        else refs.add(unresolvedResource(buff, 'sound', buff.sound, '音效声明无法按现有资源规则解析'));
                    }
                }
            }
            entry.resources = [...refs].sort();
            skillCatalog[key] = entry;
            return entry;
        };

        /** 物品发放能力来自真实RewardGrantService；图标沿ResManager已实现规则，不按ID段猜类型。 */
        const rewardDetails = id => {
            if (rewardCatalog[id]) return rewardCatalog[id];
            const row = items.get(id);
            const capability = evidence.rewardCapabilities[id];
            assert(row && capability, '奖励配置或Java能力证据缺失：' + id);
            const match = typeof row.icon === 'string' ? /^(backpack|hero-icon)\/([A-Za-z0-9_-]+)$/.exec(row.icon) : null;
            const refs = match ? [resource((match[1] === 'backpack' ? 'icons/item/backpack_' : 'hero/ui/hero-icon_')
                + match[2] + '/spriteFrame', 'image')] : [];
            rewardCatalog[id] = { itemId: id, type: row.type, mode: row.mode, icon: row.icon,
                grantRejection: capability.rejection, iconResolutionError: match ? '' : '当前BagItemCatalog图标路径规则无法解析', resources: refs };
            return rewardCatalog[id];
        };

        const stages = evidence.stages.map(capability => {
            const row = rewards.find(value => value.idx === capability.index);
            assert(row, 'Java目录在源表缺失：' + capability.index);
            assert.deepEqual([capability.mode, capability.chapter, capability.mission],
                [row.mode_id, row.chapter_id, row.mission_id], 'Java目录定位漂移');
            const expectedEnemies = enemyRows.filter(value => value.mode_id === row.mode_id
                && value.chapter_id === row.chapter_id && value.mission_id === row.mission_id && value.hero_type !== 0);
            assert.equal(capability.enemies.length, expectedEnemies.length, 'Java目录漏扫真实敌人：' + row.idx);
            const blockers = [];
            const unverified = [];
            const refs = new Set();
            // note不是旧服运行定位字段。只展示注释组与真实三维选择的差异，不据此替换敌人或修正数值。
            const noteTargets = enemyRows.filter(value => value.note === row.idx && value.hero_type !== 0);
            const selectedIds = expectedEnemies.map(value => value.idx);
            const noteIds = noteTargets.map(value => value.idx);
            if (noteTargets.length && JSON.stringify(selectedIds) !== JSON.stringify(noteIds)) {
                unverified.push({ code: 'REWARD_ENEMY_COORDINATE_MISMATCH', key: String(row.idx),
                    reason: '奖励表三维定位与敌表同note组不一致；保留旧实际三维选择，note不参与运行定位',
                    actualConfigIds: selectedIds, unusedNoteTargetConfigIds: noteIds });
            }
            if (capability.enemyAssemblyError) blockers.push({ code: 'ENEMY_RUNTIME_UNSUPPORTED', reason: capability.enemyAssemblyError });
            const enemies = capability.enemies.map(enemy => {
                const raw = expectedEnemies.find(value => value.idx === enemy.input.configId);
                assert(raw && raw.hero_type === enemy.input.template && raw.hero_level === enemy.input.level
                    && raw.hero_star === enemy.input.star && raw.pos === enemy.input.position, '敌人输入与源配置不一致');
                if (enemy.selectionError) blockers.push({ code: 'SKILL_SELECTION_FAILED',
                    key: String(raw.idx), reason: enemy.selectionError });
                refs.add(resource('spine/' + raw.hero_type, 'spine'));
                if (enemy.portraitIconId) refs.add(resource('hero/ui/hero-icon_' + enemy.portraitIconId + '/spriteFrame', 'image'));
                const hero = heroes.get(raw.hero_type);
                if (hero?.elem) refs.add(resource('hero/ui/hero-icon_elem-' + hero.elem + '/spriteFrame', 'image'));
                const selected = enemy.skills.map(skill => {
                    const detail = skillDetails(skill.key);
                    if (detail.schedule) assert.deepEqual(detail.schedule, skill.schedule, '同精确技能键的排期不一致');
                    if (detail.runtimeRejection !== undefined) assert.equal(detail.runtimeRejection, skill.rejection, '同技能能力结果不一致');
                    detail.schedule = skill.schedule;
                    detail.runtimeRejection = skill.rejection;
                    detail.resources.forEach(key => refs.add(key));
                    if (skill.rejection) blockers.push({ code: 'SKILL_RUNTIME_UNSUPPORTED', key: skill.key, reason: skill.rejection });
                    blockers.push(...detail.blockers.map(gap => ({ ...gap, skill: skill.key })));
                    return skill.key;
                });
                return { configId: raw.idx, position: raw.pos, templateId: raw.hero_type,
                    level: raw.hero_level, star: raw.hero_star, growthStage: enemy.growthStage ?? null,
                    modifiers: this.array(raw.attr, 'chapter.attr'), equipment: this.array(raw.equipment, 'chapter.equipment'),
                    runes: this.array(raw.runes, 'chapter.runes'), skills: selected,
                    capabilityKey: raw.hero_type + ':' + raw.hero_level + ':' + raw.hero_star };
            });
            refs.add(resource('chapter/ui/' + row.map + '.jpg', 'image'));
            refs.add(resource('chapter/ui/chapter-world/' + row.map + '.png', 'image'));
            refs.add(resource('chapter/ui/hang/' + row.map + '_F.png', 'image'));
            refs.add(resource('chapter/ui/hang/' + row.map + '_B.jpg', 'image'));
            const first = this.array(row.first_reward, 'chapterreward.first_reward');
            const base = this.array(row.reward_base, 'chapterreward.reward_base');
            const uniqueDisplay = this.array(row.reward_unique, 'chapterreward.reward_unique');
            const group = triggers.filter(trigger => trigger.drop_group === row.drop_group);
            const candidateDrops = group.flatMap(trigger => {
                const values = drops.filter(drop => drop.drop_trigger_id === trigger.drop_trigger_id);
                if (!values.length) blockers.push({ code: 'DROP_TABLE_MISSING', key: String(trigger.drop_trigger_id), reason: '触发器缺掉落权重行' });
                return values;
            });
            if (!group.length) blockers.push({ code: 'DROP_GROUP_MISSING', key: String(row.drop_group), reason: '挂机掉落组缺失' });
            const actualIds = new Set(first.concat(base).map(value => value.item_type)
                .concat(candidateDrops.map(value => value.item_type)));
            for (const id of actualIds) {
                const reward = rewardDetails(id);
                reward.resources.forEach(key => refs.add(key));
                if (reward.grantRejection) blockers.push({ code: 'REWARD_DOMAIN_UNSUPPORTED', key: String(id), reason: reward.grantRejection });
                if (reward.iconResolutionError) blockers.push({ code: 'REWARD_ICON_UNRESOLVED', key: String(id), reason: reward.iconResolutionError });
            }
            // reward_unique是现有产物说明数据；实际随机候选由droptrigger/dropgroup展开，不混作发奖清单。
            for (const entry of uniqueDisplay) rewardDetails(entry.type).resources.forEach(key => refs.add(key));
            const projected = idle.stages.find(stage => stage.id === row.idx);
            if (!projected) blockers.push({ code: 'IDLE_STAGE_NOT_PROJECTED', key: String(row.idx), reason: '当前普通挂机生产投影无此关卡' });
            for (const key of refs) {
                if (resources[key].exists === false) blockers.push({ code: 'RESOURCE_MISSING', key, reason: resources[key].problems.join('；') });
                else if (resources[key].exists === null) unverified.push({ code: 'RESOURCE_DECLARATION_UNRESOLVED', key,
                    reason: resources[key].problems.join('；') });
            }
            return { index: row.idx, mode: row.mode_id, chapter: row.chapter_id, mission: row.mission_id,
                requiredLevel: row.level, requiredPower: row.combat_effectiveness, map: row.map,
                mappingEvidence: { selectedBy: 'mode_id/chapter_id/mission_id（旧实际运行规则）',
                    actualEnemyConfigIds: selectedIds,
                    coordinateSharedByRewardIndices: rewards.filter(value => value.mode_id === row.mode_id
                        && value.chapter_id === row.chapter_id && value.mission_id === row.mission_id).map(value => value.idx),
                    unusedNoteTargets: noteTargets.filter(value => !selectedIds.includes(value.idx)).map(value => ({
                        configId: value.idx, mode: value.mode_id, chapter: value.chapter_id, mission: value.mission_id,
                        note: value.note, templateId: value.hero_type, level: value.hero_level, star: value.hero_star,
                        position: value.pos, usedForRuntime: false })) },
                enemies, rewards: { first, idleBase: base, displayOnlyUnique: uniqueDisplay,
                    dropGroup: row.drop_group, triggers: group, drops: candidateDrops,
                    idleProjectionPresent: !!projected }, resources: [...refs].sort(),
                status: this.status(blockers, unverified), blockers, unverified };
        });
        assert.equal(stages.length, rewards.length, '目录必须覆盖全部奖励关卡');
        const counts = Object.fromEntries(['supported', 'blocked', 'unverified']
            .map(status => [status, stages.filter(stage => stage.status === status).length]));
        const reasons = {};
        for (const stage of stages) {
            for (const code of new Set(stage.blockers.map(blocker => blocker.code))) reasons[code] = (reasons[code] || 0) + 1;
        }
        const referencedEnemyRows = new Set(stages.flatMap(stage => stage.enemies.map(enemy => enemy.configId)));
        const orphanRows = enemyRows.filter(row => row.hero_type !== 0 && !referencedEnemyRows.has(row.idx));
        const rawEnemyCatalog = {};
        for (const row of enemyRows.filter(value => value.hero_type !== 0)) {
            const key = row.hero_type + ':' + row.hero_level + ':' + row.hero_star;
            if (rawEnemyCatalog[key]) continue;
            const capability = evidence.rawEnemyCapabilities?.[key];
            assert(capability, 'Java未扫描源敌人技能组合：' + key);
            const blockers = [];
            const unverified = [];
            const refs = new Set([resource('spine/' + row.hero_type, 'spine')]);
            if (capability.selectionError) blockers.push({ code: 'SKILL_SELECTION_FAILED', key, reason: capability.selectionError });
            if (capability.portraitIconId) refs.add(resource('hero/ui/hero-icon_' + capability.portraitIconId + '/spriteFrame', 'image'));
            const selected = capability.skills.map(skill => {
                const detail = skillDetails(skill.key);
                if (detail.schedule) assert.deepEqual(detail.schedule, skill.schedule, '源敌组同技能排期不一致');
                if (detail.runtimeRejection !== undefined) assert.equal(detail.runtimeRejection, skill.rejection, '源敌组同技能能力不一致');
                detail.schedule = skill.schedule;
                detail.runtimeRejection = skill.rejection;
                detail.resources.forEach(ref => refs.add(ref));
                if (skill.rejection) blockers.push({ code: 'SKILL_RUNTIME_UNSUPPORTED', key: skill.key, reason: skill.rejection });
                blockers.push(...detail.blockers.map(gap => ({ ...gap, skill: skill.key })));
                return skill.key;
            });
            for (const ref of refs) {
                if (resources[ref].exists === false) blockers.push({ code: 'RESOURCE_MISSING', key: ref,
                    reason: resources[ref].problems.join('；') });
                else if (resources[ref].exists === null) unverified.push({ code: 'RESOURCE_DECLARATION_UNRESOLVED', key: ref,
                    reason: resources[ref].problems.join('；') });
            }
            rawEnemyCatalog[key] = { templateId: row.hero_type, level: row.hero_level, star: row.hero_star,
                growthStage: capability.growthStage ?? null, skills: selected, resources: [...refs].sort(),
                dependencyStatus: this.status(blockers, unverified), blockers, unverified,
                scope: '同源技能选择、逐技能严格预检及资源；不代表孤组已被运行关卡选用或完成数值/整场验收' };
        }
        const report = { schemaVersion: 2, batch: options.snapshot || null,
            scope: '850关真实目录/敌方完整技能声明闭包/生产预检/源资源/首通及普通挂机基础和随机奖励；不开放新关卡或领取，不执行战斗或发奖',
            statusMeaning: { supported: '本工具覆盖的静态依赖已闭合，仍须玩法执行与画面验收',
                blocked: '存在明确拒绝或缺失，不能由扫描结果绕过', unverified: '无已证实阻塞但存在无法确认的依赖' },
            limitations: ['没有玩家阵容、随机执行、数值等价或Creator渲染验收；敌人依赖闭合不代表所有玩家阵容可用',
                '递归覆盖heroskill.art_list→buffart.buff_list→buff.art_list及实际battleContract返回的反向Buff；其他value保留原文并由生产严格预检，不猜未知语义',
                '不包含独立活动/权益动态掉落、快速战斗或里程碑领取；这些不能当成普通挂机候选已验证',
                'Spine内存转换和源文件检查不等于引擎实际导入；背景列配置映射资源，不证明当前Prefab已按关卡切图'],
            sourceHashes: { ...sources, ...evidence.sourceHashes }, classpathHashes: evidence.classpathHashes,
            summary: { stages: stages.length, enemies: stages.reduce((sum, stage) => sum + stage.enemies.length, 0),
                distinctReferencedEnemyRows: referencedEnemyRows.size, unreferencedEnemyRows: orphanRows.length,
                rawEnemySkillCombinations: Object.keys(rawEnemyCatalog).length,
                coordinateMismatchStages: stages.filter(stage => stage.unverified.some(gap =>
                    gap.code === 'REWARD_ENEMY_COORDINATE_MISMATCH')).length,
                uniqueSkills: Object.keys(skillCatalog).length, resources: Object.keys(resources).length,
                missingResources: Object.values(resources).filter(value => value.exists === false).length,
                unresolvedResourceDeclarations: Object.values(resources).filter(value => value.exists === null).length,
                ...counts, blockedStageCountsByReason: reasons },
            unreferencedEnemyRows: orphanRows.map(row => ({ configId: row.idx, mode: row.mode_id,
                chapter: row.chapter_id, mission: row.mission_id, note: row.note, templateId: row.hero_type,
                level: row.hero_level, star: row.hero_star, position: row.pos, usedForRuntime: false,
                capabilityKey: row.hero_type + ':' + row.hero_level + ':' + row.hero_star,
                modifiers: this.array(row.attr, 'chapter.attr'), equipment: this.array(row.equipment, 'chapter.equipment'),
                runes: this.array(row.runes, 'chapter.runes') })),
            semanticBuffReferences: evidence.semanticBuffReferences,
            rawEnemyCatalog, stages, skillCatalog, rewardCatalog, resources };
        return this.compactGraph(report);
    }

    /** 将重复排期、能力、掉落表和资源集合只保存一份；引用仍在同一机器报告内，不产生运行时清单。 */
    static compactGraph(report) {
        const resourceSets = {};
        const enemyCapabilitySets = {};
        const dropCatalog = {};
        const intern = (collection, value) => {
            const key = this.hash(JSON.stringify(value)).slice(0, 16);
            if (collection[key]) assert.deepEqual(collection[key], value, '审计引用摘要冲突');
            else collection[key] = value;
            return key;
        };
        const uniqueIssues = issues => [...new Map(issues.map(issue => [JSON.stringify(issue), issue])).values()];
        for (const stage of report.stages) {
            stage.blockers = uniqueIssues(stage.blockers);
            stage.unverified = uniqueIssues(stage.unverified);
            stage.resourceSet = intern(resourceSets, stage.resources);
            delete stage.resources;
            const group = stage.rewards.dropGroup;
            const drops = { triggers: stage.rewards.triggers, drops: stage.rewards.drops };
            if (dropCatalog[group]) assert.deepEqual(dropCatalog[group], drops, '同掉落组来源不一致');
            else dropCatalog[group] = drops;
            delete stage.rewards.triggers;
            delete stage.rewards.drops;
        }
        for (const [key, entry] of Object.entries(report.rawEnemyCatalog)) {
            const value = { skills: entry.skills, resourceSet: intern(resourceSets, entry.resources),
                dependencyStatus: entry.dependencyStatus, blockers: uniqueIssues(entry.blockers),
                unverified: uniqueIssues(entry.unverified), scope: entry.scope };
            report.rawEnemyCatalog[key] = { templateId: entry.templateId, level: entry.level, star: entry.star,
                growthStage: entry.growthStage, capabilitySet: intern(enemyCapabilitySets, value) };
        }
        report.graphGuide = { stages: '每关敌人skills引用skillCatalog，resources由resourceSet引用resourceSets',
            rawEnemyCatalog: '原敌人模板/等级/星级组合引用enemyCapabilitySets；孤组不会用于替换运行三维定位',
            rewards: '每关保留首通/基础/展示项，dropGroup引用dropCatalog中的原始触发器与权重',
            resources: 'resourceSets引用resources中的源文件和未解析声明；所有引用只在本审计JSON内有效' };
        report.resourceSets = resourceSets;
        report.enemyCapabilitySets = enemyCapabilitySets;
        report.dropCatalog = dropCatalog;
        return report;
    }

    /** 生成人可读的逐关摘要，空阻塞列表不追加行尾分隔；扫描结果不决定玩家入口开关。 */
    static text(report) {
        const lines = ['主线850关离线依赖审计（' + (report.batch || '当前') + '）', report.scope,
            '扫描不等于开放、真实战斗、领取授权或画面验收。', '',
            JSON.stringify(report.summary, null, 2), '', '逐关：index mode/chapter/mission 敌人数 状态 主要阻塞'];
        for (const stage of report.stages) {
            const codes = [...new Set(stage.blockers.concat(stage.unverified).map(gap => gap.code))];
            lines.push(`${stage.index} ${stage.mode}/${stage.chapter}/${stage.mission} ${stage.enemies.length} ${stage.status} ${codes.join(',')}`.trimEnd());
        }
        return lines.join('\n') + '\n';
    }

    /** CLI默认先重新取Java证据；所有写入仅为显式--write的审计报告。 */
    static main(args) {
        assert(args.every(arg => ['--write', '--check', '--from-java'].includes(arg) || arg.startsWith('--snapshot=')), '未知参数');
        const snapshots = args.filter(arg => arg.startsWith('--snapshot='));
        assert(snapshots.length <= 1, 'snapshot不能重复');
        const snapshot = snapshots.length ? snapshots[0].slice('--snapshot='.length) : null;
        const output = this.outputPath(ROOT, snapshot);
        assert(!(args.includes('--write') && args.includes('--check')), '--write与--check不能并用');
        if (!args.includes('--from-java')) this.runJava(ROOT);
        const evidence = this.json(path.join(ROOT, 'backend/target/main-chapter-dependency-capabilities.json'));
        const report = this.build(ROOT, evidence, { snapshot });
        if (args.includes('--write')) {
            fs.mkdirSync(path.dirname(output), { recursive: true });
            fs.writeFileSync(output + '.json', JSON.stringify(report, null, 2) + '\n');
            fs.writeFileSync(output + '.txt', this.text(report));
        } else if (args.includes('--check')) {
            assert.deepEqual(this.json(output + '.json'), report, '审计报告过期，请核对后用--write更新');
            assert.equal(fs.readFileSync(output + '.txt', 'utf8'), this.text(report), '可读汇总过期');
        }
        console.log(JSON.stringify(report.summary));
    }
}

module.exports = { MainChapterDependencyAudit };
if (require.main === module) MainChapterDependencyAudit.main(process.argv.slice(2));
