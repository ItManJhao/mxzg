/** 开发验收入口：仅PREVIEW可用，只读战报与技能目录不装配登录或游戏连接；应用销毁统一撤销。 */
import {Node} from "cc";
import {BattlePreviewResult} from "../../features/battle/BattlePreviewModel";
import {PREVIEW} from "cc/env";
import {BattleReplayPreview} from "../../features/battle/ui/BattleReplayPreview";
import {SkillAuditView} from "../../features/battle/ui/SkillAuditView";
import {SkillAuditEntry} from "../../features/battle/utils/SkillAuditUtils";
import { UIManager } from "../../framework/ui/UIManager";
import { MainChapterView } from "../../features/battle/ui/MainChapterView";
import { ConfirmView } from "../../features/common/ui/ConfirmView";
import { RewardUtils } from "../../features/reward/utils/RewardUtils";
import type { RewardNotice } from "../../features/reward/data/RewardNoticeData";
import { GameProtocolCodecUtils } from "../../platform/GameProtocolCodecUtils";
import { GameConfig } from "../../config/GameConfig";
import { GConfig } from "../../config/GConfig";

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

    /** 注册开发入口；true表示已进入独立预览，正常会话装配必须停止。 */
    public async start(): Promise<boolean> {
        if (!PREVIEW) {
            return false;
        }
        if (typeof window !== "undefined") {
            window.addEventListener("keydown", this.diagnosticKey, true);
        }
        const query = typeof location !== "undefined" ? new URLSearchParams(location.search) : null;
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
            const requestedMission = query.get("mission");
            const mission = requestedMission === "3" ? "3" : requestedMission === "2" ? "2" : "1";
            const control = mission === "3" && query.get("control") === "1" ? "-control" : "";
            const fixtureType = query.get("fixture");
            // 混合阵容验收只播放隔离环境导出的真实回包，关卡号沿上面的1至3校验。
            let fixture = "chapter-1-1-" + mission + control + "-replay.pb";
            switch (fixtureType) {
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
            }
            const response = await fetch(REPLAY_RESOURCE_ROOT + fixture);
            if (!response.ok) {
                throw new Error("独立战报文件读取失败");
            }
            this.replayCleanup = await BattleReplayPreview.open(this.pageHost, new Uint8Array(await response.arrayBuffer()),
                query.get("chapterEnd") === "defeat",
                undefined, undefined, fixtureType === "mixed" ? "独立混合阵容 · 第" + mission + "关" : undefined);
            if (!this.valid()) {
                this.replayCleanup();
            }
            return true;
        }
        return false;
    }

    /** 打开开发技能目录；固定只读战报资源不携带账号凭证，也不请求游戏业务HTTP。 */
    public async openSkillAudit(): Promise<void> {
        if (!PREVIEW || !this.pageHost) return;
        await UIManager.instance.open(SkillAuditView, {
            play: async (skill: SkillAuditEntry, returned: () => void) => {
                const fixture = skill.fixture || "";
                if (!/^http:\/\/(localhost|127\.0\.0\.1):7456\//.test(location.href)
                    || !/^[a-z0-9-]+\.pb$/.test(fixture)) {
                    throw new Error("技能演示仅允许本机Creator预览");
                }
                const response = await fetch(REPLAY_RESOURCE_ROOT + fixture);
                if (!response.ok) throw new Error("演示战报资源缺失");
                const bytes = new Uint8Array(await response.arrayBuffer());
                const show = async () => {
                    this.replayCleanup?.();
                    if (!this.valid() || !this.pageHost?.isValid) return;
                    this.replayCleanup = await BattleReplayPreview.open(this.pageHost, bytes, false, returned, {
                        skillId: skill.id, level: skill.level, name: skill.name,
                        passive: skill.activeType !== 1 && skill.activeType !== 2,
                        replay: () => {
                            void show().catch(error => {
                                returned();
                                UIManager.instance.toast("重播失败：" + String(error));
                            });
                        }
                    });
                    if (!this.valid()) this.replayCleanup?.();
                };
                await show();
            }
        });
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
