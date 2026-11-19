/**
 * 战报统计和只读详情的叠窗生命周期检查：生产UIManager、父View交互和子View关闭链共同运行。
 * 资源完成时机由夹具控制，检查迟到加载、单实例接管、监听及原资源池计数；不连接玩家服务。
 * 节点仅提供生产方法依赖的绑定，列表数据口不模拟几何；长等待由受控Promise表示，不冒称真实断线时长。
 */
import { strict as assert } from "node:assert";
import { assetManager, AudioSource, Button, Label, Node, Prefab, ScrollView, Sprite, SpriteFrame, Tween, UITransform, UIOpacity, Vec3 } from "cc";
import { ConfigFixtureUtils } from "./ConfigFixtureUtils";
import { EventDispatcher } from "../assets/scripts/framework/EventDispatcher";
import { UIManager } from "../assets/scripts/framework/ui/UIManager";
import { UIRegistry } from "../assets/scripts/framework/ui/UIRegistry";
import { BaseView } from "../assets/scripts/framework/ui/BaseView";
import { ResourceAssetsUtils } from "../assets/scripts/framework/assets/ResourceAssetsUtils";
import { ResourcePool } from "../assets/scripts/framework/assets/ResourcePool";
import { ChapterEndView } from "../assets/scripts/features/battle/ui/ChapterEndView";
import { MainChapterBattleView } from "../assets/scripts/features/battle/ui/MainChapterBattleView";
import { BattleReplayUtils } from "../assets/scripts/features/battle/utils/BattleReplayUtils";
import { BattleReplayPreview } from "../assets/scripts/features/battle/ui/BattleReplayPreview";
import { BattlePageUtils } from "../assets/scripts/features/battle/ui/BattlePageUtils";
import { MainChapterController } from "../assets/scripts/features/battle/MainChapterController";
import { BattleDetailLayer } from "../assets/scripts/features/battle/ui/BattleDetailLayer";
import { BagInfoView } from "../assets/scripts/features/bag/ui/BagInfoView";
import { BagItemCatalog } from "../assets/scripts/features/bag/utils/BagItemCatalog";
import { RewardView } from "../assets/scripts/features/reward/ui/RewardView";
import { HeroIconCellView } from "../assets/scripts/features/hero/ui/HeroIconCellView";

/** 只控制原资源Promise的完成时机，不替代被测关闭或开窗算法。 */
function deferred<T>(): { promise: Promise<T>; resolve(value: T): void; reject(error: Error): void } {
    let resolve!: (value: T) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<T>((done, fail) => {
        resolve = done;
        reject = fail;
    });
    return { promise, resolve, reject };
}

/** 排空有界微任务，失败即报告未达预期，不使用无限等待。 */
async function until(check: () => boolean, message: string): Promise<void> {
    for (let index = 0; index < 100; index++) {
        if (check()) {
            return;
        }
        await Promise.resolve();
    }
    assert.fail(message);
}

/** 让关窗和资源续段全部完成，再判断是否发生迟到重开。 */
async function flush(): Promise<void> {
    for (let index = 0; index < 30; index++) {
        await Promise.resolve();
    }
}

/** 构造具备普通UITransform的绑定节点，不模拟真实Prefab位置。 */
function node(name: string, parent?: Node): Node {
    const value = new Node(name);
    value.addComponent(UITransform);
    if (parent) {
        value.parent = parent;
    }
    return value;
}

/** 统计绑定按钮的原回调数量；引擎替身保留原listener身份。 */
function buttonListeners(button: Button): number {
    return ((button.node as any).listeners.get(Button.EventType.CLICK) || []).length;
}

/** 夹具只提供列表数据口；渲染几何与实际Cell Prefab另由现有专项和Creator确认。 */
function list(name: string, parent: Node): any {
    const root = node(name, parent);
    return { node: root, validateBindings: () => {}, toStart: () => {},
        list: { node: node("Content", root), explicitCellSize: { height: 134 }, setData: (_data: unknown) => {} } };
}

/** 真实BagInfoView使用最小静态绑定，仍执行生产onOpen/show/按钮及清理逻辑。 */
function infoFixture(): BagInfoView {
    const root = node("Info");
    const info = root.addComponent(BagInfoView);
    info.propName = node("Name", root).addComponent(Label);
    info.propType = node("Type", root).addComponent(Label);
    info.icon = node("Icon", root);
    info.icon.addComponent(Sprite);
    info.rare = node("Quality", root);
    info.rare.addComponent(Sprite);
    info.shardIcon = node("ShardIcon", root);
    info.shardIcon.addComponent(Sprite);
    info.shardCorner = node("ShardCorner", root);
    info.shardStars = Array.from({ length: 5 }, (_, index) => node("Star" + index, root));
    info.descriptionViewport = node("DescriptionViewport", root);
    info.descriptionScroll = node("DescriptionScroll", root).addComponent(ScrollView);
    info.detailLabel = node("DetailLabel", root).addComponent(Label);
    info.decomposeLabel = node("DecomposeLabel", root).addComponent(Label);
    info.emptyActionSpacer = node("EmptyActions", root);
    info.btnClose = node("CloseButton", root).addComponent(Button);
    info.btnEnter = node("ConfirmButton", root).addComponent(Button);
    return info;
}

/** 结算只替身美术prepare及引擎调度；生产onOpen、奖励选择、统计入口与onClose完整运行。 */
function chapterFixture(): ChapterEndView {
    const root = node("ChapterEnd");
    const value = root.addComponent(ChapterEndView) as any;
    value.panel = node("Panel", root);
    node("ConfirmButton", value.panel).addComponent(Button);
    value.victory = node("Victory", root);
    value.defeatWing = node("DefeatWing", root);
    value.defeatTitle = node("DefeatTitle", root);
    value.defeatContent = node("DefeatContent", root);
    value.readonlyNotice = node("ReadonlyNotice", root);
    value.readonlyNotice.addComponent(Label);
    value.closeHint = node("CloseHint", root).addComponent(Label);
    value.confetti = node("Confetti", root).addComponent(Sprite);
    value.rewardScroll = list("Rewards", root);
    value.unscheduleAllCallbacks = () => {};
    value.prepare = async () => {};
    return value;
}

/** 奖励窗仍走真实绑定、选择和关闭；纯美术准备立即完成，避免与资源专项重复。 */
function rewardFixture(): RewardView {
    const root = node("Reward");
    const value = root.addComponent(RewardView) as any;
    value.panel = node("Panel", root);
    value.panel.addComponent(UIOpacity);
    value.rewards = list("Rewards", root);
    value.titleEffect = node("Title", root).addComponent(Sprite);
    value.confetti = node("Confetti", root).addComponent(Sprite);
    value.emptyLabel = node("Empty", root).addComponent(Label);
    value.rewardAudio = root.addComponent(AudioSource);
    value.closeHint = node("CloseHint", value.panel);
    value.repeatButton = node("RepeatSummonButton", value.panel).addComponent(Button);
    value.confirmButton = node("ConfirmButton", value.panel).addComponent(Button);
    value.summonIntro = node("SummonIntro", root);
    value.summonBackdrop = node("Backdrop", value.summonIntro).addComponent(Sprite);
    value.summonEffects = node("Effects", value.summonIntro);
    node("Lizi", value.summonEffects);
    node("Shangcheng", value.summonEffects);
    value.prepare = async () => { value.finishOpen(); };
    return value;
}

/** 统计窗实际绘制冻结名称/行并登记关闭回调，列表只记录数据不测试布局。 */
function statisticsFixture(): BattleDetailLayer {
    const root = node("BattleDetail");
    const value = root.addComponent(BattleDetailLayer);
    value.panel = node("Panel", root);
    value.closeButton = node("CloseButton", root).addComponent(Button);
    value.attackerList = list("Attackers", root);
    value.defenderList = list("Defenders", root);
    value.attackerWin = node("AttackerWin", root);
    value.defenderWin = node("DefenderWin", root);
    value.missingNotice = node("MissingNotice", root).addComponent(Label);
    value.attackerName = node("AttackerName", root).addComponent(Label);
    value.defenderName = node("DefenderName", root).addComponent(Label);
    return value;
}

/** 对应一场只读历史战报，不触发网络或资产写入。 */
const report = Object.freeze({
    won: true,
    names: { attacker: "历史我方", defender: "历史敌方" },
    units: [
        { unitId: 1, faction: 1, templateId: 10101001, level: 1, position: 2,
            initialHp: 100, maxHp: 100, finalHp: 100, totalDamage: 10, totalTakenDamage: 0, totalRecovery: 0 },
        { unitId: 2, faction: 2, templateId: 10301001, level: 1, position: 2,
            initialHp: 10, maxHp: 10, finalHp: 0, totalDamage: 0, totalTakenDamage: 10, totalRecovery: 0 },
    ],
});
/** 单个已到账条目，只供生产选择回调生成配置简介。 */
const gold = Object.freeze({ itemId: 900001, quantity: 3 });
/** 后来接管同一详情的另一条目，检测旧参数是否覆盖。 */
const diamond = Object.freeze({ itemId: 900002, quantity: 5 });

/** 组合真实UI管理器与View；只控制Prefab加载口，不模拟开窗/关闭归属算法。 */
class OverlayFixture {
    /** 应用唯一UI管理器，测试进程单独安装和卸载。 */
    public readonly ui = UIManager.instance;
    /** 模态宿主；卸载后必须全部销毁。 */
    public readonly root = node("Canvas");
    /** 仅用于匹配卸载的导航身份，本专项不切Page。 */
    private readonly navigation = { current: "test-root", openChild: () => {}, back: () => false };
    /** 被替换的静态注册；测试结束恢复，避免同进程其他专项误用夹具。 */
    private readonly originalSpecs = new Map<Function, any>();
    /** 生产详情实例，检查数量及迟到完成是否挂回。 */
    public readonly infos: BagInfoView[] = [];
    /** 当轮详情预制体的可控等待，null表示立即加载。 */
    public infoLoad: ReturnType<typeof deferred<void>> | null = null;
    /** 进入实际详情加载口的次数，等在途请求被接纳后才注入取消。 */
    public infoLoads = 0;

    /** 登记四类真实View；只有美术和非几何列表输入由夹具提供。 */
    public constructor() {
        this.ui.install(this.navigation, { showToast: () => {} });
        this.ui.setResidentHost("remake-modal", () => this.root);
        this.register(BagInfoView, () => {
            const value = infoFixture();
            this.infos.push(value);
            return value;
        }, async () => {
            this.infoLoads++;
            const wait = this.infoLoad;
            if (wait) {
                await wait.promise;
            }
        });
        this.register(ChapterEndView, chapterFixture);
        this.register(RewardView, rewardFixture);
        this.register(BattleDetailLayer, statisticsFixture);
    }

    /** 沿实际ViewSpec和Prefab实例化流程创建页面，仍由生产UIManager处理合并与取消。 */
    private register(ctor: any, create: () => any, wait: () => Promise<void> = async () => {}): void {
        const original = UIRegistry.viewSpecOf(ctor)!;
        this.originalSpecs.set(ctor, original);
        UIRegistry.registerView(ctor, { ...original, load: async () => {
            await wait();
            return Object.assign(new Prefab(), { _instantiate: () => create().node });
        } });
    }

    /** 打开真实父结算窗，不借假的父类代替其奖励和统计逻辑。 */
    public async chapter(): Promise<ChapterEndView> {
        return await this.ui.open(ChapterEndView, { ...report, won: false }) as ChapterEndView;
    }

    /** 打开真实通用奖励窗，反馈闭环不在本专项伪造。 */
    public async reward(): Promise<RewardView> {
        return await this.ui.open(RewardView, {
            receiptId: "33333333-3333-4333-8333-333333333333",
            items: [{ itemId: 900001, credited: 3 }],
        }) as RewardView;
    }

    /** 关闭所有实例、撤销共享模态，再恢复原登记，不残留异步拥有者。 */
    public dispose(): void {
        this.ui.uninstall(this.navigation);
        this.root.destroy();
        for (const [ctor, spec] of this.originalSpecs) {
            UIRegistry.registerView(ctor, spec);
        }
    }
}

/** 每例隔离窗口并在断言失败时仍执行统一销毁。 */
async function withFixture(run: (test: OverlayFixture) => Promise<void>): Promise<void> {
    const test = new OverlayFixture();
    try {
        await run(test);
    } finally {
        test.dispose();
    }
    await flush();
    const state = test.ui.snapshot();
    assert.equal(state.residents, 0);
    assert.equal(state.pendingResident, 0);
    assert.equal(state.opening, 0);
    assert.equal(state.modalNodes, 0);
    assert.equal(state.modalActive, 0);
}

/** 原奖励父关闭只清自己的详情；后来接管同一单例的父和参数不能被旧回调覆盖。 */
async function checkPendingHandoff(): Promise<void> {
    await withFixture(async test => {
        const chapter = await test.chapter();
        const reward = await test.reward();
        const wait = deferred<void>();
        test.infoLoad = wait;
        (chapter as any).onRewardSelect(gold);
        await until(() => test.infoLoads === 1, "首个详情未开始加载");
        (reward as any).onSelect(diamond);
        await flush();
        wait.resolve();
        await until(() => test.infos.length === 1 && test.ui.snapshot().opening === 0, "详情未完成");
        await flush();
        const info = test.infos[0];
        assert.equal(info.propName!.string, BagItemCatalog.face(diamond.itemId, diamond.quantity).title, "准备中最后一次选择才是当前详情");
        assert.equal(buttonListeners(info.btnClose!), 1, "重复合并不会重复登记详情关闭按钮");
        test.ui.close(chapter);
        assert.equal(test.ui.isOpen(info), true, "关旧父不能关闭后来已接管的详情");
        test.ui.close(reward);
        assert.equal(test.ui.isOpen(info), false, "关当前父应关闭其详情");
    });
}

/** 普通直接打开取得同一详情的独立归属，原结算倒计时不能误关它。 */
async function checkIndependentHandoff(): Promise<void> {
    await withFixture(async test => {
        const chapter = await test.chapter();
        (chapter as any).onRewardSelect(gold);
        await until(() => test.infos.length === 1 && test.ui.snapshot().opening === 0, "原详情未就绪");
        await flush();
        const info = await test.ui.open(BagInfoView, { source: "description", face: BagItemCatalog.face(diamond.itemId, diamond.quantity) });
        test.ui.close(chapter);
        assert.equal(test.ui.isOpen(info), true, "独立详情接管后不随旧结算关闭");
        assert.equal((info as BagInfoView).propName!.string, BagItemCatalog.face(diamond.itemId, diamond.quantity).title);
        test.ui.close(info);
    });
}

/** 父在准备期关闭即撤销旧打开；旧加载晚到不能复活旧窗或清除后来新详情。 */
async function checkLateChildAfterClose(): Promise<void> {
    for (const failOld of [false, true]) {
        await withFixture(async test => {
            const chapter = await test.chapter();
            const old = deferred<void>();
            test.infoLoad = old;
            (chapter as any).onRewardSelect(gold);
            await until(() => test.infoLoads === 1, "旧详情未开始准备");
            test.ui.close(chapter);
            const reward = await test.reward();
            const current = deferred<void>();
            test.infoLoad = current;
            (reward as any).onSelect(diamond);
            await until(() => test.infoLoads === 2, "重开未建立新详情意图");
            current.resolve();
            await until(() => test.infos.length === 1 && test.ui.snapshot().opening === 0, "新详情未完成");
            const info = test.infos[0];
            if (failOld) {
                old.reject(new Error("旧详情受控下载失败"));
            } else {
                old.resolve();
            }
            await flush();
            assert.equal(test.infos.length, 1, "取消的旧加载不能实例化另一详情");
            assert.equal(test.ui.isOpen(info), true, "旧取消续段不能关闭新详情");
            assert.equal(info.propName!.string, BagItemCatalog.face(diamond.itemId, diamond.quantity).title);
            test.ui.close(reward);
            assert.equal(test.ui.isOpen(info), false);
        });
    }
}

/** 准备期转交后加载失败，所有拥有关系都撤销，失败提示不留下无法重开的单例意图。 */
async function checkTransferredLoadFailure(): Promise<void> {
    await withFixture(async test => {
        const chapter = await test.chapter();
        const reward = await test.reward();
        const failed = deferred<void>();
        test.infoLoad = failed;
        (chapter as any).onRewardSelect(gold);
        await until(() => test.infoLoads === 1, "原父详情未进入加载");
        (reward as any).onSelect(diamond);
        await flush();
        failed.reject(new Error("当前详情受控下载失败"));
        await until(() => test.ui.snapshot().opening === 0, "转交后的失败未释放打开任务");
        await flush();
        assert.equal(test.ui.snapshot().pendingResident, 0);
        assert.equal(test.infos.length, 0);
        assert.equal((test.ui as any).residentIntents.has(UIRegistry.viewSpecOf(BagInfoView)!.id), false, "共享失败必须撤销当前父意图");
        test.infoLoad = null;
        (reward as any).onSelect(diamond);
        await until(() => test.infos.length === 1 && test.ui.snapshot().opening === 0, "失败后的明确重开未完成");
        await flush();
        const info = test.infos[0];
        test.ui.close(chapter);
        assert.equal(test.ui.isOpen(info), true, "失败旧父不会夺回后来子窗");
        test.ui.close(reward);
        assert.equal(test.ui.isOpen(info), false);
        assert.equal((test.ui as any).residentIntents.has(UIRegistry.viewSpecOf(BagInfoView)!.id), false);
    });
}

/** 子窗主动关闭后解除父关闭订阅，反复开关不累积隐藏回调；重复关闭也不影响后来窗口。 */
async function checkChildCloseUnsubscribesOwner(): Promise<void> {
    await withFixture(async test => {
        const chapter = await test.chapter();
        const owner = chapter as any;
        const observeClose = owner.onViewClose.bind(owner);
        let activeHooks = 0;
        owner.onViewClose = (cleanup: () => void) => {
            let active = true;
            activeHooks++;
            const stop = observeClose(() => {
                if (active) {
                    active = false;
                    activeHooks--;
                }
                cleanup();
            });
            return () => {
                if (active) {
                    active = false;
                    activeHooks--;
                }
                stop();
            };
        };
        for (let index = 0; index < 5; index++) {
            (chapter as any).onRewardSelect(gold);
            await until(() => test.infos.length === index + 1 && test.ui.snapshot().opening === 0, "子详情未就绪");
            await flush();
            assert.equal(activeHooks, 1, "同一父的当前子详情只登记一份关闭关系");
            test.ui.close(test.infos[index]);
            assert.equal(activeHooks, 0, "子窗关闭应立即撤销父关闭订阅");
        }
        test.ui.close(chapter);
        assert.equal(activeHooks, 0);
    });
}

/** 已关闭父View不能重新创建子窗；显式公开入口同样拒绝迟到调用，不下载Prefab。 */
async function checkClosedOwnerRejectsLateOpen(): Promise<void> {
    await withFixture(async test => {
        const chapter = await test.chapter();
        test.ui.close(chapter);
        await assert.rejects((test.ui as any).openChild(chapter, BagInfoView, {
            source: "description", face: BagItemCatalog.face(gold.itemId, gold.quantity),
        }), UIManager.isOpenCancelled);
        assert.equal(test.infoLoads, 0, "关闭父的迟到调用不下载子窗");
        assert.equal(test.infos.length, 0);
        const reward = await test.reward();
        const pending = deferred<void>();
        test.infoLoad = pending;
        (reward as any).onSelect(diamond);
        await until(() => test.infoLoads === 1, "当前父的详情准备未开始");
        await assert.rejects((test.ui as any).openChild(chapter, BagInfoView, {
            source: "description", face: BagItemCatalog.face(gold.itemId, gold.quantity),
        }), UIManager.isOpenCancelled);
        assert.equal(test.infoLoads, 1, "已关旧父不能夺走后来父的在途意图");
        pending.resolve();
        await until(() => test.infos.length === 1 && test.ui.snapshot().opening === 0, "当前父详情未打开");
        const info = test.infos[0];
        await assert.rejects((test.ui as any).openChild(chapter, BagInfoView, {
            source: "description", face: BagItemCatalog.face(gold.itemId, gold.quantity),
        }), UIManager.isOpenCancelled);
        assert.equal(test.ui.isOpen(info), true, "已关旧父不能关闭后来父仍显示的详情");
        assert.equal(info.propName!.string, BagItemCatalog.face(diamond.itemId, diamond.quantity).title);
        test.ui.close(reward);
        assert.equal(test.ui.isOpen(info), false, "原有效父仍拥有子窗清理关系");
    });
}

/** 统计独立于结算倒计时，重复打开同一窗口不增加关闭监听，所有关闭路径释放模态。 */
async function checkStatisticsIndependence(): Promise<void> {
    await withFixture(async test => {
        const chapter = await test.chapter();
        (chapter as any).openStatistics();
        (chapter as any).openStatistics();
        await until(() => test.ui.isOpen("battle-detail") && test.ui.snapshot().opening === 0, "真实结算统计入口未完成");
        const first = await test.ui.open(BattleDetailLayer, report) as BattleDetailLayer;
        const again = await test.ui.open(BattleDetailLayer, report);
        assert.equal(first, again, "统计保持唯一实例");
        assert.equal(buttonListeners(first.closeButton!), 1, "重复统计打开不能累积关闭监听");
        test.ui.close(chapter);
        assert.equal(test.ui.isOpen(first), true, "结算关闭后统计仍可独立阅读");
        assert.equal(first.attackerName!.string, report.names.attacker);
        first.closeButton!.node.emit(Button.EventType.CLICK);
        assert.equal(test.ui.isOpen(first), false);
        assert.equal(buttonListeners(first.closeButton!), 0, "关闭后所有自有按钮监听撤销");
    });
}

/** 双击统计准备时只加载一次，关闭旧意图后重开与旧加载完成彼此隔离。 */
async function checkStatisticsPendingCancellation(): Promise<void> {
    await withFixture(async test => {
        const original = UIRegistry.viewSpecOf(BattleDetailLayer)!;
        const firstWait = deferred<void>();
        const secondWait = deferred<void>();
        let loads = 0;
        UIRegistry.registerView(BattleDetailLayer, { ...original, load: async () => {
            const current = ++loads;
            await (current === 1 ? firstWait.promise : secondWait.promise);
            return Object.assign(new Prefab(), { _instantiate: () => statisticsFixture().node });
        } });
        const old = test.ui.open(BattleDetailLayer, report);
        const duplicate = test.ui.open(BattleDetailLayer, report);
        const oldResult = assert.rejects(old, UIManager.isOpenCancelled);
        const duplicateResult = assert.rejects(duplicate, UIManager.isOpenCancelled);
        await until(() => loads === 1, "统计准备未开始");
        test.ui.closeById("battle-detail");
        const next = test.ui.open(BattleDetailLayer, report);
        await until(() => loads === 2, "新统计意图未开始");
        secondWait.resolve();
        const visible = await next;
        firstWait.resolve();
        await oldResult;
        await duplicateResult;
        assert.equal(test.ui.isOpen(visible), true, "旧统计加载不能影响新统计实例");
        assert.equal(test.ui.snapshot().residents, 1);
        test.ui.close(visible);
    });
}

/** 准备真实英雄图片绑定，避免把测试自制赋图算法当成生产代次保护。 */
function heroFixture(name: string): HeroIconCellView {
    const root = node(name);
    const hero = root.addComponent(HeroIconCellView);
    hero.button = root.addComponent(Button);
    hero.face = node("Face", root);
    hero.face.addComponent(Sprite);
    hero.nameLabel = node("Name", root).addComponent(Label);
    hero.elem = node("Element", root);
    hero.elem.addComponent(Sprite);
    hero.levelLabel = node("Level", root).addComponent(Label);
    hero.lock = node("Lock", root);
    hero.battle = node("Deployed", root);
    hero.stars = Array.from({ length: 5 }, (_, index) => node("Star" + index, root));
    return hero;
}

/** 列表销毁后迟到头像不赋图，重新开列表仍可复用共享在途资源，最后拥有者释放为零。 */
async function checkLatePortraitOwnership(): Promise<void> {
    const loaded = deferred<SpriteFrame>();
    let loads = 0;
    const pool = new ResourcePool<SpriteFrame>({ load: () => { loads++; return loaded.promise; },
        retain: frame => frame.addRef(), release: frame => frame.decRef(), discard: () => {} });
    const create = ResourceAssetsUtils.createAssetScope;
    ResourceAssetsUtils.createAssetScope = () => {
        const scope = pool.createScope();
        return { load: descriptor => scope.load(JSON.stringify(descriptor)) as any,
            loadPath: (path, type) => scope.load(JSON.stringify({ path, type })) as any,
            dispose: () => scope.dispose() };
    };
    const old = heroFixture("OldStatisticCell");
    const current = heroFixture("NewStatisticCell");
    const data: any = { kind: "owned", face: "hero/ui/controlled-portrait", name: "历史头像", showName: false,
        elem: null, stars: 1, level: 1, locked: false, deployed: false };
    try {
        old.show(data);
        await flush();
        old.node!.destroy();
        current.show(data);
        await flush();
        assert.equal(loads, 1, "原共享资源池合并已关格子和新格子的同图请求");
        const frame = new SpriteFrame();
        loaded.resolve(frame);
        await flush();
        assert.equal(old.face!.getComponent(Sprite)!.spriteFrame, null, "迟到资源不得赋给已销毁统计格子");
        assert.equal(current.face!.getComponent(Sprite)!.spriteFrame, frame);
        assert.equal(frame.refCount, 1, "新格子独占一份显示引用，旧续段不能撤销它");
        current.node!.destroy();
        await flush();
        assert.equal(frame.refCount, 0);
        assert.deepEqual(pool.snapshot(), { scopes: 0, entries: 0, pending: 0, owners: 0, retained: 0 });
    } finally {
        old.node!.destroy();
        current.node!.destroy();
        ResourceAssetsUtils.createAssetScope = create;
    }
}

/** 打开回调同步取消本实例或父页，故意让ready永不完成，验证取消由真实框架兜底。 */
class SynchronousCloseView extends BaseView<{ owner?: BaseView<unknown> }> {
    /** 实际关闭钩子的执行次数；不通过finishOpen或failOpen帮助框架兑现ready。 */
    public closes = 0;

    /** 创建未兑现的就绪等待后同步关闭，用于覆盖取消口尚未登记的窄窗口。 */
    public onOpen(args?: { owner?: BaseView<unknown> }): void {
        super.onOpen(args);
        this.beginOpen();
        if (args?.owner) {
            UIManager.instance.close(args.owner);
        } else {
            this.close();
        }
    }

    /** 只记录关闭，刻意不完成ready，防止用被测View行为掩盖框架取消停滞。 */
    public onClose(): void {
        this.closes++;
    }
}

/** onOpen同步关闭时公开开窗入口须及时拒绝，不等待永不完成的资源，也不残留父子意图。 */
async function checkSynchronousCloseBeforeReadyWait(): Promise<void> {
    for (const closeOwner of [false, true]) {
        await withFixture(async test => {
            const chapter = await test.chapter();
            const mounted: SynchronousCloseView[] = [];
            const id = "overlay-synchronous-close";
            const unregister = UIRegistry.registerView(SynchronousCloseView, {
                ...UIRegistry.viewSpecOf(BattleDetailLayer)!,
                id,
                prefab: "test/OverlaySynchronousClose",
                load: async () => Object.assign(new Prefab(), {
                    _instantiate: () => {
                        const view = node("SynchronousClose").addComponent(SynchronousCloseView);
                        mounted.push(view);
                        return view.node;
                    },
                }),
            });
            try {
                let result: unknown = "waiting";
                const opening = closeOwner
                    ? test.ui.openChild(chapter, SynchronousCloseView, { owner: chapter })
                    : test.ui.open(SynchronousCloseView);
                const observed = opening.then(() => { result = "opened"; }, error => { result = error; });
                await until(() => result !== "waiting", "onOpen内同步关闭后仍被未兑现ready挂住");
                await observed;
                assert(UIManager.isOpenCancelled(result), "同步关闭应返回明确取消，不能假称开窗成功");
                assert.equal(mounted.length, 1);
                assert.equal(mounted[0].closes, 1, "真实关闭只执行一次");
                assert.equal(test.ui.isOpen(id), false);
                assert.equal(test.ui.snapshot().opening, 0);
                assert.equal(test.ui.snapshot().pendingResident, 0);
                assert.equal((test.ui as any).residentIntents.has(id), false, "取消后的子意图与父清理登记一并撤销");
                assert.equal(test.ui.isOpen(chapter), !closeOwner);
            } finally {
                unregister();
            }
        });
    }
}

/** 只替代美术节点与战报输入，取得真实播放器的关闭函数；不启动动画或重写releaseSettlement逻辑。 */
async function mountReplayCleanup(parent: Node, completed?: (won: boolean) => Promise<void>): Promise<() => void> {
    const originalMount = BattlePageUtils.mountBattlePrefab;
    const originalParse = BattleReplayUtils.parse;
    const originalAudioEvents = (AudioSource as any).EventType;
    const root = node("LifecycleBattlePage", parent);
    (root as any).position = { x: 0, y: 0, z: 0, clone: () => new Vec3() };
    const child = (path: string): Node => {
        let current = root;
        for (const name of path.split("/")) {
            current = current.getChildByName(name) || node(name, current);
        }
        return current;
    };
    child("IdleLayout/ModelScale");
    child("IdleLayout/HpOffset");
    child("LayerHud/MatchInfo/AllyNameLabel").addComponent(Label);
    child("LayerHud/MatchInfo/EnemyNameLabel").addComponent(Label);
    child("LayerHud/BtnSkip/Label").addComponent(Label);
    child("LayerVfx/VfxScreen/DimOverlay").addComponent(UIOpacity);
    const shell = {
        root,
        layerField: child("LayerField"),
        logLabel: child("LayerHud/Log"),
        slot: (side: string, index: number) => child("Slots/" + side + index),
        hpLabel: (side: string, index: number) => child("Hp/" + side + index + "/Label"),
        bindSkip: () => {},
        bindRetreat: () => {},
        bindClose: () => {},
    };
    shell.logLabel.addComponent(Label);
    BattlePageUtils.mountBattlePrefab = async () => shell as any;
    BattleReplayUtils.parse = () => ({ steps: [], units: [], names: { attacker: null, defender: null } });
    (AudioSource as any).EventType = { STARTED: "audio-started" };
    try {
        return await BattleReplayPreview.open(parent, new Uint8Array(), false, undefined,
            undefined, undefined, false, completed);
    } finally {
        BattlePageUtils.mountBattlePrefab = originalMount;
        BattleReplayUtils.parse = originalParse;
        (AudioSource as any).EventType = originalAudioEvents;
    }
}

/** 战场结果属于父页；结果准备中被独立演出接管后，旧战场关闭和迟到续段均不能误关。 */
async function checkBattleResultOwnership(): Promise<void> {
    await withFixture(async test => {
        const battleSpec = UIRegistry.viewSpecOf(MainChapterBattleView)!;
        const chapterSpec = UIRegistry.viewSpecOf(ChapterEndView)!;
        const originalParse = BattleReplayUtils.parse;
        const originalPresented = MainChapterController.instance.markSettlementPresented;
        const stopHost = test.ui.setResidentHost("main-chapter-field", () => test.root);
        let loads = 0;
        let wait: ReturnType<typeof deferred<void>> | null = null;
        // 本例只跳过战报解码和播放器；实际showResult、onClose及框架归属链完整运行。
        BattleReplayUtils.parse = () => ({ steps: [], units: report.units as any, names: report.names });
        UIRegistry.registerView(MainChapterBattleView, {
            ...battleSpec,
            load: async () => Object.assign(new Prefab(), {
                _instantiate: () => {
                    const battle = node("BattleField").addComponent(MainChapterBattleView);
                    battle.onOpen = BaseView.prototype.onOpen;
                    return battle.node;
                },
            }),
        });
        UIRegistry.registerView(ChapterEndView, {
            ...chapterSpec,
            load: async () => {
                loads++;
                if (wait) {
                    await wait.promise;
                }
                return Object.assign(new Prefab(), { _instantiate: () => chapterFixture().node });
            },
        });
        const args = {
            report: { battleId: "11111111-1111-4111-8111-111111111111", mission: 1,
                pending: [], bytes: new Uint8Array() },
            onClosed: () => {},
        };
        try {
            const first = await test.ui.open(MainChapterBattleView, args);
            await (first as any).showResult(null, "原结果");
            assert.equal(test.ui.isOpen(ChapterEndView), true);
            test.ui.close(first);
            assert.equal(test.ui.isOpen(ChapterEndView), false, "正常父关闭应释放自己仍持有的结果页");

            const second = await test.ui.open(MainChapterBattleView, args);
            wait = deferred<void>();
            const oldOpening = (second as any).showResult(null, "旧战场结果");
            await until(() => loads === 2, "战场结果未进入受控准备");
            const independent = test.ui.open(ChapterEndView, { ...report, won: false, notice: "后来独立结果" });
            test.ui.close(second);
            wait.resolve();
            const current = await independent;
            await oldOpening;
            assert.equal(test.ui.isOpen(current), true, "旧战场关闭及迟到续段均不得误关后来结果");
            assert.equal((current as any).args.notice, "后来独立结果");
            assert.equal(test.ui.snapshot().residents, 1);
            test.ui.close(current);

            // 旧父仍在场时，末次参数已被独立结果替换，不能把共享Promise成功误认为旧奖励展示。
            const third = await test.ui.open(MainChapterBattleView, args);
            (third as any).stopReplay = await mountReplayCleanup(third.node!, async () => {});
            let presented = 0;
            MainChapterController.instance.markSettlementPresented = () => { presented++; };
            wait = deferred<void>();
            const receipt = { battleId: args.report.battleId, rewards: [{ itemId: 900001, quantity: 3 }] };
            const sharedOpening = (third as any).showResult(receipt, "真实结算");
            await until(() => loads === 3, "第三个结果未进入准备");
            const replacement = test.ui.open(ChapterEndView, { ...report, won: false, notice: "独立演示接管" });
            wait.resolve();
            const currentResult = await replacement;
            await sharedOpening;
            assert.equal(presented, 0, "已被接管的共享开窗完成不能消费旧战斗的展示确认");
            assert.equal(test.ui.ownsChild(third, currentResult), false);
            test.ui.close(third);
            assert.equal(test.ui.isOpen(currentResult), true, "真实播放器stopReplay清理同样不得误关外层接管结果");
            test.ui.close(currentResult);

            wait = null;
            const stopStandalone = await mountReplayCleanup(test.root);
            const standalone = await test.ui.open(ChapterEndView, { ...report, won: false });
            stopStandalone();
            assert.equal(test.ui.isOpen(standalone), false, "独立只读演示仍关闭自己原流程中的结果");
        } finally {
            stopHost();
            UIRegistry.registerView(MainChapterBattleView, battleSpec);
            UIRegistry.registerView(ChapterEndView, chapterSpec);
            BattleReplayUtils.parse = originalParse;
            MainChapterController.instance.markSettlementPresented = originalPresented;
        }
    });
}

/** 统一执行叠窗及资源拥有关系反例，不将离线绑定检查扩大为真实弱网或画面验收。 */
async function main(): Promise<void> {
    await ConfigFixtureUtils.installReal();
    const stopTweens = Tween.stopAllByTarget;
    const loadBundle = assetManager.loadBundle;
    // 专项不运行引擎动画，只提供清理口；资源依旧经过生产ResourcePool持有和释放。
    Tween.stopAllByTarget = () => {};
    assetManager.loadBundle = ((_name: string, done: Function) => done(null, {
        load: (_path: string, _type: unknown, callback: Function) => callback(null, new SpriteFrame()),
    })) as any;
    const checks = [checkPendingHandoff, checkIndependentHandoff, checkLateChildAfterClose,
        checkTransferredLoadFailure, checkChildCloseUnsubscribesOwner, checkClosedOwnerRejectsLateOpen,
        checkStatisticsIndependence, checkStatisticsPendingCancellation, checkLatePortraitOwnership,
        checkSynchronousCloseBeforeReadyWait, checkBattleResultOwnership];
    const selected = process.argv[2] ? checks.filter(check => check.name === process.argv[2]) : checks;
    assert(selected.length > 0, "未找到指定叠窗用例");
    try {
        for (const check of selected) {
            await check();
            console.log("PASS " + check.name);
        }
        assert.equal(EventDispatcher.instance.snapshot().listeners, 0);
        assert.deepEqual(ResourceAssetsUtils.snapshot(), { scopes: 0, entries: 0, pending: 0, owners: 0, retained: 0 });
        console.log("叠窗生命周期专项：" + selected.length + "/" + selected.length + " passed");
    } finally {
        Tween.stopAllByTarget = stopTweens;
        assetManager.loadBundle = loadBundle;
    }
}

void main().catch(error => { console.error(error); process.exitCode = 1; });
