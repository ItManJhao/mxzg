/**
 * 开发验收入口：仅PREVIEW可用，只读战报与技能目录不装配登录或游戏连接。
 * 独立入口复用LoadingPlan启动表与唯一配置包，展示仍用原战场/统计；应用销毁统一撤销。
 */
import {Node} from "cc";
import {BattlePreviewResult} from "../../features/battle/BattlePreviewModel";
import {PREVIEW} from "cc/env";
import {BattleReplayPreview} from "../../features/battle/ui/BattleReplayPreview";
import {SkillAuditView} from "../../features/battle/ui/SkillAuditView";
import {SkillAuditEntry, SkillAuditEvidence, SkillAuditUtils} from "../../features/battle/utils/SkillAuditUtils";
import { OpenCancelled, UIManager } from "../../framework/ui/UIManager";
import { MainChapterView } from "../../features/battle/ui/MainChapterView";
import { ConfirmView } from "../../features/common/ui/ConfirmView";
import { RewardUtils } from "../../features/reward/utils/RewardUtils";
import type { RewardNotice } from "../../features/reward/data/RewardNoticeData";
import { GameProtocolCodecUtils } from "../../platform/GameProtocolCodecUtils";
import { GameConfig } from "../../config/GameConfig";
import { GConfig } from "../../config/GConfig";
import { RemakeConfigUtils } from "../../config/RemakeConfigUtils";
import { LOADING_PLAN } from "./LoadingPlan";

import {assetManager} from "cc";
import { GameLog } from "../../core/GameLog";
import { PrefabLoader } from "../../framework/assets/PrefabLoader";
import { ResourceAssetsUtils } from "../../framework/assets/ResourceAssetsUtils";
import { EventDispatcher } from "../../framework/EventDispatcher";
import {EventScope} from "../../framework/EventScope";
import {TrackedTimers} from "../../framework/TrackedTimers";

/** 本机只读二进制战报资源服务，不是游戏业务接口，不携带登录凭证。 */
const REPLAY_RESOURCE_ROOT = "http://127.0.0.1:19091/";

export class DevelopmentPreview {
    /** 开发诊断按键监听，销毁时解除，不在正式构建注册。 */
    private readonly diagnosticKey = (event: KeyboardEvent) => {
        if (event.code === "F8") {
            this.reportLifecycle();
        }
        if (event.code === "F7" && !event.repeat && this.idleChestPreviewEnabled()) {
            event.preventDefault();
            if (event.shiftKey) {
                void this.previewIdleReward();
            } else {
                const view = this.idleChestView();
                if (view?.previewIdleChest(this.idleChestStage)) {
                    UIManager.instance.toast("仅演示第" + this.idleChestStage + "档宝箱收取，不发送领取请求");
                    this.idleChestStage = this.idleChestStage % 4 + 1;
                } else {
                    UIManager.instance.toast("请在战斗主页等待宝箱就绪或上次演示结束");
                }
            }
        }
    };
    /** 显式预览按键下一次播放1至4档；不写页面当前档位或挂机状态。 */
    private idleChestStage = 1;
    /** 奖励演示准备期间互斥，关闭/换号后解除，不允许迟到窗口打开。 */
    private idleRewardPreparing = false;
    /** 演示装配代次由应用身份清理递增，只取消本地加载，不承担业务会话隔离。 */
    private idleRewardEpoch = 0;
    /** 应用提供通用奖励反馈队列；独立演示不另开一套奖励窗口，也不触碰资产。 */
    private showReward: ((notice: RewardNotice) => void) | null = null;
    /** 当前战报窗口加载序号，关闭或切换时阻止迟到加载重新出现。 */
    private replayEpoch = 0;
    /** 本机演示资源的在途读取；完成即移除，换身份或销毁时统一中止。 */
    private readonly replayRequests = new Set<AbortController>();
    /** 本实例拥有的开发页面注册解除函数。 */
    private readonly unregister: Array<() => void> = [];
    /** 当前演示的取消函数，重复播放前先清理旧画面。 */
    private replayCleanup: (() => void) | null = null;

    /**
     * 保存应用提供的开发宿主和存活判断，不在构造时打开页面。
     * @param pageHost 场景已有页面宿主，null表示本场景不支持开发演示。
     * @param startupHost 独立演示时隐藏的启动画面宿主，null表示无启动画面。
     * @param valid 判断所属应用是否仍存活，防止迟到演示覆盖新页面。
     */
    constructor(private readonly pageHost: Node | null, private readonly startupHost: Node | null,
                private readonly valid: () => boolean) {
    }

    /** 正常应用装配后复用同一反馈队列；独立战报页不需要该能力。 */
    public configureRewards(show: (notice: RewardNotice) => void): void {
        this.showReward = show;
    }

    /** 独立预览先安装同版配置，再注册只读展示；true表示正常会话装配必须停止。 */
    public async start(): Promise<boolean> {
        if (!PREVIEW) {
            return false;
        }
        if (typeof window !== "undefined") {
            window.addEventListener("keydown", this.diagnosticKey, true);
        }
        const query = typeof location !== "undefined" ? new URLSearchParams(location.search) : null;
        if (this.pageHost && (query?.get("skillAudit") === "1" || query?.get("battleReplay") === "1")) {
            if (!/^http:\/\/(localhost|127\.0\.0\.1):7456\//.test(location.href)) {
                throw new Error("独立战报仅允许本机Creator预览");
            }
            // 独立入口不经过登录资源阶段，仍复用唯一计划和配置包，不恢复页面配置准备清单。
            RemakeConfigUtils.initialize();
            for (const target of LOADING_PLAN.login) {
                if ("config" in target) {
                    await GameConfig.instance.prepare([target.config]);
                }
            }
            await RemakeConfigUtils.prepareGameConfig(() => {}, () => this.valid());
            if (!this.valid()) {
                return true;
            }
            this.unregister.push(UIManager.instance.setResidentHost("remake-modal", () => this.pageHost));
        }
        if (this.pageHost) {
            this.unregister.push(UIManager.instance.setResidentHost("skill-audit-host", () => this.pageHost));
            if (query?.get("skillAudit") === "1") {
                if (this.startupHost) {
                    this.startupHost.active = false;
                }
                await this.openSkillAudit();
                return true;
            }
        }

        if (query?.get("battleReplay") === "1") {
            if (!/^http:\/\/(localhost|127\.0\.0\.1):7456\//.test(location.href) || !this.pageHost) {
                throw new Error("独立战报仅允许本机Creator预览");
            }
            // 固定只读二进制资源服务，不建立游戏连接，不读取登录凭证。
            if (this.startupHost) {
                this.startupHost.active = false;
            }
            const mission = query.get("mission") || "1";
            if (!/^[1-9]\d*$/.test(mission) || !Number.isSafeInteger(Number(mission)) || Number(mission) > 0xffffffff) {
                throw new Error("独立预览关卡必须是规范的正整数全局idx");
            }
            const control = mission === "3" && query.get("control") === "1" ? "-control" : "";
            const fixtureType = query.get("fixture");
            // 全局idx只定位只读文件；不修改服务器challengeLimit或申请挑战/奖励。
            let fixture = "chapter-1-1-" + mission + control + "-replay.pb";
            switch (fixtureType) {
                case "configured": {
                    const source = GameConfig.instance.getFileByPath("config/chapterreward") as {
                        rows?: Array<{ idx: number }>;
                    };
                    if (!source.rows?.some(row => row.idx === Number(mission))) {
                        throw new Error("主线配置中不存在该全局关卡");
                    }
                    fixture = "chapter-config-stage-" + mission + ".pb";
                    break;
                }
                case "mixed":
                    fixture = "lineup-mixed-" + mission + "-replay.pb";
                    break;
                case "charm":
                    fixture = "independent-charm-star-5-replay.pb";
                    break;
                case "nanako":
                    fixture = "independent-nanako-replay.pb";
                    break;
                case "frozen":
                    fixture = "independent-frozen-replay.pb";
                    break;
                case "control-teams":
                    fixture = "independent-control-teams-replay.pb";
                    break;
                case "shield-survival":
                    fixture = "shield-depleted-survival.pb";
                    break;
                case "shield-death":
                    fixture = "shield-depleted-death.pb";
                    break;
            }
            const response = await fetch(REPLAY_RESOURCE_ROOT + fixture);
            if (!response.ok) {
                throw new Error("独立战报文件读取失败");
            }
            this.replayCleanup = await BattleReplayPreview.open(this.pageHost, new Uint8Array(await response.arrayBuffer()),
                query.get("chapterEnd") === "defeat",
                undefined, undefined, fixtureType === "configured" ? "配置关卡 · 第" + mission + "关（只读）"
                    : fixtureType === "mixed" ? "独立混合阵容 · 第" + mission + "关" : undefined);
            if (!this.valid()) {
                this.replayCleanup();
            }
            return true;
        }
        return false;
    }

    /** 打开配置目录，由Creator自动宿主扫描真实战报；不再维护技能/等级演示白名单。 */
    public async openSkillAudit(): Promise<void> {
        if (!PREVIEW || !this.pageHost) return;
        const epoch = this.replayEpoch;
        const replays = new Map<string, Uint8Array>();
        const requests = new Set<AbortController>();
        let active = true;
        let replaySerial = 0;
        let ownedCleanup: (() => void) | null = null;
        const current = () => active && epoch === this.replayEpoch && this.valid();
        await UIManager.instance.open(SkillAuditView, {
            load: () => this.loadSkillReplays(current, replays, requests),
            cancel: () => {
                active = false;
                replaySerial++;
                for (const request of requests) {
                    request.abort();
                }
                requests.clear();
                replays.clear();
                if (ownedCleanup) {
                    if (this.replayCleanup === ownedCleanup) {
                        this.replayCleanup = null;
                    }
                    ownedCleanup();
                    ownedCleanup = null;
                }
            },
            play: async (skill: SkillAuditEntry, returned: () => void) => {
                const fixture = skill.fixture || "";
                if (!/^http:\/\/(localhost|127\.0\.0\.1):7456\//.test(location.href)
                    || !/^[a-z0-9-]+\.pb$/.test(fixture)) {
                    throw new Error("技能演示仅允许本机Creator预览");
                }
                const bytes = replays.get(fixture);
                if (!bytes) {
                    throw new Error("本次检测没有对应战报，请重新打开技能目录");
                }
                const show = async () => {
                    if (!current() || !this.pageHost?.isValid) {
                        throw new OpenCancelled();
                    }
                    const serial = ++replaySerial;
                    this.replayCleanup?.();
                    const cleanup = await BattleReplayPreview.open(this.pageHost, bytes, false, () => {
                        if (current() && serial === replaySerial) {
                            returned();
                        }
                    }, {
                        skillId: skill.id, level: skill.level, name: skill.name,
                        passive: skill.activeType !== 1 && skill.activeType !== 2,
                        replay: () => {
                            void show().catch(error => {
                                if (current() && !UIManager.isOpenCancelled(error)
                                    && !UIManager.isFailureReported(error)) {
                                    returned();
                                    UIManager.instance.toast("重播失败：" + String(error));
                                }
                            });
                        }
                    }, undefined, false, undefined, false,
                        () => !current() || serial !== replaySerial).catch(error => {
                        // 旧准备失败只算取消，不能向较新的重播或身份弹出失败提示。
                        if (!current() || serial !== replaySerial) {
                            throw new OpenCancelled();
                        }
                        throw error;
                    });
                    if (!current() || serial !== replaySerial) {
                        cleanup();
                        throw new OpenCancelled();
                    }
                    ownedCleanup = cleanup;
                    this.replayCleanup = cleanup;
                };
                await show();
            }
        });
    }

    /** 每次打开重新扫描本机PB，逐份沿当前战报与动作解析预检；有问题的整场不进入可播放目录。 */
    private async loadSkillReplays(current: () => boolean, replays: Map<string, Uint8Array>,
        requests: Set<AbortController>): Promise<readonly SkillAuditEvidence[]> {
        if (!current()) {
            throw new OpenCancelled();
        }
        if (!/^http:\/\/(localhost|127\.0\.0\.1):7456\//.test(location.href)) {
            throw new Error("技能演示目录仅允许本机Creator预览");
        }
        const response = await this.fetchReplayResource("skill-audit.json", requests);
        const index = JSON.parse(new TextDecoder().decode(response)) as {
            schemaVersion?: unknown; replays?: Array<{ fixture?: unknown }>;
        };
        if (!index || index.schemaVersion !== 1 || !Array.isArray(index.replays) || index.replays.length > 2048) {
            throw new Error("本机技能演示目录格式无效，请重载项目扩展");
        }
        const files = index.replays.map(entry => entry?.fixture);
        if (!files.every((file): file is string => typeof file === "string" && /^[a-z0-9-]+\.pb$/.test(file))
            || new Set(files).size !== files.length) {
            throw new Error("本机技能演示目录含非法或重复文件名");
        }
        const evidence: SkillAuditEvidence[] = [];
        replays.clear();
        // 每批只读八份，避免积累目录后同时下载大量二进制；不保存第二份配置或玩法状态。
        for (let offset = 0; offset < files.length; offset += 8) {
            if (!current()) {
                throw new OpenCancelled();
            }
            await Promise.all(files.slice(offset, offset + 8).map(async fixture => {
                try {
                    const bytes = await this.fetchReplayResource(fixture, requests);
                    const found = SkillAuditUtils.inspectReplay(fixture, bytes);
                    if (!current()) {
                        throw new OpenCancelled();
                    }
                    replays.set(fixture, bytes);
                    evidence.push(...found);
                } catch (error) {
                    if (UIManager.isOpenCancelled(error) || !current()) {
                        throw new OpenCancelled();
                    }
                    const reason = error instanceof Error ? error.message : String(error);
                    GameLog.shared.warnOnce("DEV", "SkillAudit", fixture + ":" + reason,
                        "跳过不能播放的战报 " + fixture + "：" + reason);
                }
            }));
        }
        if (!current()) {
            throw new OpenCancelled();
        }
        return Object.freeze(evidence.sort((a, b) => a.fixture.localeCompare(b.fixture)));
    }

    /** 本机开发资源读取不携带凭证、不跟随重定向；中止和超时均释放在途记录。 */
    private async fetchReplayResource(file: string, requests: Set<AbortController>): Promise<Uint8Array> {
        const controller = new AbortController();
        this.replayRequests.add(controller);
        requests.add(controller);
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
            const response = await fetch(REPLAY_RESOURCE_ROOT + file, {
                credentials: "omit", redirect: "error", cache: "no-store", signal: controller.signal,
            });
            if (!response.ok) {
                throw new Error("资源状态 " + response.status);
            }
            const bytes = new Uint8Array(await response.arrayBuffer());
            if (bytes.byteLength > 2 * 1024 * 1024) {
                throw new Error("演示资源超过2MB上限");
            }
            return bytes;
        } catch (error) {
            if (!this.valid()) {
                throw new OpenCancelled();
            }
            throw new Error("本机技能演示资源未就绪，请重载“UI资源构建检查”扩展后重试（"
                + file + "：" + (error instanceof Error ? error.message : String(error)) + "）");
        } finally {
            clearTimeout(timeout);
            this.replayRequests.delete(controller);
            requests.delete(controller);
        }
    }


    /** 打开已由模块完整校验的服务端战报，不再读取固定文件或替换阵容。 */
    public async openLineupBattle(result: BattlePreviewResult): Promise<void> {
        if (!PREVIEW || !this.pageHost || !this.valid()) return;
        this.cancelReplay();
        const epoch = this.replayEpoch;
        const hidden = this.pageHost.children.filter(node => node.active);
        hidden.forEach(node => {
            node.active = false;
        });
        let restored = false;
        const restore = () => {
            if (restored) return;
            restored = true;
            hidden.forEach(node => {
                if (node.isValid) node.active = true;
            });
        };
        // 加载途中取消也先恢复旧页面；最终迟到的战场再销毁，不能重新覆盖新身份页面。
        this.replayCleanup = restore;
        try {
            const cleanup = await BattleReplayPreview.open(this.pageHost, result.bytes, false, restore, undefined,
                "主线第" + result.mission + "关·只读");
            if (epoch !== this.replayEpoch || !this.valid()) cleanup();
            else this.replayCleanup = () => {
                cleanup();
                restore();
            };
        } catch (error) {
            restore();
            throw error;
        }
        GameLog.shared.classified("DEV", "info", "LineupBattle", JSON.stringify({
            mission: result.mission, assetRevision: result.assetRevision, lineupVersion: result.lineupVersion,
            formationId: result.formationId, pending: result.pending,
        }));
    }

    /** 宝箱演示须显式参数且只在Creator本机预览中注册，不随正式包或普通F7生效。 */
    private idleChestPreviewEnabled(): boolean {
        return PREVIEW && typeof location !== "undefined"
            && /^http:\/\/(localhost|127\.0\.0\.1):7456\//.test(location.href)
            && new URLSearchParams(location.search).get("idleChestPreview") === "1";
    }

    /** 只选取当前仍显示的主线页面，不重新打开页面或创建测试资产。 */
    private idleChestView(): MainChapterView | null {
        if (!this.pageHost?.isValid) {
            return null;
        }
        return this.pageHost.getComponentsInChildren(MainChapterView)
            .find(view => view.isValid && view.node.activeInHierarchy) || null;
    }

    /** 读取独立测试导出的真实历史回执演示旧确认/奖励窗，始终不发送领取或提交其中的资产。 */
    private async previewIdleReward(): Promise<void> {
        if (!this.idleChestPreviewEnabled() || !this.valid() || !this.idleChestView() || this.idleRewardPreparing
            || !this.showReward || UIManager.instance.isOpen("confirm") || UIManager.instance.isOpen("reward")) {
            return;
        }
        this.idleRewardPreparing = true;
        const epoch = this.idleRewardEpoch;
        try {
            const response = await fetch(REPLAY_RESOURCE_ROOT + "idle-chest-receipt.json", {credentials: "omit", redirect: "error"});
            if (!response.ok) {
                throw new Error("独立宝箱演示回执不可用");
            }
            const receipt = GameProtocolCodecUtils.validateIdleReceipt(await response.json());
            const notice = RewardUtils.fromActual(receipt.receiptId as string, receipt.assetRevision as number, receipt.actual);
            if (!notice) {
                throw new Error("宝箱演示回执没有实际到账");
            }
            if (epoch !== this.idleRewardEpoch || !this.valid() || !this.idleChestView()) {
                return;
            }
            UIManager.instance.toast("仅演示冒险点满额确认及真实回执展示，不发送领取请求");
            const language = (id: number): string => {
                const value = GameConfig.instance.getConfig(GConfig.Language, id)?.value;
                if (!value) {
                    throw new Error("宝箱演示缺少语言配置：" + id);
                }
                return value;
            };
            await UIManager.instance.open(ConfirmView, {
                title: language(3500),
                message: language(2220),
                confirmText: language(47589),
                cancelText: language(47703),
                onConfirm: () => {
                    if (epoch !== this.idleRewardEpoch || !this.valid()) {
                        return;
                    }
                    this.idleChestView()?.previewIdleChest(this.idleChestStage);
                    try {
                        this.showReward?.(notice);
                    } catch (error) {
                        this.reportIdleRewardFailure(error);
                    }
                },
            });
        } catch (error) {
            if (epoch === this.idleRewardEpoch && this.valid()) {
                this.reportIdleRewardFailure(error);
            }
        } finally {
            if (epoch === this.idleRewardEpoch) {
                this.idleRewardPreparing = false;
            }
        }
    }

    /** 演示失败沿用统一飘字，框架已经报告的异常不重复反馈。 */
    private reportIdleRewardFailure(error: unknown): void {
        if (!UIManager.isOpenCancelled(error) && !UIManager.isFailureReported(error)) {
            UIManager.instance.toast("宝箱表现演示失败：" + String(error));
        }
    }

    /** 应用统一在身份变化或退出时关闭演示，模块不检查角色键。 */
    public cancelReplay(): void {
        this.idleRewardEpoch++;
        this.idleRewardPreparing = false;
        UIManager.instance.closeById("confirm");
        UIManager.instance.closeById("reward");
        this.replayEpoch++;
        for (const request of this.replayRequests) {
            request.abort();
        }
        this.replayRequests.clear();
        this.replayCleanup?.();
        this.replayCleanup = null;
    }

    /** 输出本次真实计数；应用缓存、引擎资产、受管监听和原生计时器分别观察。 */
    public reportLifecycle(): void {
        GameLog.shared.classified("DEV", "info", "Lifecycle", JSON.stringify({
            assets: ResourceAssetsUtils.snapshot(), prefabs: PrefabLoader.prefabCacheSnapshot(),
            ui: UIManager.instance.snapshot(), events: EventDispatcher.instance.snapshot(),
            scopedSubscriptions: EventScope.snapshot(), nativeTimers: TrackedTimers.snapshot(),
            engineAssets: assetManager.assets.count,
        }));
    }

    /** 先取消演示，再关闭目录、撤销注册，避免迟到窗口污染下一应用。 */
    public dispose(): void {
        if (typeof window !== "undefined") window.removeEventListener("keydown", this.diagnosticKey, true);
        this.cancelReplay();
        this.showReward = null;
        UIManager.instance.closeById("skill-audit");
        for (const stop of this.unregister.splice(0)) stop();
    }
}
