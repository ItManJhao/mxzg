/**
 * 技能演示应用边界专项：直接调用DevelopmentPreview装配的真实目录/播放闭包。
 * 真实配置和PB验证下载后精确匹配，外部窗口、网络及渲染只替换为可控边界；不连接玩家库。
 * 检查换身份、并发重播、目录关闭和正文读取超时，不能代替Creator实际技能画面验收。
 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { Node } from "cc";
import { DevelopmentPreview } from "../assets/scripts/app/remake/DevelopmentPreview";
import { BattleReplayPreview } from "../assets/scripts/features/battle/ui/BattleReplayPreview";
import { SkillAuditOpenArgs, SkillAuditView } from "../assets/scripts/features/battle/ui/SkillAuditView";
import { SkillAuditEntry, SkillAuditUtils } from "../assets/scripts/features/battle/utils/SkillAuditUtils";
import { GameLog } from "../assets/scripts/core/GameLog";
import { OpenCancelled, UIManager } from "../assets/scripts/framework/ui/UIManager";
import { ConfigFixtureUtils } from "./ConfigFixtureUtils";

/** 只控制外部结果到达顺序，不在测试中复制目录或播放算法。 */
function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}

/** 放行原异步闭包的有限续段，不用真实睡眠掩盖竞态。 */
async function flush(): Promise<void> {
    for (let index = 0; index < 30; index++) {
        await Promise.resolve();
    }
}

/** 本专项中一次真实调用生产BattleReplayPreview.open所传递的外部边界。 */
interface OpenAttempt {
    /** 生产传入的完整参数，观察取消谓词、返回与重播能力。 */
    readonly args: Parameters<typeof BattleReplayPreview.open>;
    /** 可控外部渲染准备结果，既可乱序完成也可明确失败。 */
    readonly job: ReturnType<typeof deferred<() => void>>;
    /** 原清理函数被调用的次数，重复调用仍只触发一次返回。 */
    closes: number;
    /** 模拟原窗口的幂等关闭，结果由生产闭包决定何时调用。 */
    cleanup(): void;
}

/** 单用例只保存测试边界、观测结果及恢复口，业务状态仍归真实DevelopmentPreview。 */
class PreviewFixture {
    /** 已由后端专项产生的真实只读PB，不改阵容或技能记录。 */
    public readonly bytes = new Uint8Array(readFileSync("backend/target/chapter-1-1-1-replay.pb"));
    /** 测试目录只声明文件名；能否出现“有演示”完全由真实inspectReplay决定。 */
    public readonly fixtureName = "chapter-1-1-1-replay.pb";
    /** 应用既有宿主；不运行Creator组件渲染。 */
    public readonly host = new Node("SkillAuditPreviewHost");
    /** 真实应用装配器，被测方法仅通过公开入口调用。 */
    public readonly preview = new DevelopmentPreview(this.host, null, () => true);
    /** UIManager收到的真实窗口参数，测试按目录生命周期调用它们。 */
    public readonly catalogues: SkillAuditOpenArgs[] = [];
    /** 实际请求URL和选项，检查凭证及取消信号，不复制网络策略。 */
    public readonly requests: Array<{ url: string; options: RequestInit }> = [];
    /** 所有渲染准备尝试，按生产调用顺序保存。 */
    public readonly attempts: OpenAttempt[] = [];
    /** 生产触发的玩家提示；迟到失败不得污染新显示期。 */
    public readonly notices: string[] = [];
    /** 单次用例可拦住请求或正文，其余默认返回原目录和PB。 */
    public read: ((url: string, options: RequestInit) => Promise<Response>) | null = null;
    /** 受控原生计时任务，只有生产fetch超时会登记；退出须全部清理。 */
    private readonly timers = new Map<number, { at: number; run: () => void }>();
    /** 受控毫秒时钟，不读取系统墙钟。 */
    private now = 0;
    /** 每次setTimeout分配的测试编号，仅用于对应clearTimeout。 */
    private nextTimer = 0;
    /** 恢复所有被替换边界，防止专项结束后污染其他检查。 */
    private readonly originals = {
        fetch: globalThis.fetch,
        location: Object.getOwnPropertyDescriptor(globalThis, "location"),
        setTimeout: globalThis.setTimeout,
        clearTimeout: globalThis.clearTimeout,
        open: UIManager.instance.open,
        closeById: UIManager.instance.closeById,
        toast: UIManager.instance.toast,
        battle: BattleReplayPreview.open,
        log: GameLog.shared.classified,
    };

    /** 替换本机请求和外部开窗边界，保持真实目录检验、闭包代次与清理实现。 */
    public constructor() {
        Object.defineProperty(globalThis, "location", {
            configurable: true, value: { href: "http://127.0.0.1:7456/" },
        });
        globalThis.setTimeout = ((run: () => void, milliseconds = 0) => {
            const id = ++this.nextTimer;
            this.timers.set(id, { at: this.now + milliseconds, run });
            return id;
        }) as unknown as typeof setTimeout;
        globalThis.clearTimeout = ((id: number) => this.timers.delete(id)) as unknown as typeof clearTimeout;
        globalThis.fetch = (async (input: RequestInfo | URL, options: RequestInit = {}) => {
            const url = String(input);
            assert(url.startsWith("http://127.0.0.1:19091/"));
            this.requests.push({ url, options });
            if (this.read) {
                return this.read(url, options);
            }
            return this.response(url);
        }) as typeof fetch;
        UIManager.instance.open = (async (ctor: unknown, args: SkillAuditOpenArgs) => {
            assert.equal(ctor, SkillAuditView);
            this.catalogues.push(args);
            return {};
        }) as typeof UIManager.instance.open;
        UIManager.instance.closeById = () => {};
        UIManager.instance.toast = text => { this.notices.push(String(text)); };
        BattleReplayPreview.open = (...args) => {
            const job = deferred<() => void>();
            const attempt: OpenAttempt = {
                args, job, closes: 0,
                cleanup: () => {
                    attempt.closes++;
                    if (attempt.closes === 1) args[3]?.();
                },
            };
            this.attempts.push(attempt);
            return job.promise;
        };
        GameLog.shared.classified = () => {};
    }

    /** 仅返回目录声明或原PB，正文由真实应用fetch读取并交真实解析器。 */
    public response(url: string): Response {
        return new Response(url.endsWith("/skill-audit.json")
            ? JSON.stringify({ schemaVersion: 1, replays: [{ fixture: this.fixtureName }] })
            : this.bytes);
    }

    /** 打开真实应用目录，返回UIManager实际收到的参数，不直接访问私有状态。 */
    public async openCatalogue(): Promise<SkillAuditOpenArgs> {
        await this.preview.openSkillAudit();
        return this.catalogues[this.catalogues.length - 1];
    }

    /** 沿真实fetch、配置和PB精确识别一级技能，再选择生产返回的可用条目。 */
    public async load(args: SkillAuditOpenArgs): Promise<SkillAuditEntry> {
        const evidence = await args.load();
        const skill = SkillAuditUtils.skills(10101001, evidence)
            .find(row => row.id === 101010011 && row.level === 1);
        assert.equal(skill?.fixture, this.fixtureName);
        assert.equal(skill?.status, "有演示");
        return skill!;
    }

    /** 放行指定外部open结果，返回后可观察真实应用是否接纳或只清理迟到结果。 */
    public resolve(index: number): void {
        const row = this.attempts[index];
        assert(row, "必须已有真实外部open调用");
        row.job.resolve(row.cleanup);
    }

    /** 推进生产创建的8秒超时，不伪造AbortController行为。 */
    public advance(milliseconds: number): void {
        this.now += milliseconds;
        for (const [id, job] of Array.from(this.timers)) {
            if (job.at <= this.now) {
                this.timers.delete(id);
                job.run();
            }
        }
    }

    /** 返回尚未解除的生产超时任务，成功/失败/中止后都应归零。 */
    public pendingTimers(): number {
        return this.timers.size;
    }

    /** 关闭所有本次目录和演示，再恢复外部能力，避免留下迟到回调或原生计时器。 */
    public dispose(): void {
        for (const catalogue of this.catalogues) catalogue.cancel();
        this.preview.cancelReplay();
        this.host.destroy();
        globalThis.fetch = this.originals.fetch;
        globalThis.setTimeout = this.originals.setTimeout;
        globalThis.clearTimeout = this.originals.clearTimeout;
        if (this.originals.location) {
            Object.defineProperty(globalThis, "location", this.originals.location);
        } else {
            delete (globalThis as { location?: unknown }).location;
        }
        UIManager.instance.open = this.originals.open;
        UIManager.instance.closeById = this.originals.closeById;
        UIManager.instance.toast = this.originals.toast;
        BattleReplayPreview.open = this.originals.battle;
        GameLog.shared.classified = this.originals.log;
    }
}

/** 真实PB下载、精确目录及正常关闭走同一应用闭包；不修改玩家状态。 */
async function checkRealCatalogue(): Promise<void> {
    const f = new PreviewFixture();
    try {
        const args = await f.openCatalogue();
        const skill = await f.load(args);
        assert.equal(f.requests.length, 2);
        for (const request of f.requests) {
            assert.equal(request.options.credentials, "omit");
            assert.equal(request.options.redirect, "error");
            assert.equal(request.options.cache, "no-store");
            assert(request.options.signal instanceof AbortSignal);
        }
        assert.equal(f.pendingTimers(), 0);
        let returned = 0;
        const play = args.play(skill, () => { returned++; });
        assert.deepEqual(f.attempts[0].args[1], f.bytes);
        f.resolve(0);
        await play;
        args.cancel();
        assert.equal(f.attempts[0].closes, 1);
        assert.equal(returned, 0, "关闭目录不再把返回回调写到已关闭窗口");
        assert.deepEqual(f.notices, []);
    } finally { f.dispose(); }
}

/** 旧身份保留的重播能力不能先清理新演示，也不能把取消提示发给新身份。 */
async function checkOldEpochReplay(): Promise<void> {
    const f = new PreviewFixture();
    try {
        const old = await f.openCatalogue();
        const oldSkill = await f.load(old);
        const first = old.play(oldSkill, () => {});
        f.resolve(0);
        await first;
        const oldReplay = f.attempts[0].args[4]!.replay;
        f.preview.cancelReplay();
        const current = await f.openCatalogue();
        const next = current.play(await f.load(current), () => {});
        f.resolve(1);
        await next;
        oldReplay();
        await flush();
        assert.equal(f.attempts.length, 2, "旧身份不能重新准备战场");
        assert.equal(f.attempts[1].closes, 0, "旧身份重播不能先关闭当前演示");
        assert.deepEqual(f.notices, []);
        current.cancel();
        assert.equal(f.attempts[1].closes, 1);
    } finally { f.dispose(); }
}

/** 旧open在换身份后才返回时只释放自己，不能覆盖新cleanup或触发旧返回。 */
async function checkLateOpenAfterEpoch(): Promise<void> {
    const f = new PreviewFixture();
    try {
        const old = await f.openCatalogue();
        let oldReturned = 0;
        const first = old.play(await f.load(old), () => { oldReturned++; })
            .then(() => null, error => error);
        f.preview.cancelReplay();
        const current = await f.openCatalogue();
        const next = current.play(await f.load(current), () => {});
        f.resolve(1);
        await next;
        f.resolve(0);
        assert(await first instanceof OpenCancelled);
        assert.equal(f.attempts[0].closes, 1);
        assert.equal(f.attempts[1].closes, 0);
        assert.equal(oldReturned, 0);
        old.cancel();
        assert.equal(f.attempts[1].closes, 0, "旧目录关闭不接管新目录演示");
        current.cancel();
        assert.equal(f.attempts[1].closes, 1, "新目录仍持有唯一新cleanup");
    } finally { f.dispose(); }
}

/** 同目录连续重播乱序完成时末次意图获胜，旧结果不能覆盖新清理句柄。 */
async function checkConcurrentReplay(): Promise<void> {
    const f = new PreviewFixture();
    try {
        const args = await f.openCatalogue();
        const first = args.play(await f.load(args), () => {});
        f.resolve(0);
        await first;
        const replay = f.attempts[0].args[4]!.replay;
        replay();
        replay();
        assert.equal(f.attempts.length, 3);
        assert.equal(f.attempts[1].args[9]!(), true, "较旧open的取消谓词必须立即失效");
        f.resolve(2);
        await flush();
        f.resolve(1);
        await flush();
        assert.equal(f.attempts[1].closes, 1);
        assert.equal(f.attempts[2].closes, 0);
        assert.deepEqual(f.notices, []);
        args.cancel();
        assert.equal(f.attempts[2].closes, 1, "目录关闭必须释放较新的演示");
    } finally { f.dispose(); }
}

/** 已被新重播替代的打开若以普通错误迟到失败，也不能提示或恢复旧目录。 */
async function checkStaleReplayFailure(): Promise<void> {
    const f = new PreviewFixture();
    try {
        const args = await f.openCatalogue();
        let returned = 0;
        const first = args.play(await f.load(args), () => { returned++; });
        f.resolve(0);
        await first;
        const replay = f.attempts[0].args[4]!.replay;
        replay();
        replay();
        f.resolve(2);
        await flush();
        const beforeLateError = returned;
        f.attempts[1].job.reject(new Error("older resource failed"));
        await flush();
        assert.equal(returned, beforeLateError, "旧普通错误不能恢复较新演示背后的旧目录");
        assert.equal(f.attempts[2].closes, 0);
        assert.deepEqual(f.notices, [], "旧普通错误在新播放期视作取消，不能迟到飘字");
        args.cancel();
        assert.equal(f.attempts[2].closes, 1);
    } finally { f.dispose(); }
}

/** 目录关闭同时中止正文读取及其超时；关闭后返回的战场也只能自清理。 */
async function checkCloseAbortsBodyAndOpen(): Promise<void> {
    const f = new PreviewFixture();
    try {
        let signal!: AbortSignal;
        const body = deferred<ArrayBuffer>();
        f.read = async (_url, options) => {
            signal = options.signal!;
            signal.addEventListener("abort", () => body.reject(new DOMException("aborted", "AbortError")), { once: true });
            return { ok: true, arrayBuffer: () => body.promise } as Response;
        };
        const args = await f.openCatalogue();
        const read = args.load().then(() => null, error => error);
        await flush();
        assert.equal(f.pendingTimers(), 1, "收到响应头后读取正文仍必须保留超时");
        args.cancel();
        assert.equal(signal.aborted, true);
        assert(await read instanceof Error);
        assert.equal(f.pendingTimers(), 0);
        f.read = null;
        const current = await f.openCatalogue();
        const play = current.play(await f.load(current), () => {})
            .then(() => null, error => error);
        current.cancel();
        assert.equal(f.attempts[0].args[9]!(), true);
        f.resolve(0);
        assert(await play instanceof OpenCancelled);
        assert.equal(f.attempts[0].closes, 1);
        assert.deepEqual(f.notices, []);
    } finally { f.dispose(); }
}

/** 网络正文卡住时8秒仍能中止并释放任务，不能只约束响应头阶段。 */
async function checkBodyTimeout(): Promise<void> {
    const f = new PreviewFixture();
    try {
        let signal!: AbortSignal;
        const body = deferred<ArrayBuffer>();
        f.read = async (_url, options) => {
            signal = options.signal!;
            signal.addEventListener("abort", () => body.reject(new DOMException("timeout", "AbortError")), { once: true });
            return { ok: true, arrayBuffer: () => body.promise } as Response;
        };
        const args = await f.openCatalogue();
        const read = args.load().then(() => null, error => error);
        await flush();
        f.advance(7999);
        assert.equal(signal.aborted, false);
        assert.equal(f.pendingTimers(), 1);
        f.advance(1);
        assert.equal(signal.aborted, true);
        assert.match(String(await read), /演示资源未就绪/);
        assert.equal(f.pendingTimers(), 0);
        assert.equal(f.attempts.length, 0);
    } finally { f.dispose(); }
}

/** 安装真实配置后逐项执行应用闭包，不启动后端、Creator或构建。 */
async function main(): Promise<void> {
    await ConfigFixtureUtils.installReal();
    await checkRealCatalogue();
    await checkOldEpochReplay();
    await checkLateOpenAfterEpoch();
    await checkConcurrentReplay();
    await checkStaleReplayFailure();
    await checkCloseAbortsBodyAndOpen();
    await checkBodyTimeout();
    console.log("PASS 技能演示应用7组：真实PB/目录、旧身份重播、迟到open、并发重播、旧普通失败、关页中止、正文超时");
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
