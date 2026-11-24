/**
 * 正式战斗出场时序专项：直接执行BattleReplayPreview.open，控制真实资源入口和cc动画时钟。
 * 验证开场能先播、双边资源就绪后在开始骨骼70%起出场、出场60%渐入，以及技能慢载和关闭清理。
 * 同时执行真实技能、持续控制和飘字回调，核骨骼切换、材质、共享循环帧及关页清理；不能替代Creator渲染验收。
 */
import { strict as assert } from "node:assert";
import { BitmapFont, Button, director, Director, Label, Node, sp, Sprite, SpriteFrame, tween, UIOpacity, UITransform, Vec3 } from "cc";
import { OpeningClockRuntime } from "./OpeningClockRuntime";
import { ConfigFixtureUtils } from "./ConfigFixtureUtils";
import { GameConfig } from "../assets/scripts/config/GameConfig";
import { GameLog } from "../assets/scripts/core/GameLog";
import { ResourceAssetsUtils } from "../assets/scripts/framework/assets/ResourceAssetsUtils";
import { ViewportLayoutUtils } from "../assets/scripts/framework/ui/ViewportLayoutUtils";
import { BattleReplayPlayer, BattleReplayPresentation } from "../assets/scripts/features/battle/BattleReplayPlayer";
import { BattlePageUtils } from "../assets/scripts/features/battle/ui/BattlePageUtils";
import { BattlePresentViewUtils } from "../assets/scripts/features/battle/ui/BattlePresentViewUtils";
import { BattleReplayPreview } from "../assets/scripts/features/battle/ui/BattleReplayPreview";
import { BattleSpineService } from "../assets/scripts/features/battle/ui/BattleSpineService";
import { BattleAttackUtils } from "../assets/scripts/features/battle/utils/BattleAttackUtils";
import { BattleInfoUtils } from "../assets/scripts/features/battle/utils/BattleInfoUtils";
import { BattleReplayStep, BattleReplayUtils } from "../assets/scripts/features/battle/utils/BattleReplayUtils";

/** 用例决定某个资源到达或失败的时刻，开场和失败清理均由真实播放器执行。 */
function deferred(): { promise: Promise<void>; resolve(): void; reject(error: Error): void } {
    let resolve!: () => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<void>((done, fail) => {
        resolve = done;
        reject = fail;
    });
    return { promise, resolve, reject };
}

/** 创建已知挂点及恒等坐标转换；位移保留Vec3复制与对象重载，不模拟真实排版或绘制。 */
function node(name: string, parent?: Node): Node {
    const value = new Node(name);
    (value as any).position = new Vec3();
    Object.defineProperty(value, "worldPosition", { get: () => value.position });
    value.setPosition = ((x: number | Vec3, y = 0, z = 0) => {
        (value as any).position = typeof x === "number" ? new Vec3(x, y, z) : x.clone();
        value.emit(Node.EventType.TRANSFORM_CHANGED);
    }) as typeof value.setPosition;
    if (parent) {
        value.parent = parent;
    }
    const transform = value.addComponent(UITransform);
    transform.setContentSize(640, 1280);
    (transform as any).convertToWorldSpaceAR = (point: Vec3) => point.clone();
    (transform as any).convertToNodeSpaceAR = (point: Vec3) => point.clone();
    return value;
}

/** 准备四个单位，确保双边与同边多个出场不会被错误串行。 */
const units = [
    { unitId: 1, faction: 1, position: 1 },
    { unitId: 2, faction: 1, position: 2 },
    { unitId: 3, faction: 2, position: 1 },
    { unitId: 4, faction: 2, position: 2 },
].map(row => ({ ...row, templateId: 10102002, level: 1, star: 2, maxHp: 10, initialHp: 10 }));

/** 单个用例的节点与边界替身，所有生产方法在finally恢复。 */
class OpeningFixture {
    /** 正式用例保留双边四单位；挂机回归只用一个我方和一个敌方，不扩大协议名册范围。 */
    public readonly roster: typeof units;
    /** 同时挂起最后一张敌方出场帧和首个骨骼，验证不阻塞其余资源发起加载。 */
    public readonly resource = deferred();
    /** 测试慢速技能包时只拦指定资源，由用例调用 releaseResources 放行。 */
    public delayedPath: string | null = null;
    /** 用例根节点，销毁它触发生产Preview自己的取消与清理。 */
    public readonly parent = node("OpeningTestRoot");
    /** 真实Preview挂载的战场节点，保存生产需要的静态挂点。 */
    public readonly root = node("OpeningBattlePage", this.parent);
    /** 手动进度用例的轨道时间；仅模拟Skeleton.getCurrent读取，不在测试中实现阈值。 */
    public zdksTrackTime = 0;
    /** 记录生产读取当前轨道次数，用于断言70%或关闭后已解除每帧监听。 */
    public zdksProgressReads = 0;
    /** 当前开始骨骼完成回调，由手动用例明确触发；取消后只能验证生产拒绝迟到继续。 */
    public completeZdks: (() => void) | undefined;
    /** 当前资源请求路径，不参与业务决策。 */
    public readonly loaded: string[] = [];
    /** 被生产挂入的模型节点，检查其真实可见性和透明度。 */
    public readonly models: Node[] = [];
    /** 记录测试期间播放器主动切换的骨骼动作，不模拟骨骼自然完成。 */
    public readonly actorActions: string[] = [];
    /** 记录ZDKS开始时钟，不伪造动画结束事件。 */
    public readonly zdksStarts: number[] = [];
    /** 记录真实Preview何时调用战报入口；不在此模拟战报逻辑。 */
    public readonly playbackStarts: number[] = [];
    /** 真实生产渐入日志出现时的时钟与当前出场图，验证渐入跟随完整帧进度而非独立墙钟。 */
    public readonly fadeStarts: { at: number; frames: string[] }[] = [];
    /** 生产分类日志中收集的错误，防止取消被误报为播放失败。 */
    public readonly errors: string[] = [];
    /** 由真实Preview创建的显示能力，仅用来调用生产状态显示，不复制paintBuffs规则。 */
    public presentation: BattleReplayPresentation | null = null;
    /** 资源门闩是否阻断；用例放行后不重新阻断其他请求。 */
    private blocked: boolean;
    /** 保存被替换的边界方法，用例后按原引用恢复。 */
    private readonly originals = {
        mount: BattlePageUtils.mountBattlePrefab,
        parse: BattleReplayUtils.parse,
        resources: ResourceAssetsUtils.forNode,
        spine: BattleSpineService.instance.mountBattleSpine,
        namedSpine: BattleSpineService.instance.mountNamedSpine,
        viewport: ViewportLayoutUtils.bindVisibleRefresh,
        play: BattleReplayPlayer.prototype.play,
        log: GameLog.shared.classified,
    };

    /** 构造静态挂点与外部资源门闩；可选择挂机一对单位或指定战报步骤。 */
    public constructor(blockResource = false, idleEncounter = false, selectedSteps: any[] = [], manualOpening = false) {
        this.roster = idleEncounter ? [units[0], units[2]] : units;
        this.blocked = blockResource;
        const child = (path: string): Node => this.child(path);
        child("IdleLayout/ModelScale");
        child("IdleLayout/HpOffset");
        child("IdleLayout/Enemy1");
        for (const side of ["ally", "enemy"]) {
            for (let index = 0; index < 8; index++) {
                child("LayerField/" + side + "/Slot" + index);
                const row = child("LayerHud/HpBars/" + side + index);
                node("Label", row).addComponent(Label);
                node("Fill", row).addComponent(Sprite);
                node("ElementIcon", row).addComponent(Sprite);
                const buffs = node("BuffRow", row);
                for (let chip = 0; chip < 3; chip++) {
                    node("Buff_" + chip, buffs).addComponent(Sprite);
                }
            }
        }
        for (const path of ["LayerHud/MatchInfo/AllyNameLabel", "LayerHud/MatchInfo/EnemyNameLabel",
            "LayerHud/BtnSkip/Label", "LayerHud/Log", "LayerHud/RoundLabel"]) {
            child(path).addComponent(Label);
        }
        child("LayerHud/TopBar/BtnSpeed").addComponent(Button);
        child("LayerHud/TopBar/BtnClose");
        child("LayerHud/ChapterInfoDock/ChapterMatchInfoAnchor");
        child("LayerHud/ChapterInfoDock/ChapterTopBarAnchor");
        child("LayerHud/MatchInfo");
        child("LayerHud/BtnRetreat");
        child("LayerAppear");
        child("LayerHud/SkillBars");
        child("LayerVfx/VfxScreen/DimOverlay").addComponent(UIOpacity);
        const numberTemplate = child("LayerFloat/FloatDamageRoot/DamageNumberTemplate");
        numberTemplate.addComponent(Label);
        // 基础替身只复制节点名，在模板替身上补齐显式标签绑定和坐标设置。
        (numberTemplate as any)._instantiate = () => {
            const copy = node(numberTemplate.name);
            copy.addComponent(Label);
            return copy;
        };
        child("SkillNameBanner/SkillNameLabel").addComponent(Label);
        const shell = {
            root: this.root,
            layerField: child("LayerField"),
            present: BattlePresentViewUtils.bindBattlePresent(this.root),
            logLabel: child("LayerHud/Log"),
            roundLabel: child("LayerHud/RoundLabel"),
            slot: (side: string, index: number) => child("LayerField/" + side + "/Slot" + index),
            hpLabel: (side: string, index: number) => child("LayerHud/HpBars/" + side + index + "/Label"),
            bindSkip: () => {},
            bindRetreat: () => {},
            bindClose: () => {},
        };
        BattlePageUtils.mountBattlePrefab = async () => shell as any;
        BattleReplayUtils.parse = () => ({
            steps: selectedSteps,
            units: this.roster as any,
            names: { attacker: "测试甲", defender: "测试乙" },
        });
        ResourceAssetsUtils.forNode = () => ({
            loadPath: async (path: string, type: string) => {
                this.loaded.push(path);
                if ((this.blocked && path === "battle/ui/battle-appear-right_14/spriteFrame") || path === this.delayedPath) {
                    await this.resource.promise;
                }
                const asset = type === "BitmapFont" ? new BitmapFont() : new SpriteFrame();
                return Object.assign(asset, { testPath: path });
            },
            dispose: () => {},
        }) as any;
        BattleSpineService.instance.mountBattleSpine = (slot: Node, _stem: string, _fail: () => void, options: any) => {
            const actorNode = node("Model", slot);
            const skeleton = actorNode.addComponent(sp.Skeleton);
            (skeleton as any).customMaterial = { testOriginal: true };
            this.models.push(actorNode);
            const actor = {
                node: actorNode,
                play: (clip: string) => this.actorActions.push(clip),
                gesture: (clip: string) => {
                    this.actorActions.push(clip);
                    return true;
                },
            };
            const ready = this.blocked && this.models.length === 1 ? this.resource.promise : Promise.resolve();
            void ready.then(options.onReady);
            return actor as any;
        };
        BattleSpineService.instance.mountNamedSpine = (host, stem, _clip, options) => {
            assert.equal(stem, "ZDKS");
            const started = OpeningClockRuntime.now;
            this.zdksStarts.push(started);
            const skeleton = host.addComponent(sp.Skeleton);
            // 用一秒轨道方便边界断言；生产阈值只可由getCurrent实际trackTime得出，不能读测试时钟。
            (skeleton as any).getCurrent = () => {
                this.zdksProgressReads++;
                return {
                    animationStart: 0,
                    animationEnd: 1,
                    trackTime: manualOpening ? this.zdksTrackTime : OpeningClockRuntime.now - started,
                };
            };
            this.completeZdks = () => options?.onComplete?.();
            if (!manualOpening) {
                tween(host).delay(0.7).call(() => director.emit(Director.EVENT_AFTER_UPDATE))
                    .delay(0.3).call(() => options?.onComplete?.()).start();
            }
            void Promise.resolve().then(() => options?.onReady?.());
        };
        ViewportLayoutUtils.bindVisibleRefresh = () => () => {};
        const fixture = this;
        BattleReplayPlayer.prototype.play = async function() {
            fixture.playbackStarts.push(OpeningClockRuntime.now);
            fixture.presentation = (this as any).presentation;
            return false;
        };
        GameLog.shared.classified = (_layer, severity, _source, message) => {
            if (severity === "error") {
                this.errors.push(String(message));
            }
            if (String(message).startsWith("opening.fade.started")) {
                this.fadeStarts.push({
                    at: OpeningClockRuntime.now,
                    frames: this.effects().map(value => (value.getComponent(Sprite)!.spriteFrame as any).testPath),
                });
            }
        };
    }

    /** 按静态路径取得或创建挂点，不在测试中实现出场算法。 */
    public child(path: string): Node {
        let current = this.root;
        for (const name of path.split("/")) {
            current = current.getChildByName(name) || node(name, current);
        }
        return current;
    }

    /** 一起放行受控出场帧和骨骼，重复调用无额外作用。 */
    public releaseResources(): void {
        this.blocked = false;
        this.delayedPath = null;
        this.resource.resolve();
    }

    /** 资源分段回归使用真实技能调度器，记录进入战报的时刻，沿用本用例配置的服务端步骤。 */
    public useReplayPlayer(): void {
        const fixture = this;
        const play = this.originals.play;
        BattleReplayPlayer.prototype.play = function(bytes, focus) {
            fixture.playbackStarts.push(OpeningClockRuntime.now);
            return play.call(this, bytes, focus);
        };
    }

    /** 调用真实正式/挂机入口，使用onCompleted隔离本专项不涉及的结算装配。 */
    public open(idleEncounter = false): Promise<() => void> {
        return BattleReplayPreview.open(this.parent, new Uint8Array(), false, undefined,
            undefined, undefined, true, async () => {}, idleEncounter);
    }

    /** 返回真实出场节点，仅按业务节点名定位而不读取生产源码文字。 */
    public effects(): Node[] {
        return this.roster.flatMap(unit => {
            const side = unit.faction === 1 ? "ally" : "enemy";
            const slot = this.root.getChildByPath("LayerField/" + side + "/Slot" + (unit.position - 1));
            return slot ? slot.children.filter(value => value.name.endsWith("AppearEffect") && value.isValid) : [];
        });
    }

    /** 返回本关真实使用的四条血条，其他空槽不计。 */
    public hpRows(): Node[] {
        return this.roster.map(unit => this.child("LayerHud/HpBars/"
            + (unit.faction === 1 ? "ally" : "enemy") + (unit.position - 1)));
    }

    /** 同时断言模型和血条尚未可见，父容器隐藏也属于有效隐藏。 */
    public assertHidden(): void {
        assert(this.models.every(value => !value.activeInHierarchy || value.getComponent(UIOpacity)!.opacity === 0),
            "正式资源/出场特效60%前不能先露模型");
        assert(this.hpRows().every(value => !value.activeInHierarchy), "渐入结束前不能先露血条");
        assert.equal(this.playbackStarts.length, 0, "出场尚未完成不能进入战报");
    }

    /** 销毁用例根并恢复所有方法；不让此专项修改其他套件的替身或配置。 */
    public dispose(): void {
        this.parent.destroy();
        this.releaseResources();
        BattlePageUtils.mountBattlePrefab = this.originals.mount;
        BattleReplayUtils.parse = this.originals.parse;
        ResourceAssetsUtils.forNode = this.originals.resources;
        BattleSpineService.instance.mountBattleSpine = this.originals.spine;
        BattleSpineService.instance.mountNamedSpine = this.originals.namedSpine;
        ViewportLayoutUtils.bindVisibleRefresh = this.originals.viewport;
        BattleReplayPlayer.prototype.play = this.originals.play;
        GameLog.shared.classified = this.originals.log;
    }
}

/** 双边帧和模型尚未返回也应开始播 ZDKS；及时返回时继续沿原70%出场和60%渐入。 */
async function checkOrdering(): Promise<void> {
    OpeningClockRuntime.reset();
    const fixture = new OpeningFixture(true);
    let close: (() => void) | undefined;
    let openError: unknown;
    const opening = fixture.open().then(value => { close = value; }, error => { openError = error; });
    try {
        await OpeningClockRuntime.flush();
        if (openError) {
            throw openError;
        }
        assert(fixture.loaded.includes("battle/ui/battle-appear-right_14/spriteFrame"), "必须阻断真实资源入口");
        assert.equal(fixture.models.length, fixture.roster.length, "首个单位骨骼未完成时其余单位应已发起加载");
        fixture.assertHidden();
        assert.deepEqual(fixture.zdksStarts, [0], "出场帧和首个模型慢载不能拖住 ZDKS 的首帧");
        fixture.releaseResources();
        await OpeningClockRuntime.flush();
        assert.deepEqual(fixture.zdksStarts, [0]);
        await OpeningClockRuntime.advance(0.699);
        fixture.assertHidden();
        assert.equal(fixture.effects().length, 0);
        await OpeningClockRuntime.advance(0.001);
        assert.equal(fixture.effects().length, 4, "双方四个出场特效同时开始，不能逐单位或逐边串行");
        fixture.assertHidden();
        const paths = fixture.effects().map(value => (value.getComponent(Sprite)!.spriteFrame as any).testPath);
        assert(paths.some(path => path.includes("appear-left_0/")) && paths.some(path => path.includes("appear-right_0/")));
        await OpeningClockRuntime.advance(0.449);
        fixture.assertHidden();
        assert.equal(fixture.effects().length, 4);
        await OpeningClockRuntime.advance(0.001);
        fixture.assertHidden();
        assert.equal(fixture.fadeStarts.length, 4);
        assert(fixture.fadeStarts.every(value => Math.abs(value.at - 1.15) < 1e-6));
        await OpeningClockRuntime.advance(0.001);
        assert(fixture.models.every(value => Math.abs(value.getComponent(UIOpacity)!.opacity - 0.255) < 1e-6),
            ".45秒触发后1毫秒应精确推进1秒渐入的千分之一，不能等FX结束或按单位串行");
        assert.equal(fixture.effects().length, 4, "模型渐入开始时双方FX仍在播放");
        assert(fixture.hpRows().every(value => !value.activeInHierarchy));
        assert.equal(fixture.playbackStarts.length, 0);
        await OpeningClockRuntime.advance(0.298);
        assert.equal(fixture.effects().length, 4, "最后一帧应保留自身0.05秒，不提前删除");
        await OpeningClockRuntime.advance(0.001);
        assert.equal(fixture.effects().length, 0, "两边FX完整播放.75秒后移除，不延长或裁帧");
        assert(fixture.models.every(value => {
            const opacity = value.getComponent(UIOpacity)!.opacity;
            return opacity > 0 && opacity < 255;
        }), "FX结束时所有模型仍处于从60%时点开始的渐入过程");
        assert(fixture.hpRows().every(value => !value.activeInHierarchy));
        assert.equal(fixture.playbackStarts.length, 0);
        await OpeningClockRuntime.advance(0.699);
        assert(fixture.models.every(value => value.getComponent(UIOpacity)!.opacity < 255));
        assert(fixture.hpRows().every(value => !value.activeInHierarchy));
        assert.equal(fixture.playbackStarts.length, 0, "1秒渐入仍差1毫秒时不能提前开始战报");
        await OpeningClockRuntime.advance(0.001);
        await opening;
        if (openError) {
            throw openError;
        }
        assert(fixture.models.every(value => value.getComponent(UIOpacity)!.opacity === 255));
        assert(fixture.hpRows().every(value => value.activeInHierarchy));
        assert.equal(fixture.playbackStarts.length, 1);
        assert(Math.abs(fixture.playbackStarts[0] - 2.15) < 1e-6, "正式阶段在开始轨道70%即.7秒接出场，再等待max(.75,.45+1)秒");
        assert.deepEqual(fixture.errors, []);
        close!();
        await OpeningClockRuntime.flush();
        assert.equal(OpeningClockRuntime.pending(), 0);
    } finally {
        fixture.dispose();
    }
}

/** ZDKS 整段播完时双方尚未加载好，应等待真实资源，再完整播放出场和渐入。 */
async function checkLateActors(): Promise<void> {
    OpeningClockRuntime.reset();
    const fixture = new OpeningFixture(true);
    let close: (() => void) | undefined;
    const opening = fixture.open().then(result => { close = result; });
    try {
        await OpeningClockRuntime.advance(1.1);
        assert.deepEqual(fixture.zdksStarts, [0]);
        assert.equal(fixture.effects().length, 0);
        fixture.assertHidden();
        fixture.releaseResources();
        await OpeningClockRuntime.advance(0);
        assert.equal(fixture.effects().length, fixture.roster.length, "双方资源到齐后直接进入出场");
        await OpeningClockRuntime.advance(1.451);
        await opening;
        assert.equal(fixture.playbackStarts.length, 1);
    } finally {
        close?.();
        fixture.dispose();
        OpeningClockRuntime.reset();
    }
}

/** 延迟第二招的冰冻材质，验证整组在技能边界等待，以及加载失败和关场后迟到失败的处理。 */
async function checkColdSkill(outcome: "ready" | "failed" | "closed"): Promise<void> {
    OpeningClockRuntime.reset();
    const sample = (kind: BattleReplayStep["kind"], configId: number) => ({
        kind, configId, sourceId: 1, targetId: 3, round: 1,
        hpByUnit: { 1: 10, 2: 10, 3: 7, 4: 10 },
    });
    const fixture = new OpeningFixture(false, false, [
        sample("skill.begin", 1), sample("presentation", 5061201), sample("skill.end", 1),
        sample("skill.begin", 2), sample("presentation", 4041101),
        { ...sample("damage", 1011401), actualHpChange: -3, reportedHpChange: -3, dead: false },
        { ...sample("buff.upsert", 2051301), buffInstanceId: "ice", expiresAtRound: 3 },
        sample("skill.end", 2),
    ]);
    fixture.useReplayPlayer();
    fixture.delayedPath = "effects/legacy-frozen";
    let close: (() => void) | undefined;
    const opening = fixture.open().then(result => { close = result; });
    try {
        await OpeningClockRuntime.advance(0.5);
        assert.deepEqual(fixture.zdksStarts, [0]);
        assert(!fixture.loaded.includes("effects/legacy-frozen"), "出场时第二招不应与第一招抢加载");
        await OpeningClockRuntime.advance(5.5);
        assert.equal(fixture.playbackStarts.length, 1, "第二招的冰冻不阻塞第一招");
        assert(fixture.loaded.includes("effects/legacy-frozen"), "第二招已实际请求慢资源");
        assert(fixture.actorActions.includes("attack3"), "第一招的原地施法已播放");
        assert(!fixture.actorActions.includes("attack2") && !fixture.actorActions.includes("hit"),
            "第二招的动作、伤害和冰冻必须在同一技能边界等待");
        await opening;
        if (outcome === "closed") {
            close!();
        }
        if (outcome === "ready") {
            fixture.releaseResources();
        } else {
            fixture.resource.reject(new Error("测试冰冻材质加载失败"));
        }
        await OpeningClockRuntime.advance(6);
        assert.equal(fixture.actorActions.includes("attack2"), outcome === "ready");
        assert.equal(fixture.actorActions.includes("hit"), outcome === "ready");
        if (outcome === "failed") {
            assert.equal(fixture.errors.length, 1);
            assert.match(fixture.errors[0], /测试冰冻材质加载失败/);
        } else {
            assert.deepEqual(fixture.errors, []);
        }
    } finally {
        close?.();
        fixture.dispose();
        OpeningClockRuntime.reset();
    }
}

/** 即使墙钟已过很久仍按暂停轨道等待70%；出场可重叠，但完整开始骨骼未结束不能开战。 */
async function checkActualSpineProgress(): Promise<void> {
    OpeningClockRuntime.reset();
    const fixture = new OpeningFixture(false, false, [], true);
    let close: (() => void) | undefined;
    let openError: unknown;
    const opening = fixture.open().then(value => { close = value; }, error => { openError = error; });
    try {
        await OpeningClockRuntime.flush();
        await OpeningClockRuntime.advance(10);
        fixture.assertHidden();
        assert.equal(fixture.effects().length, 0, "墙钟超过旧2.5秒也不能越过暂停的Spine进度");
        fixture.zdksTrackTime = 0.699999;
        director.emit(Director.EVENT_AFTER_UPDATE);
        await OpeningClockRuntime.flush();
        assert.equal(fixture.effects().length, 0, "真实轨道不足70%时不能提前出场");
        fixture.zdksTrackTime = 0.7;
        director.emit(Director.EVENT_AFTER_UPDATE);
        await OpeningClockRuntime.flush();
        assert.equal(fixture.effects().length, 4, "真实轨道达到70%即并行开始双边出场");
        assert(fixture.root.getChildByName("ChallengeOpeningEffect")?.isValid,
            "70%只放行人物出场，开始骨骼要保留完整播放，不在阈值处裁掉");
        const readsAtThreshold = fixture.zdksProgressReads;
        director.emit(Director.EVENT_AFTER_UPDATE);
        assert.equal(fixture.zdksProgressReads, readsAtThreshold, "达到70%后应立即解除每帧进度监听");
        await OpeningClockRuntime.advance(1.45);
        assert(fixture.models.every(value => value.getComponent(UIOpacity)!.opacity === 255));
        assert.equal(fixture.playbackStarts.length, 0, "人物完成但暂停的开始骨骼未结束，仍不得开战");
        fixture.completeZdks!();
        await OpeningClockRuntime.flush();
        await opening;
        if (openError) throw openError;
        assert.equal(fixture.playbackStarts.length, 1);
        assert(!fixture.root.getChildByName("ChallengeOpeningEffect")?.isValid);
        assert.deepEqual(fixture.errors, []);
        close!();
        await OpeningClockRuntime.flush();
        assert.equal(OpeningClockRuntime.pending(), 0);
    } finally {
        fixture.dispose();
    }
}

/** 每个FX等待额外延迟.02秒，真实第9帧完成前即使墙钟超过.45也不能渐入。 */
async function checkDelayedFrames(): Promise<void> {
    OpeningClockRuntime.reset();
    const fixture = new OpeningFixture();
    OpeningClockRuntime.delayDispatchOffset = (target, seconds) =>
        target === fixture.root && Math.abs(seconds - 0.05) < 1e-9 ? 0.02 : 0;
    let close: (() => void) | undefined;
    let openError: unknown;
    const opening = fixture.open().then(value => { close = value; }, error => { openError = error; });
    try {
        await OpeningClockRuntime.flush();
        if (openError) throw openError;
        await OpeningClockRuntime.advance(0.7);
        assert.equal(fixture.effects().length, 4);
        await OpeningClockRuntime.advance(0.45);
        fixture.assertHidden();
        assert.equal(fixture.fadeStarts.length, 0, "独立.45秒已到，但实际只完成6帧，不得提前开始渐入");
        assert(fixture.effects().every(value => (value.getComponent(Sprite)!.spriteFrame as any).testPath.includes("_6/")));
        await OpeningClockRuntime.advance(0.179);
        fixture.assertHidden();
        assert.equal(fixture.fadeStarts.length, 0);
        await OpeningClockRuntime.advance(0.001);
        assert.equal(fixture.fadeStarts.length, 4, "四单位分别在完整第9帧后开始，不能按首个单位提前放行");
        assert(fixture.fadeStarts.every(value => Math.abs(value.at - 1.33) < 1e-6));
        assert(fixture.fadeStarts.every(value => value.frames.length === 4
            && value.frames.every(path => path.includes("_9/"))), "开始渐入时已进入第10张图，之前9张的等待均已完成");
        await OpeningClockRuntime.advance(0.001);
        assert(fixture.models.every(value => Math.abs(value.getComponent(UIOpacity)!.opacity - 0.255) < 1e-6));
        await OpeningClockRuntime.advance(0.419);
        assert.equal(fixture.effects().length, 0, "15帧在附加调度下完整播放1.05秒，不能裁短追赶墙钟");
        assert(fixture.models.every(value => value.getComponent(UIOpacity)!.opacity > 0
            && value.getComponent(UIOpacity)!.opacity < 255));
        assert(fixture.hpRows().every(value => !value.activeInHierarchy));
        assert.equal(fixture.playbackStarts.length, 0);
        await OpeningClockRuntime.advance(0.579);
        assert.equal(fixture.playbackStarts.length, 0);
        await OpeningClockRuntime.advance(0.001);
        await opening;
        if (openError) throw openError;
        assert(Math.abs(fixture.playbackStarts[0] - 2.33) < 1e-6,
            "真正第9帧1.33秒后保留完整1秒渐入，不受独立.45秒计时影响");
        assert(fixture.hpRows().every(value => value.activeInHierarchy));
        assert.deepEqual(fixture.errors, []);
        close!();
        await OpeningClockRuntime.flush();
        assert.equal(OpeningClockRuntime.pending(), 0);
    } finally {
        OpeningClockRuntime.delayDispatchOffset = null;
        fixture.dispose();
    }
}

/** 覆盖资源、ZDKS、60%前/阈值、FX与渐入重叠以及仅渐入阶段，关页不能迟到露图或开战。 */
async function checkCancellation(): Promise<void> {
    for (const [phase, seconds] of [["resources", 0], ["zdks", 0.5], ["entry", 0.8],
        ["before-fade", 1.149], ["fade-threshold", 1.15], ["fx-and-fade", 1.3],
        ["fade-only", 1.7], ["before-ready", 2.149], ["delayed-frame-gate", 1.25]] as const) {
        OpeningClockRuntime.reset();
        const fixture = new OpeningFixture(phase === "resources");
        if (phase === "delayed-frame-gate") {
            OpeningClockRuntime.delayDispatchOffset = (target, seconds) =>
                target === fixture.root && Math.abs(seconds - 0.05) < 1e-9 ? 0.02 : 0;
        }
        let result: unknown = "pending";
        const opening = fixture.open().then(() => { result = "ready"; }, error => { result = error; });
        try {
            await OpeningClockRuntime.flush();
            await OpeningClockRuntime.advance(seconds);
            if (phase === "delayed-frame-gate") {
                fixture.assertHidden();
                assert.equal(fixture.fadeStarts.length, 0, "关闭时gate仍应等待真实第9帧");
            }
            if (phase === "fx-and-fade" || phase === "fade-only" || phase === "before-ready") {
                assert(fixture.models.every(value => {
                    const opacity = value.getComponent(UIOpacity)!.opacity;
                    return opacity > 0 && opacity < 255;
                }), phase + "必须确实处于渐入，不能只按测试名称认定阶段");
                assert.equal(fixture.effects().length, phase === "fx-and-fade" ? 4 : 0);
            }
            fixture.root.destroy();
            const readsAfterClose = fixture.zdksProgressReads;
            director.emit(Director.EVENT_AFTER_UPDATE);
            assert.equal(fixture.zdksProgressReads, readsAfterClose, phase + "关闭后不得遗留开始骨骼进度监听");
            fixture.completeZdks?.();
            if (phase === "resources") {
                await OpeningClockRuntime.flush();
                assert(result instanceof Error, "关闭时必须立即取消开场，不能等尚未到达的图片与模型");
            }
            fixture.releaseResources();
            await OpeningClockRuntime.flush();
            await OpeningClockRuntime.advance(100);
            await opening;
            assert(result instanceof Error, phase + "关闭应结束准备Promise，不得假开窗成功");
            assert.equal(fixture.playbackStarts.length, 0, phase + "取消后不能启动战报");
            assert.equal(fixture.effects().length, 0, phase + "迟到资源不能重建出场节点");
            if (phase === "delayed-frame-gate") assert.equal(fixture.fadeStarts.length, 0, "关闭释放gate不能迟到创建模型Tween");
            assert.equal(OpeningClockRuntime.pending(), 0, phase + "取消后所有Tween必须终止");
            assert.deepEqual(fixture.errors, [], phase + "正常取消不报播放错误");
        } finally {
            fixture.dispose();
        }
    }
}

/** 挂机仍从FX起点并行淡入，.75秒帧加原.25秒等待，不受正式60%时点影响。 */
async function checkIdleUnchanged(): Promise<void> {
    OpeningClockRuntime.reset();
    const fixture = new OpeningFixture(false, true);
    let close: (() => void) | undefined;
    let openError: unknown;
    const opening = fixture.open(true).then(value => { close = value; }, error => { openError = error; });
    try {
        await OpeningClockRuntime.flush();
        if (openError) {
            throw openError;
        }
        assert.equal(fixture.zdksStarts.length, 0);
        assert.equal(fixture.effects().length, 1);
        await OpeningClockRuntime.advance(0.1);
        const enemy = fixture.models[1];
        assert(Math.abs(enemy.getComponent(UIOpacity)!.opacity - 25.5) < 1e-6,
            "挂机仍在0时刻淡入，不能被正式.45秒等待延迟");
        await OpeningClockRuntime.advance(0.65);
        assert.equal(fixture.effects().length, 0);
        assert.equal(fixture.playbackStarts.length, 0);
        await OpeningClockRuntime.advance(0.25);
        await opening;
        if (openError) {
            throw openError;
        }
        assert.equal(enemy.getComponent(UIOpacity)!.opacity, 255);
        assert.equal(fixture.playbackStarts[0], 1);
        assert.deepEqual(fixture.errors, []);
        close!();
        await OpeningClockRuntime.flush();
        assert.equal(OpeningClockRuntime.pending(), 0);
    } finally {
        fixture.dispose();
    }
}

/** 直接调用真实状态显示，核对 HUD 跟随、实例循环、材质优先级和关场清理。 */
async function checkControlLifecycle(): Promise<void> {
    OpeningClockRuntime.reset();
    const step = (configId: number, instance: string, kind = "buff.upsert"): any => ({
        kind, configId, buffInstanceId: instance, sourceId: 1, targetId: 1, round: 1,
        expiresAtRound: 3, buffValue: 1, hpByUnit: { 1: 10, 2: 10, 3: 10, 4: 10 },
    });
    const fixture = new OpeningFixture(false, false,
        [2051301, 5011301, 1081501, 2141401, 2141301, 1081301].map(id => step(id, "preload-" + id)));
    let close: (() => void) | undefined;
    try {
        const opening = fixture.open().then(value => { close = value; });
        await OpeningClockRuntime.advance(4);
        await opening;
        assert(fixture.presentation, "必须取得真实Preview显示能力，不能只核描述符");
        const slot = fixture.models[0].parent!;
        const hpRow = fixture.child("LayerHud/HpBars/ally0");
        const row = hpRow.getChildByName("BuffRow")!;
        const skeleton = fixture.models[0].getComponent(sp.Skeleton) as any;
        const original = skeleton.customMaterial;
        const { rows } = GameConfig.instance.getFileByPath("config/buff") as { rows: { idx: number; delay: number }[] };
        /** 推进到真实配置的触发时点，再检查对应节点；移除没有额外延迟。 */
        const apply = async (configId: number, instance: string, remove = false) => {
            const pending = fixture.presentation!.play(step(configId, instance, remove ? "buff.remove" : "buff.upsert"));
            const delay = remove ? 0 : BattleAttackUtils.delaySeconds(rows.find(row => row.idx === configId)!);
            await OpeningClockRuntime.advance(delay / BattleInfoUtils.defaultTimeScale());
            await pending;
        };
        await apply(1081301, "invisible");
        assert.equal(row.active, false, "一次属性实例必须保留生命周期，但不能出现空Buff图标槽");
        for (const [config, name] of [[1081501, "SilenceEffect"], [2141401, "ParryEffect"]] as const) {
            await apply(config, "first");
            const effect = slot.getChildByName(name)!;
            assert(effect?.isValid);
            const firstPath = (effect.getComponent(Sprite)!.spriteFrame as any).testPath;
            await OpeningClockRuntime.advance(0.2);
            assert.notEqual((effect.getComponent(Sprite)!.spriteFrame as any).testPath, firstPath,
                "持续效果必须循环原帧，不能停在第0帧");
            await apply(config, "second");
            assert.equal(slot.children.filter(value => value.name === name).length, 1);
            await apply(config, "first", true);
            assert.equal(slot.getChildByName(name), effect, "只移除第一实例不能撤掉仍有效的共享效果");
            await apply(config, "second", true);
            assert.equal(effect.isValid, false);
        }
        await apply(2141301, "sleep");
        assert.equal(row.active, true, "深睡沿原状态图标展示");
        assert.equal(row.parent, hpRow, "状态图标随 HUD 血条绘制在所有模型上方");
        assert.equal(slot.getChildByPath("HeadAnchor/BuffRow"), null);
        const countLabel = row.getChildByPath("Buff_0/BuffLayerCount")!.getComponent(Label)!;
        assert.equal(countLabel.string, "1", "状态行继续显示真实实例层数");
        const slotTransform = slot.getComponent(UITransform)!;
        slotTransform.convertToWorldSpaceAR = point => new Vec3(point.x + slot.position.x, point.y + slot.position.y, 0);
        const originalPosition = slot.position.clone();
        slot.setPosition(37, 58, 0);
        director.emit(Director.EVENT_AFTER_UPDATE);
        assert.equal(hpRow.position.x, 37, "近身移动时 HUD 及其 Buff 一起跟随站位");
        assert.equal(hpRow.position.y, 178);
        slot.setPosition(originalPosition);
        director.emit(Director.EVENT_AFTER_UPDATE);
        const snapshot = step(2141301, "sleep", "round.ready");
        fixture.presentation!.restore({ ...snapshot, hpByUnit: { ...snapshot.hpByUnit, 1: 0 } });
        assert.equal(hpRow.active, false, "单位死亡时连同 Buff 一起隐藏");
        fixture.presentation!.restore(snapshot);
        assert.equal(hpRow.active, true, "恢复可见单位时只展示仍在的状态实例");
        assert(!slot.children.some(value => /sleep|zzz/i.test(value.name)), "旧源没有深睡动作，不发明额外帧");
        await apply(2141301, "sleep", true);
        await apply(2051301, "frozen");
        const frozen = skeleton.customMaterial;
        assert.equal(frozen.effectAsset.testPath, "effects/legacy-frozen");
        assert.equal(skeleton.paused, true);
        await apply(5011301, "stone");
        const stone = skeleton.customMaterial;
        assert.equal(stone.effectAsset.testPath, "effects/legacy-stone");
        await apply(5011301, "stone", true);
        assert.equal(skeleton.customMaterial, frozen, "解除后加入石化必须恢复仍有效的冰冻");
        await apply(2051301, "frozen", true);
        assert.equal(skeleton.customMaterial, original);
        assert.equal(skeleton.paused, false);
        await apply(5011301, "stone-again");
        await apply(1081501, "silence-open");
        await apply(2141401, "parry-open");
        const activeNodes = slot.children.filter(value => /SilenceEffect|ParryEffect/.test(value.name));
        close!();
        assert(activeNodes.every(value => !value.isValid));
        assert.equal(stone.isValid, false);
        assert.equal(frozen.isValid, false);
        assert.equal(skeleton.customMaterial, original, "关场前恢复借用材质");
        assert.equal(skeleton.paused, false);
        assert.equal(OpeningClockRuntime.pending(), 0, "关闭必须清所有持续循环等待");
        await fixture.presentation!.play(step(1081501, "late"));
        await OpeningClockRuntime.advance(5);
        assert.equal(OpeningClockRuntime.pending(), 0, "迟到显示不能新建Tween或持续节点");
        assert.deepEqual(fixture.errors, []);
    } finally {
        close?.();
        fixture.dispose();
        OpeningClockRuntime.reset();
    }
}

/** 执行真实Preview伤害回调，验证群攻双节点、自然收尾及关闭取消的生命周期。 */
async function checkBattleNumbers(): Promise<void> {
    OpeningClockRuntime.reset();
    const step = (targetId: number, reportedHpChange: number, activeSkillDamage: boolean): any => ({
        kind: "damage", configId: 1011401, sourceId: 1, targetId, round: 1,
        actualHpChange: -3, reportedHpChange, activeSkillDamage, dead: false,
        hpByUnit: { 1: 10, 2: 10, 3: 7, 4: 7 },
    });
    const hits = [step(3, -8, true), step(4, -5, false)];
    const fixture = new OpeningFixture(false, false, hits);
    let close: (() => void) | undefined;
    try {
        const opening = fixture.open().then(value => { close = value; });
        await OpeningClockRuntime.advance(4);
        await opening;
        const present = fixture.presentation!;
        assert(present, "必须使用真实Preview表现入口");
        fixture.models[2].parent!.setPosition(-150, 20, 0);
        fixture.models[3].parent!.setPosition(130, 50, 0);
        const root = fixture.child("LayerFloat/FloatDamageRoot");
        const active = () => root.children.filter(child => child.name === "BattleHealthFloat");

        const played = Promise.all(hits.map(hit => present.play(hit)));
        await OpeningClockRuntime.advance(0);
        const [first, second] = active();
        assert.equal(active().length, 2, "同时命中两个目标，应生成两份数字节点");
        assert.notEqual(first.position.x, second.position.x, "数字必须使用两个真实目标的站位");
        assert.deepEqual(active().map(child => child.getComponent(Label)!.string), ["-8", "-5"]);
        assert.deepEqual(active().map(child => (child.getComponent(Label)!.font as any).testPath),
            ["font/blue-73", "font/yellow-73"]);
        const startY = first.position.y;
        await OpeningClockRuntime.advance(0.1);
        assert(first.position.y > startY && second.position.y > startY, "两份数字都按生产轨迹弹起");
        await OpeningClockRuntime.advance(0.2);
        await played;
        let finished = false;
        const finishing = present.finish!().then(() => { finished = true; });
        await OpeningClockRuntime.advance(0.5);
        assert(!finished && active().length === 2, "受击动作完成后，末次数字仍应继续播完");
        assert(first.getComponent(UIOpacity)!.opacity < 255, "末段数字渐隐");
        await OpeningClockRuntime.advance(0.3);
        assert(finished, "最后一份数字退出时应解除正常结算等待");
        await finishing;
        assert.equal(active().length, 0, "最后一份数字退出以后才完成播放");

        const secondWave = Promise.all(hits.map(hit => present.play(hit)));
        await OpeningClockRuntime.advance(0);
        assert.equal(active().length, 2);
        let cleared = false;
        const cancelled = present.finish!().then(() => { cleared = true; });
        close!();
        await OpeningClockRuntime.flush();
        assert(cleared, "关闭后应立即解除末次数字的等待");
        await Promise.all([cancelled, secondWave]);
        assert.equal(active().length, 0, "关场立即销毁两份未完成数字");
        assert.equal(OpeningClockRuntime.pending(), 0, "被关闭的战场不能残留数字Tween");
        assert.deepEqual(fixture.errors, []);
    } finally {
        close?.();
        fixture.dispose();
        OpeningClockRuntime.reset();
    }
}

/** 执行两位守军的原地施法，确认零等待和定长等待的战报段都交由骨骼完成回待机。 */
async function checkStationaryCast(): Promise<void> {
    OpeningClockRuntime.reset();
    const steps: BattleReplayStep[] = [5061201, 4041101].map(configId => ({
        kind: "presentation", configId, sourceId: 1, targetId: 3, round: 1,
        skillLevel: null, skillType: null, actualHpChange: null, reportedHpChange: null, dead: null,
        buffInstanceId: null, expiresAtRound: null, buffValue: null, removalReason: null,
        hpByUnit: { 1: 10, 2: 10, 3: 10, 4: 10 },
    }));
    const fixture = new OpeningFixture(false, false, steps);
    let close: (() => void) | undefined;
    try {
        const opening = fixture.open().then(value => { close = value; });
        await OpeningClockRuntime.advance(4);
        await opening;
        const actionsBeforeCast = fixture.actorActions.length;
        for (const step of steps) {
            const cast = fixture.presentation!.play(step);
            await OpeningClockRuntime.advance(2);
            await cast;
        }
        assert.deepEqual(fixture.actorActions.slice(actionsBeforeCast), ["attack3", "attack2"]);
        assert.deepEqual(fixture.errors, []);
    } finally {
        close?.();
        fixture.dispose();
        OpeningClockRuntime.reset();
    }
}

/** 复现旧标记早于投射到达、动作长于归位等待，以及切断战报的生命周期。 */
async function checkActionTiming(): Promise<void> {
    OpeningClockRuntime.reset();
    const shot = { kind: "presentation", configId: 1050100, sourceId: 1, targetId: 3, round: 1 } as BattleReplayStep;
    const hit = { ...shot, kind: "damage", configId: 1050200, reportedHpChange: -3,
        activeSkillDamage: false, hpByUnit: { 1: 10, 2: 10, 3: 7, 4: 10 } } as BattleReplayStep;
    const melee = { ...shot, configId: 1010100 };
    const fixture = new OpeningFixture(false, false, [shot, hit, melee]);
    const scale = BattleInfoUtils.defaultTimeScale();
    let close: (() => void) | undefined;
    try {
        const opening = fixture.open().then(value => { close = value; });
        await OpeningClockRuntime.advance(4);
        await opening;
        const present = fixture.presentation!;
        const source = fixture.models[0].parent!;
        fixture.models[2].parent!.setPosition(-150, 20, 0);
        const floats = fixture.child("LayerFloat/FloatDamageRoot");
        const numbers = () => floats.children.filter(child => child.name === "BattleHealthFloat");
        present.prepareSkill!([shot, hit]);
        const projectile = Promise.all([present.play(shot), present.play(hit)]);
        await OpeningClockRuntime.advance(0.72 / scale);
        assert.equal(numbers().length, 0, "过了旧 40 帧标记，投射未到不能提前扣血和弹伤害");
        await OpeningClockRuntime.advance(0.12 / scale);
        assert.deepEqual(fixture.errors, []);
        assert.equal(numbers().length, 1, "投射到达后显示本次伤害");
        await OpeningClockRuntime.advance(1);
        await projectile;

        const skeleton = fixture.models[0].getComponent(sp.Skeleton)!;
        Object.assign(skeleton, { getCurrent: () => ({ animationStart: 0, animationEnd: 2.3 }) });
        const origin = source.position.clone();
        present.prepareSkill!([melee]);
        const cast = present.play(melee);
        await OpeningClockRuntime.advance(1.4 / scale);
        assert.notEqual(source.position.x, origin.x, "配置等待结束后骨骼仍在动作，不能先归位");
        await OpeningClockRuntime.advance(1.2 / scale);
        await cast;
        assert.deepEqual(source.position, origin, "骨骼动作结束后才完成归位");

        let next = false;
        const interval = present.play({ ...melee, kind: "skill.end" }).then(() => { next = true; });
        await OpeningClockRuntime.advance(0.49 / scale);
        assert.equal(next, false, "出手之间保留旧版半秒停顿");
        await OpeningClockRuntime.advance(0.02 / scale);
        await interval;

        const nextHit = { ...hit };
        present.prepareSkill!([shot, nextHit]);
        const pending = Promise.all([present.play(shot), present.play(nextHit)]);
        await OpeningClockRuntime.advance(0.72 / scale);
        close!();
        await OpeningClockRuntime.flush();
        await pending;
        assert.equal(OpeningClockRuntime.pending(), 0, "中途关闭应释放尚未到达的命中等待");
        assert.equal(numbers().length, 0, "关场不补弹伤害");
        assert.deepEqual(fixture.errors, []);
    } finally {
        close?.();
        fixture.dispose();
        OpeningClockRuntime.reset();
    }
}

/** 使用真实配置完成出场、施法、持续控制和飘字回归；不运行玩家服务或实际战斗。 */
async function main(): Promise<void> {
    await ConfigFixtureUtils.installReal();
    await checkOrdering();
    await checkLateActors();
    await checkColdSkill("ready");
    await checkColdSkill("failed");
    await checkColdSkill("closed");
    await checkActualSpineProgress();
    await checkDelayedFrames();
    await checkCancellation();
    await checkIdleUnchanged();
    await checkControlLifecycle();
    await checkBattleNumbers();
    await checkStationaryCast();
    await checkActionTiming();
    OpeningClockRuntime.reset();
    console.log("PASS 正式出场与控制；群攻双飘字独立落点、正确字库、轨迹渐隐、正常收尾与关闭清理");
}

/** 手动时钟卡住时 Promise 不会维持 Node 进程，必须把提前退出标成失败。 */
function incomplete(): void {
    if (!process.exitCode) {
        console.error("战斗专项存在未完成的手动时钟等待");
        process.exitCode = 1;
    }
}
process.once("beforeExit", incomplete);
void main().then(() => process.off("beforeExit", incomplete)).catch(error => {
    console.error(error);
    process.exitCode = 1;
});
