/** 开发验收入口：仅PREVIEW可用，只读战报与技能目录不装配登录或游戏连接；应用销毁统一撤销。 */
import { Node } from "cc";
import { BattlePreviewResult } from "../../features/battle/BattlePreviewModel";
import { PREVIEW } from "cc/env";
import { GameConfig } from "../../config/GameConfig";
import { GConfig } from "../../config/GConfig";
import { BattleReplayPreview } from "../../features/battle/ui/BattleReplayPreview";
import { SkillAuditView } from "../../features/battle/ui/SkillAuditView";
import { SkillAuditEntry } from "../../features/battle/utils/SkillAuditUtils";
import { loadPrefab } from "../../framework/assets/PrefabLoader";
import { UILayer } from "../../framework/ui/UILayer";
import { UIManager } from "../../framework/ui/UIManager";
import { registerView } from "../../framework/ui/UIRegistry";

import { assetManager } from "cc";
import { GameLog } from "../../core/GameLog";
import { prefabCacheSnapshot } from "../../framework/assets/PrefabLoader";
import { ResourceAssetsUtils } from "../../framework/assets/ResourceAssets";
import { EventDispatcher } from "../../framework/EventDispatcher";
import { EventScope } from "../../framework/EventScope";
import { TrackedTimers } from "../../framework/TrackedTimers";

export class DevelopmentPreview {
    /** 开发诊断按键监听，销毁时解除，不在正式构建注册。 */
    private readonly diagnosticKey = (event: KeyboardEvent) => {
        if(event.code === "F8") this.reportLifecycle();
    };
    /** 当前战报窗口加载序号，关闭或切换时阻止迟到加载重新出现。 */
    private replayEpoch = 0;
    /** 本实例拥有的开发页面注册解除函数。 */
    private readonly unregister: Array<() => void> = [];
    /** 当前演示的取消函数，重复播放前先清理旧画面。 */
    private replayCleanup: (() => void) | null = null;
    /** 应用提供场景宿主和存活判断，不让开发工具反向依赖RemakeApp。 */
    constructor(private readonly pageHost: Node | null, private readonly startupHost: Node | null,
        private readonly valid: () => boolean) { }

    /** 注册开发入口；true表示已进入独立预览，正常会话装配必须停止。 */
    public async start(): Promise<boolean> {
        if(PREVIEW && typeof window !== "undefined") window.addEventListener("keydown", this.diagnosticKey, true);
        if(PREVIEW && this.pageHost) {
            this.unregister.push(UIManager.instance.setResidentHost("skill-audit-host", () => this.pageHost));
            this.unregister.push(registerView(SkillAuditView, {
                id: "skill-audit", prefab: "bundles/battle/prefabs/SkillAuditView",
                layer: UILayer.Popup, cache: false, allowMultiple: false, hostId: "skill-audit-host",
                modal: { mask: true, closeOnOutside: false },
                load: async () => {
                    await GameConfig.instance.prepare([GConfig.HeroType, GConfig.HeroSkill, GConfig.Language]);
                    return loadPrefab("bundles/battle/prefabs/SkillAuditView");
                }
            }));
            if(typeof location !== "undefined" && new URLSearchParams(location.search).get("skillAudit") === "1") {
                if(this.startupHost) this.startupHost.active = false;
                await this.openSkillAudit();
                return true;
            }
        }

        if(PREVIEW && typeof location !== "undefined" && new URLSearchParams(location.search).get("battleReplay") === "1") {
            if(!/^http:\/\/(localhost|127\.0\.0\.1):7456\//.test(location.href) || !this.pageHost) {
                throw new Error("独立战报仅允许本机Creator预览");
            }
            // 固定只读二进制资源服务，不建立游戏连接，不读取登录凭证。
            if(this.startupHost) this.startupHost.active = false;
            const requestedMission = new URLSearchParams(location.search).get("mission");
            const mission = requestedMission === "3" ? "3" : requestedMission === "2" ? "2" : "1";
            const control = mission === "3" && new URLSearchParams(location.search).get("control") === "1" ? "-control" : "";
            const fixtureType = new URLSearchParams(location.search).get("fixture");
            // 混合阵容验收只播放隔离环境导出的真实回包，关卡号沿上面的1至3校验。
            const fixture = fixtureType === "mixed" ? "lineup-mixed-" + mission + "-replay.pb"
                : fixtureType === "charm"
                ? "independent-charm-star-5-replay.pb" : new URLSearchParams(location.search).get("fixture") === "nanako"
                ? "independent-nanako-replay.pb" : new URLSearchParams(location.search).get("fixture") === "frozen"
                    ? "independent-frozen-replay.pb" : new URLSearchParams(location.search).get("fixture") === "control-teams"
                        ? "independent-control-teams-replay.pb" : "chapter-1-1-" + mission + control + "-replay.pb";
            const response = await fetch("http://127.0.0.1:19091/" + fixture);
            if(!response.ok) throw new Error("独立战报文件读取失败");
            this.replayCleanup = await BattleReplayPreview.open(this.pageHost, new Uint8Array(await response.arrayBuffer()),
                new URLSearchParams(location.search).get("chapterEnd") === "defeat",
                undefined, undefined, fixtureType === "mixed" ? "独立混合阵容 · 第" + mission + "关" : undefined);
            if(!this.valid()) this.replayCleanup();
            return true;
        }
        return false;
    }
    /** 打开开发技能目录；固定只读战报资源不携带账号凭证，也不请求游戏业务HTTP。 */
    public async openSkillAudit(): Promise<void> {
        if(!PREVIEW || !this.pageHost) return;
        await UIManager.instance.open(SkillAuditView, {
            play: async (skill: SkillAuditEntry, returned: () => void) => {
                const fixture = skill.fixture || "";
                if(!/^http:\/\/(localhost|127\.0\.0\.1):7456\//.test(location.href)
                    || !/^[a-z0-9-]+\.pb$/.test(fixture)) {
                    throw new Error("技能演示仅允许本机Creator预览");
                }
                const response = await fetch("http://127.0.0.1:19091/" + fixture);
                if(!response.ok) throw new Error("演示战报资源缺失");
                const bytes = new Uint8Array(await response.arrayBuffer());
                const show = async () => {
                    this.replayCleanup?.();
                    if(!this.valid() || !this.pageHost?.isValid) return;
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
                    if(!this.valid()) this.replayCleanup?.();
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
        hidden.forEach(node => { node.active = false; });
        let restored = false;
        const restore = () => {
            if (restored) return;
            restored = true;
            hidden.forEach(node => { if (node.isValid) node.active = true; });
        };
        // 加载途中取消也先恢复旧页面；最终迟到的战场再销毁，不能重新覆盖新身份页面。
        this.replayCleanup = restore;
        try {
            const cleanup = await BattleReplayPreview.open(this.pageHost, result.bytes, false, restore, undefined,
                "主线第" + result.mission + "关·只读");
            if (epoch !== this.replayEpoch || !this.valid()) cleanup();
            else this.replayCleanup = () => { cleanup(); restore(); };
        } catch (error) {
            restore();
            throw error;
        }
        GameLog.shared.classified("DEV", "info", "LineupBattle", JSON.stringify({
            mission: result.mission, assetRevision: result.assetRevision, lineupVersion: result.lineupVersion,
            formationId: result.formationId, pending: result.pending,
        }));
    }

    /** 应用统一在身份变化或退出时关闭演示，模块不检查角色键。 */
    public cancelReplay(): void {
        this.replayEpoch++;
        this.replayCleanup?.();
        this.replayCleanup = null;
    }

    /** 输出本次真实计数；应用缓存、引擎资产、受管监听和原生计时器分别观察。 */
    public reportLifecycle(): void {
        GameLog.shared.classified("DEV", "info", "Lifecycle", JSON.stringify({
            assets: ResourceAssetsUtils.snapshot(), prefabs: prefabCacheSnapshot(),
            ui: UIManager.instance.snapshot(), events: EventDispatcher.instance.snapshot(),
            scopedSubscriptions: EventScope.snapshot(), nativeTimers: TrackedTimers.snapshot(),
            engineAssets: assetManager.assets.count,
        }));
    }

    /** 先取消演示，再关闭目录、撤销注册，避免迟到窗口污染下一应用。 */
    public dispose(): void {
        if(typeof window !== "undefined") window.removeEventListener("keydown", this.diagnosticKey, true);
        this.cancelReplay();
        UIManager.instance.closeById("skill-audit");
        for(const stop of this.unregister.splice(0)) stop();
    }
}
