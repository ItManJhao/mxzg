/**
 * 正式战斗出场时序专项：直接执行BattleReplayPreview.open，控制真实资源入口和cc动画时钟。
 * 验证加载隐藏、双边并行出场、随后渐入、血条及战报启动，以及各阶段关闭后的迟到隔离。
 * 节点/骨骼不渲染，战报执行只记录是否启动；不能替代Creator实际特效和机型验收。
 */
import { strict as assert } from "node:assert";
import { Button, Label, Node, sp, Sprite, SpriteFrame, UIOpacity, UITransform, Vec3 } from "cc";
import { OpeningClockRuntime } from "./OpeningClockRuntime";
import { ConfigFixtureUtils } from "./ConfigFixtureUtils";
import { GameLog } from "../assets/scripts/core/GameLog";
import { ResourceAssetsUtils } from "../assets/scripts/framework/assets/ResourceAssetsUtils";
import { ViewportLayoutUtils } from "../assets/scripts/framework/ui/ViewportLayoutUtils";
import { BattleReplayPlayer } from "../assets/scripts/features/battle/BattleReplayPlayer";
import { BattlePageUtils } from "../assets/scripts/features/battle/ui/BattlePageUtils";
import { BattleReplayPreview } from "../assets/scripts/features/battle/ui/BattleReplayPreview";
import { BattleSpineService } from "../assets/scripts/features/battle/ui/BattleSpineService";
import { BattleReplayUtils } from "../assets/scripts/features/battle/utils/BattleReplayUtils";

/** 本专项只需控制资源完成，不保存另一份出场流程。 */
function deferred(): { promise: Promise<void>; resolve(): void } {
    let resolve!: () => void;
    const promise = new Promise<void>(done => { resolve = done; });
    return { promise, resolve };
}

/** 创建具备已知挂点和恒等坐标转换的节点；不模拟真实排版或绘制。 */
function node(name: string, parent?: Node): Node {
    const value = new Node(name);
    (value as any).position = new Vec3();
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
    /** 资源门闩只拦最后一张敌方出场帧，覆盖揭开战场前的异步空档。 */
    public readonly resource = deferred();
    /** 用例根节点，销毁它触发生产Preview自己的取消与清理。 */
    public readonly parent = node("OpeningTestRoot");
    /** 真实Preview挂载的战场节点，保存生产需要的静态挂点。 */
    public readonly root = node("OpeningBattlePage", this.parent);
    /** 当前资源请求路径，不参与业务决策。 */
    public readonly loaded: string[] = [];
    /** 被生产挂入的模型节点，检查其真实可见性和透明度。 */
    public readonly models: Node[] = [];
    /** 记录ZDKS开始时钟，不伪造动画结束事件。 */
    public readonly zdksStarts: number[] = [];
    /** 记录真实Preview何时调用战报入口；不在此模拟战报逻辑。 */
    public readonly playbackStarts: number[] = [];
    /** 生产分类日志中收集的错误，防止取消被误报为播放失败。 */
    public readonly errors: string[] = [];
    /** 资源门闩是否阻断；用例放行后不重新阻断其他请求。 */
    private blocked: boolean;
    /** 保存被替换的边界方法，用例后按原引用恢复。 */
    private readonly originals = {
        mount: BattlePageUtils.mountBattlePrefab,
        decode: BattleReplayUtils.decode,
        units: BattleReplayUtils.units,
        names: BattleReplayUtils.names,
        resources: ResourceAssetsUtils.forNode,
        spine: BattleSpineService.instance.mountBattleSpine,
        namedSpine: BattleSpineService.instance.mountNamedSpine,
        viewport: ViewportLayoutUtils.bindVisibleRefresh,
        play: BattleReplayPlayer.prototype.play,
        log: GameLog.shared.classified,
    };

    /** 构造静态挂点并替换外部边界；生产出场和关闭逻辑保持原实现。 */
    public constructor(blockResource = false) {
        this.blocked = blockResource;
        const child = (path: string): Node => this.child(path);
        child("IdleLayout/ModelScale");
        child("IdleLayout/HpOffset");
        for (const side of ["ally", "enemy"]) {
            for (let index = 0; index < 8; index++) {
                const slot = child("LayerField/" + side + "/Slot" + index);
                const row = child("LayerHud/HpBars/" + side + index);
                node("Label", row).addComponent(Label);
                node("Fill", row).addComponent(Sprite);
                node("ElementIcon", row).addComponent(Sprite);
                const buffs = this.child(slot.getPathInHierarchy().split("OpeningBattlePage/")[1] + "/HeadAnchor/BuffRow");
                for (let chip = 0; chip < 3; chip++) {
                    node("Buff_" + chip, buffs).addComponent(Sprite);
                }
            }
        }
        for (const path of ["LayerHud/MatchInfo/AllyNameLabel", "LayerHud/MatchInfo/EnemyNameLabel",
            "LayerHud/BtnSkip/Label", "LayerHud/Log"]) {
            child(path).addComponent(Label);
        }
        child("LayerHud/TopBar/BtnSpeed").addComponent(Button);
        child("LayerHud/TopBar/BtnClose");
        child("LayerHud/ChapterMatchInfoAnchor");
        child("LayerHud/ChapterTopBarAnchor");
        child("LayerHud/MatchInfo");
        child("LayerHud/BtnRetreat");
        child("LayerAppear");
        child("LayerHud/SkillBars");
        child("LayerVfx/VfxScreen/DimOverlay").addComponent(UIOpacity);
        const shell = {
            root: this.root,
            layerField: child("LayerField"),
            logLabel: child("LayerHud/Log"),
            slot: (side: string, index: number) => child("LayerField/" + side + "/Slot" + index),
            hpLabel: (side: string, index: number) => child("LayerHud/HpBars/" + side + index + "/Label"),
            bindSkip: () => {},
            bindRetreat: () => {},
            bindClose: () => {},
        };
        BattlePageUtils.mountBattlePrefab = async () => shell as any;
        BattleReplayUtils.decode = () => [];
        BattleReplayUtils.units = () => units as any;
        BattleReplayUtils.names = () => ({ attacker: "测试甲", defender: "测试乙" });
        ResourceAssetsUtils.forNode = () => ({
            loadPath: async (path: string) => {
                this.loaded.push(path);
                if (this.blocked && path === "battle/ui/battle-appear-right_14/spriteFrame") {
                    await this.resource.promise;
                }
                return Object.assign(new SpriteFrame(), { testPath: path });
            },
            dispose: () => {},
        }) as any;
        BattleSpineService.instance.mountBattleSpine = (slot: Node, _stem: string, _fail: () => void, options: any) => {
            const actorNode = node("Model", slot);
            actorNode.addComponent(sp.Skeleton);
            this.models.push(actorNode);
            const actor = { node: actorNode, play: () => {}, gesture: () => true };
            void Promise.resolve().then(options.onReady);
            return actor as any;
        };
        BattleSpineService.instance.mountNamedSpine = (_host, stem, _clip, options) => {
            assert.equal(stem, "ZDKS");
            this.zdksStarts.push(OpeningClockRuntime.now);
            void Promise.resolve().then(() => options?.onReady?.());
        };
        ViewportLayoutUtils.bindVisibleRefresh = () => () => {};
        const starts = this.playbackStarts;
        BattleReplayPlayer.prototype.play = async () => {
            starts.push(OpeningClockRuntime.now);
            return false;
        };
        GameLog.shared.classified = (_layer, severity, _source, message) => {
            if (severity === "error") {
                this.errors.push(String(message));
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

    /** 放行唯一受控资源，重复调用无额外作用。 */
    public releaseResources(): void {
        this.blocked = false;
        this.resource.resolve();
    }

    /** 调用真实正式入口，使用onCompleted隔离本专项不涉及的结算装配。 */
    public open(): Promise<() => void> {
        return BattleReplayPreview.open(this.parent, new Uint8Array(), false, undefined,
            undefined, undefined, true, async () => {});
    }

    /** 返回真实出场节点，仅按业务节点名定位而不读取生产源码文字。 */
    public effects(): Node[] {
        return units.flatMap(unit => {
            const side = unit.faction === 1 ? "ally" : "enemy";
            const slot = this.root.getChildByPath("LayerField/" + side + "/Slot" + (unit.position - 1));
            return slot ? slot.children.filter(value => value.name.endsWith("AppearEffect") && value.isValid) : [];
        });
    }

    /** 返回本关真实使用的四条血条，其他空槽不计。 */
    public hpRows(): Node[] {
        return units.map(unit => this.child("LayerHud/HpBars/"
            + (unit.faction === 1 ? "ally" : "enemy") + (unit.position - 1)));
    }

    /** 同时断言模型和血条尚未可见，父容器隐藏也属于有效隐藏。 */
    public assertHidden(): void {
        assert(this.models.every(value => !value.activeInHierarchy || value.getComponent(UIOpacity)!.opacity === 0),
            "正式资源/出场特效期间不能先露模型");
        assert(this.hpRows().every(value => !value.activeInHierarchy), "渐入结束前不能先露血条");
        assert.equal(this.playbackStarts.length, 0, "出场尚未完成不能进入战报");
    }

    /** 销毁用例根并恢复所有方法；不让此专项修改其他套件的替身或配置。 */
    public dispose(): void {
        this.parent.destroy();
        this.releaseResources();
        BattlePageUtils.mountBattlePrefab = this.originals.mount;
        BattleReplayUtils.decode = this.originals.decode;
        BattleReplayUtils.units = this.originals.units;
        BattleReplayUtils.names = this.originals.names;
        ResourceAssetsUtils.forNode = this.originals.resources;
        BattleSpineService.instance.mountBattleSpine = this.originals.spine;
        BattleSpineService.instance.mountNamedSpine = this.originals.namedSpine;
        ViewportLayoutUtils.bindVisibleRefresh = this.originals.viewport;
        BattleReplayPlayer.prototype.play = this.originals.play;
        GameLog.shared.classified = this.originals.log;
    }
}

/** 验证真实入口的资源门闩、并行双边帧、渐入与HP/战报启动顺序。 */
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
        fixture.assertHidden();
        assert.equal(fixture.zdksStarts.length, 0, "全部出场资源就绪前不启动正式开场");
        fixture.releaseResources();
        await OpeningClockRuntime.flush();
        assert.deepEqual(fixture.zdksStarts, [0]);
        await OpeningClockRuntime.advance(2.499);
        fixture.assertHidden();
        assert.equal(fixture.effects().length, 0);
        await OpeningClockRuntime.advance(0.001);
        assert.equal(fixture.effects().length, 4, "双方四个出场特效同时开始，不能逐单位或逐边串行");
        fixture.assertHidden();
        const paths = fixture.effects().map(value => (value.getComponent(Sprite)!.spriteFrame as any).testPath);
        assert(paths.some(path => path.includes("appear-left_0/")) && paths.some(path => path.includes("appear-right_0/")));
        await OpeningClockRuntime.advance(0.749);
        fixture.assertHidden();
        assert.equal(fixture.effects().length, 4, "最后一帧应保留自身0.05秒，不提前删除");
        await OpeningClockRuntime.advance(0.001);
        assert.equal(fixture.effects().length, 0, "两边出场帧都结束后才进入渐入");
        fixture.assertHidden();
        await OpeningClockRuntime.advance(0.5);
        assert(fixture.models.every(value => {
            const opacity = value.getComponent(UIOpacity)!.opacity;
            return opacity > 0 && opacity < 255;
        }), "所有模型应同时处于1秒渐入中途");
        assert(fixture.hpRows().every(value => !value.activeInHierarchy));
        assert.equal(fixture.playbackStarts.length, 0);
        await OpeningClockRuntime.advance(0.5);
        await opening;
        if (openError) {
            throw openError;
        }
        assert(fixture.models.every(value => value.getComponent(UIOpacity)!.opacity === 255));
        assert(fixture.hpRows().every(value => value.activeInHierarchy));
        assert.equal(fixture.playbackStarts.length, 1);
        assert(Math.abs(fixture.playbackStarts[0] - 4.25) < 1e-6, "正式阶段耗时由并行.75和并行1秒组成");
        assert.deepEqual(fixture.errors, []);
        close!();
        await OpeningClockRuntime.flush();
        assert.equal(OpeningClockRuntime.pending(), 0);
    } finally {
        fixture.dispose();
    }
}

/** 分别在资源、ZDKS、出场帧、渐入中关页，迟到完成不得继续露图或启动战报。 */
async function checkCancellation(): Promise<void> {
    for (const [phase, seconds] of [["resources", 0], ["zdks", 0.5], ["entry", 2.6], ["fade", 3.5]] as const) {
        OpeningClockRuntime.reset();
        const fixture = new OpeningFixture(phase === "resources");
        let result: unknown = "pending";
        const opening = fixture.open().then(() => { result = "ready"; }, error => { result = error; });
        try {
            await OpeningClockRuntime.flush();
            await OpeningClockRuntime.advance(seconds);
            fixture.root.destroy();
            fixture.releaseResources();
            await OpeningClockRuntime.flush();
            await OpeningClockRuntime.advance(100);
            await opening;
            assert(result instanceof Error, phase + "关闭应结束准备Promise，不得假开窗成功");
            assert.equal(fixture.playbackStarts.length, 0, phase + "取消后不能启动战报");
            assert.equal(fixture.effects().length, 0, phase + "迟到资源不能重建出场节点");
            assert.equal(OpeningClockRuntime.pending(), 0, phase + "取消后所有Tween必须终止");
            assert.deepEqual(fixture.errors, [], phase + "正常取消不报播放错误");
        } finally {
            fixture.dispose();
        }
    }
}

/** 使用真实配置完成两个行为场景，再清理配置与时钟；不运行玩家服务或实际战斗。 */
async function main(): Promise<void> {
    await ConfigFixtureUtils.installReal();
    await checkOrdering();
    await checkCancellation();
    OpeningClockRuntime.reset();
    console.log("PASS 正式出场：真实Preview资源隐藏、双边并行帧→并行渐入→HP/战报，以及四阶段关闭迟到隔离");
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
