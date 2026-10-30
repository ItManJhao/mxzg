/** Real Creator preview acceptance. Starts an isolated headless browser, clicks
 * the actual UI, and creates one normal development account in local-2.
 * Requires backend 18080; MXZG_PREVIEW_URL selects Creator or the standalone H5.
 * Screenshots/logs belong under ignored client/temp/project-checks.
 */
const { resolve } = require('node:path');
const { mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const assert = require('node:assert/strict');
process.chdir(resolve(__dirname, '../..'));
mkdirSync('client/temp/project-checks', { recursive: true });
const { chromium } = require(process.env.MXZG_PLAYWRIGHT_MODULE || 'playwright');
const previewUrl = process.env.MXZG_PREVIEW_URL || 'http://localhost:7456/';
const shotPrefix = process.env.MXZG_SCREENSHOT_PREFIX || 'night';
if (!/^[a-z0-9-]+$/i.test(shotPrefix)) throw Error('Invalid screenshot prefix');
const standalone = new URL(previewUrl).port === '18081';
const formationExpected = process.env.MXZG_FORMATION_EXPECT ? JSON.parse(readFileSync(process.env.MXZG_FORMATION_EXPECT, 'utf8')) : null;
(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    let page;
    const errors = [];
    try {
        if (standalone) {
            const response = await fetch(new URL('/__mxzg_preview__', previewUrl));
            if (!response.ok) throw Error('Standalone preview identity is unavailable');
            const identity = await response.json();
            identity.captureMode = process.env.MXZG_CAPTURE_CLEAN === '1' ? 'engine profiler hidden for screenshots' : 'default debug HUD';
            writeFileSync('client/temp/project-checks/' + shotPrefix + '-build.json', JSON.stringify(identity,null,2));
            if (formationExpected?.prefabSha256) assert.equal(identity.build.sourceSha256?.['assets/prefabs/ui/hero/HeroSelectLayer.prefab'], formationExpected.prefabSha256, 'wrong formation source in H5 build');
            if (formationExpected?.cellSha256) assert.equal(identity.build.sourceSha256?.['assets/prefabs/ui/hero/HeroIconCell.prefab'], formationExpected.cellSha256, 'wrong Cell source in H5 build');
        }
        page = await browser.newPage({ viewport: standalone ? { width: 393, height: 852 } : { width: 1280, height: 1024 } });
        if (standalone) {
            // Prove this run cannot silently fall back to the editor's preview server.
            await page.route(/https?:\/\/(localhost|127\.0\.0\.1):7456\//, route => route.abort());
            page.on('request', request => {
                if (/https?:\/\/(localhost|127\.0\.0\.1):7456\//.test(request.url())) errors.push('Dependency on Creator preview');
            });
        }
        page.on('pageerror', e => { errors.push(e.message); console.log('PAGEERROR', e.message); });
        page.on('requestfailed', request => console.log('REQUEST FAILED', request.url(), request.failure()?.errorText));
        page.on('console', m => {
            if (m.type() === 'error') {
                console.log('CONSOLE', m.text(), m.location());
                errors.push(m.text());
            }
        });
        async function connectEngine() {
            await page.waitForFunction(() => window.cc?.director || window.System?.import, { timeout: 30000 });
            // The legacy global may expose director without all native UI classes.
            await page.evaluate(async () => { window.cc = await window.System.import('cc'); });
            // Source imports can make editor startup slower; wait for the actual gate.
            await page.waitForFunction(() => {
                let ready = false;
                function walk(node) {
                    if (!node?.activeInHierarchy) return;
                    if ((node._components || []).some(c => ['AccountLoginView', 'RemakeHomeView'].includes(c.constructor?.name))) ready = true;
                    for (const child of node.children) walk(child);
                }
                walk(window.cc?.director?.getScene());
                return ready;
            }, null, { timeout: 30000 });
            if (process.env.MXZG_CAPTURE_CLEAN === '1') await page.evaluate(() => window.cc.profiler.hideStats());
        }
        await page.goto(previewUrl, { waitUntil: 'load' });
        await connectEngine();
        if (errors.length) throw Error('startup logged browser errors');
        async function clickTarget(className, prop, text) {
            await page.waitForFunction(({ className, prop, text }) => {
                const cc = window.cc;
                let found = false;
                let loading = false;
                function scan(n) { if (!n?.activeInHierarchy)
                    return; if (n.name === 'LoadingLayer')
                    loading = true; for (const child of n.children)
                    scan(child); }
                scan(cc?.director?.getScene());
                function walk(n) {
                    if (!n?.activeInHierarchy || found)
                        return;
                    for (const c of n._components || []) {
                        if (c.constructor?.name !== className || (text && c.caption?.string !== text))
                            continue;
                        const target = prop ? c[prop] : c.node;
                        if (target && target.interactable !== false)
                            found = true;
                    }
                    for (const child of n.children)
                        walk(child);
                }
                walk(cc?.director?.getScene());
                return found && !loading;
            }, { className, prop, text }, { timeout: 30000 });
            const t = await page.evaluate(({ className, prop, text }) => {
                const cc = window.cc;
                let found;
                function walk(n) {
                    if (!n?.activeInHierarchy || found)
                        return;
                    for (const c of n._components || []) {
                        if (c.constructor?.name !== className)
                            continue;
                        if (text && c.caption?.string !== text)
                            continue;
                        const target = prop ? (c[prop]?.node || c[prop]) : c.node;
                        const ui = target?.getComponent('cc.UITransform');
                        if (!ui)
                            continue;
                        const b = ui.getBoundingBoxToWorld();
                        found = { b: { x: b.x, y: b.y, width: b.width, height: b.height }, size: cc.view.getVisibleSize() };
                    }
                    for (const child of n.children)
                        walk(child);
                }
                walk(cc.director.getScene());
                return found;
            }, { className, prop, text });
            if (!t)
                throw Error('target absent: ' + className + '.' + prop + ' ' + text);
            const box = await page.locator('canvas').boundingBox();
            await page.mouse.click(box.x + (t.b.x + t.b.width / 2) * box.width / t.size.width, box.y + box.height - (t.b.y + t.b.height / 2) * box.height / t.size.height);
            await page.waitForTimeout(600);
        }
        async function snap(name) {
            const capture = process.env.MXZG_CAPTURE_CANVAS === '1' ? page.locator('canvas') : page;
            await capture.screenshot({ path: 'client/temp/project-checks/' + shotPrefix + '-' + name + '.png' });
            console.log('SHOT', name);
            if (standalone && name === 'login') {
                console.log('H5 login asset transfer', await page.evaluate(() => {
                    const entries = performance.getEntriesByType('resource').filter(entry => entry.name.startsWith(location.origin + '/'));
                    return { requests: entries.length, bytes: entries.reduce((sum, entry) => sum + entry.transferSize, 0) };
                }));
            }
        }
        async function state() {
            return page.evaluate(() => {
                const out = [];
                function walk(n) {
                    if (!n?.activeInHierarchy)
                        return;
                    for (const c of n._components || []) {
                        if (c.constructor?.name.endsWith('View') || c.constructor?.name === 'BagView')
                            out.push({ view: c.constructor.name, node: n.name, text: c.statusLabel?.string, phase: c.last?.phase, stage: c.last?.state?.stageId });
                    }
                    for (const child of n.children)
                        walk(child);
                }
                walk(window.cc.director.getScene());
                return out;
            });
        }
        async function waitForView(className) {
            await page.waitForFunction(className => {
                let found = false;
                function walk(node) {
                    if (!node?.activeInHierarchy || found) return;
                    if ((node._components || []).some(c => c.constructor?.name === className)) found = true;
                    node.children.forEach(walk);
                }
                walk(window.cc.director.getScene());
                return found;
            }, className, { timeout: 30000 });
        }
        async function waitForCampaign(stage, phase) {
            await page.waitForFunction(({ stage, phase }) => {
                let ready = false;
                function walk(node) {
                    if (!node?.activeInHierarchy)
                        return;
                    for (const component of node._components || []) {
                        if (component.constructor?.name === 'CampaignView' &&
                            (stage === null || component.last?.state?.stageId === stage) &&
                            component.last?.phase === phase)
                            ready = true;
                    }
                    for (const child of node.children)
                        walk(child);
                }
                walk(window.cc?.director?.getScene());
                return ready;
            }, { stage, phase }, { timeout: 30000 });
        }
        await snap('login');
        await clickTarget('AccountLoginView', 'serverButton');
        await snap('servers');
        await clickTarget('ServerCellView', null, '开发二服');
        await clickTarget('AccountLoginView', 'developerButton');
        await clickTarget('AccountLoginView', 'accountInput');
        const input = page.locator('input[type="text"]:visible');
        await input.fill('night_ui_' + Date.now());
        await input.press('Tab');
        await clickTarget('AccountLoginView', 'developerButton');
        await clickTarget('AccountLoginView', 'loginButton');
        await waitForView('RemakeHomeView');
        if (!(await state()).some(v => v.view === 'RemakeHomeView'))
            throw Error('home absent');
        await snap('home');
        if (process.argv.includes('--bag-mvc')) {
            await require('./bag-mvc-preview.cjs')(page,{clickTarget,snap,state,prefix:shotPrefix});
            if (errors.length) throw Error('browser runtime errors');
            console.log('PASS bag-mvc preview; runtime errors: 0');
            return;
        }
        if (!process.argv.includes('--direct-battle')) {
        await clickTarget('CityChromeShell', 'tabHero');
        await waitForView('HeroListView');
        if (!(await state()).some(v => v.view === 'HeroListView'))
            throw Error('hero absent');
        await snap('hero');
        await clickTarget('CityChromeShell', 'tabBag');
        await waitForView('BagView');
        if (!(await state()).some(v => v.view === 'BagView'))
            throw Error('bag absent');
        await snap('bag');
        if (process.argv.includes('--backpack-list')) {
            await require('./super-scroll-preview.cjs')(page, {clickTarget,snap,state,prefix:shotPrefix});
            if (errors.length) throw Error('browser runtime errors');
            console.log('PASS backpack-list preview; runtime errors: 0');
            return;
        }
        }
        await clickTarget('CityChromeShell', 'tabBattle');
        await page.waitForTimeout(3500);
        await waitForCampaign(1, 'idle');
        await page.waitForFunction(() => {
            let moving = false;
            function walk(n) { if (!n?.activeInHierarchy)
                return; if (n.name === 'IdleSky' && n.getChildByName('LoopA')?.position.x < 0)
                moving = true; for (const c of n.children)
                walk(c); }
            walk(window.cc?.director?.getScene());
            return moving;
        }, null, { timeout: 30000 });
        await snap('idle-march');
        await snap('battle');
        await clickTarget('CampaignView', 'fightButton');
        async function waitForFormation() {
            await page.waitForFunction(() => {
                let ready = false;
                function walk(n) { if (!n?.activeInHierarchy) return; for (const c of n._components || []) if (c.constructor?.name === 'FormationView' && c.state && !c.state.busy && c.grid?.children.length) ready = true; for (const child of n.children) walk(child); }
                walk(window.cc?.director?.getScene()); return ready;
            }, null, {timeout:30000});
        }
        async function formationSnapshot() {
            return page.evaluate(() => {
                let component;
                function walk(n) { if (!n?.activeInHierarchy) return; for (const c of n._components || []) if (c.constructor?.name === 'FormationView') component = c; for (const child of n.children) walk(child); }
                walk(window.cc.director.getScene());
                if (!component) throw Error('FormationView absent');
                const node = value => { const n = value?.node || value; const ui = n?.getComponent('cc.UITransform'); return n ? { name: n.name, parent: n.parent?.name, position: {x:n.position.x,y:n.position.y}, scale:{x:n.scale.x,y:n.scale.y}, size:ui ? {width:ui.width,height:ui.height}:null, anchor:ui ? {x:ui.anchorX,y:ui.anchorY}:null } : null; };
                return { root:node(component.node), title:{...node(component.titleLabel),text:component.titleLabel?.string,fontSize:component.titleLabel?.fontSize}, confirm:node(component.confirmButton),
                    content:node(component.scrollContent), port:node(component.scrollPort), grid:node(component.grid), cells:component.grid?.children.map(node),
                    visibleStarCount:component.grid?.children[0]?._components.find(c=>c.constructor?.name==='HeroIconCellView')?.stars.filter(star=>star.activeInHierarchy).length,
                    columns:component.columns,cellStep:component.cellStep,firstCellPosition:component.firstCellPosition,cellScale:component.cellScale,lineup:component.state?.lineup };
            });
        }
        function assertAuthored(layout) {
            if (!formationExpected) return;
            if (formationExpected.requireVisibleStars) assert.equal(layout.visibleStarCount,1,'new account one-star heroes must show their star');
            assert.equal(layout.title.fontSize, formationExpected.titleFontSize);
            assert.equal(layout.confirm.position.x, formationExpected.confirmX);
            assert.equal(layout.confirm.position.y, formationExpected.confirmY);
            assert.equal(layout.columns, formationExpected.columns);
            assert.equal(layout.cellStep.x, formationExpected.stepX);
            assert.equal(layout.cellStep.y, formationExpected.stepY);
            assert.equal(layout.cells[1].position.x - layout.cells[0].position.x, formationExpected.stepX);
            if (layout.columns === 2) assert.equal(layout.cells[0].position.y - layout.cells[2].position.y, formationExpected.stepY);
        }
        await waitForFormation();
        const firstFormation = await formationSnapshot();
        assertAuthored(firstFormation);
        await clickTarget('HeroIconCellView');
        assert.notDeepEqual((await formationSnapshot()).lineup.slots, firstFormation.lineup.slots, 'draft must change before Cancel');
        await clickTarget('FormationView', 'closeButton');
        await waitForCampaign(1, 'idle');
        await clickTarget('CityChromeShell', 'tabHero');
        await page.waitForTimeout(2000);
        if (!(await state()).some(v => v.view === 'HeroListView')) throw Error('hero absent after formation Cancel');
        await clickTarget('CityChromeShell', 'tabBattle');
        await waitForCampaign(1, 'idle');
        await clickTarget('CampaignView', 'fightButton');
        await waitForFormation();
        const reopenedFormation = await formationSnapshot();
        assert.deepEqual(reopenedFormation.lineup, firstFormation.lineup, 'Cancel must discard the draft');
        assertAuthored(reopenedFormation);
        writeFileSync('client/temp/project-checks/' + shotPrefix + '-formation-layout.json', JSON.stringify(reopenedFormation,null,2));
        await clickTarget('HeroIconCellView');
        await snap('formation');
        await clickTarget('FormationView', 'confirmButton');
        await page.waitForTimeout(1800);
        await snap('fight');
        // Click the existing Skip button by the visible label in the battle prefab.
        const skip = await page.evaluate(() => {
            const cc = window.cc;
            let point;
            function walk(n) {
                if (!n?.activeInHierarchy)
                    return;
                if (n.name === 'BtnSkip') {
                    const b = n.getComponent('cc.UITransform').getBoundingBoxToWorld();
                    point = { x: b.x + b.width / 2, y: b.y + b.height / 2, size: cc.view.getVisibleSize() };
                }
                for (const child of n.children)
                    walk(child);
            }
            walk(cc.director.getScene());
            return point;
        });
        if (skip) {
            const box = await page.locator('canvas').boundingBox();
            await page.mouse.click(box.x + skip.x * box.width / skip.size.width, box.y + box.height - skip.y * box.height / skip.size.height);
        }
        await page.waitForTimeout(2000);
        await waitForCampaign(1, 'result');
        await snap('result');
        const resultState = await state();
        if (!resultState.some(v => v.view === 'CampaignView' && v.phase === 'result'))
            throw Error('no result modal');
        const confirm = await page.evaluate(() => {
            const cc = window.cc;
            let found;
            function walk(n) {
                if (!n?.activeInHierarchy)
                    return;
                if (n.name === 'btn_confirm') {
                    const b = n.getComponent('cc.UITransform').getBoundingBoxToWorld();
                    found = { x: b.x + b.width / 2, y: b.y + b.height / 2, size: cc.view.getVisibleSize() };
                }
                for (const child of n.children)
                    walk(child);
            }
            walk(cc.director.getScene());
            return found;
        });
        if (!confirm)
            throw Error('claim button absent');
        const box = await page.locator('canvas').boundingBox();
        await page.mouse.click(box.x + confirm.x * box.width / confirm.size.width, box.y + box.height - confirm.y * box.height / confirm.size.height);
        await page.waitForTimeout(2000);
        await waitForCampaign(2, 'idle');
        await snap('claimed');
        if (!(await state()).some(v => v.view === 'CampaignView' && v.phase === 'idle' && v.stage === 2))
            throw Error('claim did not advance');
        await clickTarget('CityChromeShell', 'tabBag');
        await page.waitForTimeout(1000);
        await clickTarget('BagItemView');
        await page.waitForTimeout(600);
        await snap('item-detail');
        await page.reload();
        await connectEngine();
        if (!(await state()).some(v => v.view === 'AccountLoginView') || (await state()).some(v => v.view === 'RemakeHomeView'))
            throw Error('restore did not stop at Login before Start');
        await snap('restored-login');
        await clickTarget('AccountLoginView', 'loginButton');
        await clickTarget('CityChromeShell', 'tabBattle');
        await page.waitForTimeout(2000);
        await waitForCampaign(2, 'idle');
        if (!(await state()).some(v => v.view === 'CampaignView' && v.stage === 2))
            throw Error('stage not retained after reload');
        await snap('restored-battle');
        if (errors.length)
            throw Error('browser runtime errors');
        console.log('PASS preview: server picker, explicit Start, heroes, inventory detail, idle march, formation cancel/save, battle/skip/claim, stage 2 and restore gate; runtime errors:', errors.length);
    }
    catch (e) {
        if (page)
            console.log('FAILED STATE', await page.evaluate(() => { const out = []; function walk(n) { if (!n?.activeInHierarchy)
                return; for (const c of n._components || [])
                if (c.constructor?.name.endsWith('View'))
                    out.push({ view: c.constructor.name, phase: c.last?.phase, stage: c.last?.state?.stageId }); for (const child of n.children)
                walk(child); } walk(window.cc?.director?.getScene()); return out; }));
        if (page)
            await page.screenshot({ path: 'client/temp/project-checks/' + shotPrefix + '-failure.png' });
        throw e;
    }
    finally {
        await browser.close();
    }
})().then(() => process.exit(0), e => { console.error(e); process.exit(1); });
