/** 当前登录、主城、英雄列表与背包的浏览器检查。
 * 旧Campaign战斗/领取流程已退役，不再以不存在的界面作为验收目标。
 * 使用独立测试后端；截图和日志写入忽略的client/temp/project-checks。
 */
const { resolve } = require('node:path');
const { mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const assert = require('node:assert/strict');
process.chdir(resolve(__dirname, '../..'));
if (process.argv.includes('--direct-battle')) throw Error('旧Campaign验收入口已退役；当前主线请使用MainChapter独立环境流程。');
mkdirSync('client/temp/project-checks', { recursive: true });
const { chromium } = require(process.env.MXZG_PLAYWRIGHT_MODULE || 'playwright');
const previewUrl = process.env.MXZG_PREVIEW_URL || 'http://localhost:7456/';
const shotPrefix = process.env.MXZG_SCREENSHOT_PREFIX || 'night';
if (!/^[a-z0-9-]+$/i.test(shotPrefix)) throw Error('Invalid screenshot prefix');
const standalone = new URL(previewUrl).port === '18081';
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
        if (errors.length) throw Error('browser runtime errors');
        console.log('PASS preview: login, server picker, home, hero list and inventory; retired Campaign flow is excluded.');
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
