/**
 * 技能演示窗口的离线生命周期专项，使用真实配置和SkillAuditUtils匹配技能等级。
 * 引擎替身只提供节点、输入事件和列表数据边界；不签收画面，不启动测试服或写玩家资产。
 */
import { strict as assert } from "node:assert";
import { Button, EditBox, Label, Node, Sprite, SpriteFrame } from "cc";
import { ConfigFixtureUtils } from "./ConfigFixtureUtils";
import { EventScope } from "../assets/scripts/framework/EventScope";
import { UIManager } from "../assets/scripts/framework/ui/UIManager";
import { SkillAuditView } from "../assets/scripts/features/battle/ui/SkillAuditView";
import { SkillAuditEvidence, SkillAuditUtils } from "../assets/scripts/features/battle/utils/SkillAuditUtils";

/** 使用真实配置中的独眼梦魇一级主动，二级没有本测试的出手证据。 */
const heroId = 10101001;
/** 与英雄、等级共同定位原配置行，不用一个等级代替另一个等级。 */
const skillId = 101010011;

/** 测试控制目录和播放完成时点，不以真实等待时间掩盖异步竞态。 */
interface Deferred<T> {
    /** 等待调用方显式完成或拒绝的本次结果。 */
    readonly promise: Promise<T>;
    /** 完成本次异步操作，值仍经过真实View消费。 */
    readonly resolve: (value: T) => void;
    /** 拒绝本次操作，用来验证失败及关闭后的迟到错误。 */
    readonly reject: (error: Error) => void;
}

/** 真实View交给SuperContent的数据，测试只触发数据自带的选择动作。 */
interface AuditRow {
    /** 页面实际生成的名称、ID与状态。 */
    readonly caption: string;
    /** 页面实际生成的英雄或技能选择动作。 */
    readonly tap: () => void;
}

/** 返回独立的可控Promise；不替换生产加载器、取消代次或配置匹配实现。 */
function deferred<T>(): Deferred<T> {
    let resolve!: (value: T) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<T>((done, failed) => {
        resolve = done;
        reject = failed;
    });
    return { promise, resolve, reject };
}

/** 仅推进已入队的Promise回调，不等待墙钟，也不自动完成尚未释放的目录或播放。 */
async function flush(): Promise<void> {
    for (let turn = 0; turn < 12; turn++) {
        await Promise.resolve();
    }
}

/** 为目录返回一条精确出手证据；战报解析及资源预检由其他专项验证。 */
function evidence(fixture = "audit-current-replay.pb"): readonly SkillAuditEvidence[] {
    return [{ heroId, skillId, level: 1, fixture }];
}

/** 装配View公开节点，不重写任何业务方法；列表仅记录真实提交的数据。 */
class AuditFixture {
    /** 当前测试持有的独立窗口根，结束后销毁。 */
    public readonly root = new Node("SkillAuditLifecycle");
    /** 真实生产View，打开和关闭均经过BaseView包装。 */
    public readonly view = this.root.addComponent(SkillAuditView);
    /** 当前列表数据；由真实paint替换，测试不注入选中条目。 */
    public rows: readonly AuditRow[] = [];
    /** 实际列表提交次数，用于检查重开后是否重复订阅搜索事件。 */
    public paints = 0;
    /** 首次绑定的选中图片，检查重开不会把两种状态倒置。 */
    public readonly selectedFrame = new SpriteFrame();
    /** 首次绑定的未选中图片，不代表任何真实渲染资产。 */
    public readonly idleFrame = new SpriteFrame();

    /** 只补齐本窗声明的引擎组件引用，列表位置与真实画面不在本专项范围内。 */
    public constructor() {
        this.view.owner = this.child("Owner").addComponent(Label);
        this.view.selection = this.child("Selection").addComponent(Label);
        this.view.message = this.child("Message").addComponent(Label);
        this.view.search = this.child("Search").addComponent(EditBox);
        this.view.kindButtons = [this.button("HeroTab"), this.button("SkillTab")];
        this.view.kindButtons[0].node.addComponent(Sprite).spriteFrame = this.selectedFrame;
        this.view.kindButtons[1].node.addComponent(Sprite).spriteFrame = this.idleFrame;
        this.view.playButton = this.button("Play");
        this.view.closeButton = this.button("Close");
        this.view.options = {
            list: {
                setData: (rows: readonly AuditRow[]) => {
                    this.rows = rows;
                    this.paints++;
                },
            },
            toStart: () => {},
        } as any;
    }

    /** 创建归本测试根持有的输入或文本节点，销毁根时一并释放。 */
    private child(name: string): Node {
        const node = new Node(name);
        node.parent = this.root;
        return node;
    }

    /** 为旧cc-runtime补本地Component.getComponent入口，不修改全局引擎替身。 */
    private button(name: string): Button {
        const button = this.child(name).addComponent(Button);
        (button as any).getComponent = (type: any) => button.node.getComponent(type);
        return button;
    }

    /** 用页面真实英雄行进入技能列表，不读取或写入View私有选中状态。 */
    public chooseHero(): void {
        const hero = this.rows.find(row => row.caption.includes("[" + heroId + "]"));
        assert(hero, "真实配置英雄必须出现在目录中");
        hero.tap();
    }

    /** 点击真实技能行；等级必须由生产目录生成，不能手写可演示状态。 */
    public chooseSkill(level = 1): void {
        const skill = this.rows.find(row => row.caption.includes("[" + skillId + "]")
            && row.caption.includes(" Lv." + level + " ·"));
        assert(skill, "真实配置中缺少本测试技能等级：" + level);
        skill.tap();
    }

    /** 等待播放按钮所调用的原异步方法，便于准确检查完成或失败后的状态。 */
    public play(): Promise<void> {
        return (this.view as unknown as { play(): Promise<void> }).play();
    }

    /** 通过真实输入事件检查本显示期是否仍绑定一份搜索监听。 */
    public searchChanged(): void {
        this.view.search!.node.emit(EditBox.EventType.TEXT_CHANGED);
    }

    /** 关闭并销毁本测试窗口，重复关闭由BaseView保证不重复取消。 */
    public dispose(): void {
        this.view.runDispose();
        this.root.destroy();
    }
}

/** 自动目录成功后使用精确等级播放，禁止等待期重复点击并验证返回恢复窗口。 */
async function checkCatalogueSuccess(notices: string[]): Promise<void> {
    const fixture = new AuditFixture();
    const catalogue = deferred<readonly SkillAuditEvidence[]>();
    const playback = deferred<void>();
    let returned!: () => void;
    let loads = 0;
    let plays = 0;
    let cancellations = 0;
    try {
        fixture.view.runOpen({
            load: () => { loads++; return catalogue.promise; },
            play: async (skill, back) => {
                plays++;
                assert.equal(skill.fixture, "audit-current-replay.pb");
                assert.equal(skill.level, 1);
                returned = back;
                await playback.promise;
            },
            cancel: () => { cancellations++; },
        });
        assert.equal(fixture.view.playButton!.interactable, false);
        assert(fixture.rows.length > 0, "检测等待期间仍显示真实配置目录");
        await fixture.play();
        assert.equal(loads, 1, "等待期不会重复扫描目录");
        fixture.chooseHero();
        catalogue.resolve(evidence());
        await flush();
        assert.equal(fixture.view.playButton!.interactable, true);
        assert(fixture.view.owner!.string.includes("不是验收记录"));
        fixture.chooseSkill(2);
        const before = notices.length;
        await fixture.play();
        assert.equal(plays, 0, "一级证据不能使二级技能可播放");
        assert.equal(notices.length, before + 1);
        fixture.chooseSkill();
        const playing = fixture.play();
        await fixture.play();
        assert.equal(plays, 1, "播放准备期只有一次调用");
        assert.equal(fixture.view.playButton!.interactable, false);
        playback.resolve();
        await playing;
        assert.equal(fixture.root.active, false, "战场准备成功后隐藏目录");
        returned();
        assert.equal(fixture.root.active, true, "从战场返回恢复同一目录");
        assert.equal(fixture.view.playButton!.interactable, true);
        fixture.view.runClose();
        fixture.view.runClose();
        assert.equal(cancellations, 1, "重复关闭只撤销本次显示一次");
    } finally {
        fixture.dispose();
    }
}

/** 目录读取失败不能伪装为没有演示；显式重试只重读目录，不直接开始播放。 */
async function checkCatalogueRetry(notices: string[]): Promise<void> {
    const fixture = new AuditFixture();
    const retry = deferred<readonly SkillAuditEvidence[]>();
    let loads = 0;
    let plays = 0;
    try {
        const before = notices.length;
        fixture.view.runOpen({
            load: async () => {
                loads++;
                if (loads === 1) {
                    throw new Error("测试目录读取失败");
                }
                return retry.promise;
            },
            play: async () => { plays++; },
            cancel: () => {},
        });
        await flush();
        assert.equal(notices.length, before + 1);
        assert.equal(notices.at(-1), "测试目录读取失败");
        assert(fixture.view.owner!.string.includes("目录未就绪"));
        assert.equal(fixture.view.playButton!.interactable, true);
        const retrying = fixture.play();
        await fixture.play();
        assert.equal(loads, 2);
        assert.equal(plays, 0);
        retry.resolve(evidence());
        await retrying;
        assert.equal(fixture.view.playButton!.interactable, true);
        assert(fixture.view.owner!.string.includes("不是验收记录"));
        fixture.chooseHero();
        assert(fixture.rows.some(row => row.caption.includes("Lv.1 · 有演示")));
    } finally {
        fixture.dispose();
    }
}

/** 关闭后成功与失败均不再重绘或弹提示，搜索和按钮监听在关闭时全部解除。 */
async function checkClosedCatalogue(notices: string[]): Promise<void> {
    for (const reject of [false, true]) {
        const fixture = new AuditFixture();
        const catalogue = deferred<readonly SkillAuditEvidence[]>();
        try {
            fixture.view.runOpen({ load: () => catalogue.promise, play: async () => {}, cancel: () => {} });
            fixture.view.runClose();
            const state = { paints: fixture.paints, title: fixture.view.owner!.string, notices: notices.length };
            fixture.searchChanged();
            if (reject) {
                catalogue.reject(new Error("关闭后的目录失败"));
            } else {
                catalogue.resolve(evidence());
            }
            await flush();
            assert.equal(fixture.paints, state.paints);
            assert.equal(fixture.view.owner!.string, state.title);
            assert.equal(notices.length, state.notices);
            assert.equal(fixture.view.playButton!.interactable, false);
        } finally {
            fixture.dispose();
        }
    }
}

/** 同一实例直接重开会撤销旧读取、去重监听并恢复原页签，旧成功或失败不能覆盖新目录。 */
async function checkReopenedCatalogue(notices: string[]): Promise<void> {
    for (const reject of [false, true]) {
        const fixture = new AuditFixture();
        const oldCatalogue = deferred<readonly SkillAuditEvidence[]>();
        const currentCatalogue = deferred<readonly SkillAuditEvidence[]>();
        let oldCancelled = 0;
        let currentCancelled = 0;
        try {
            fixture.view.runOpen({ load: () => oldCatalogue.promise, play: async () => {}, cancel: () => { oldCancelled++; } });
            fixture.chooseHero();
            fixture.view.runOpen({ load: () => currentCatalogue.promise, play: async () => {}, cancel: () => { currentCancelled++; } });
            assert.equal(oldCancelled, 1, "直接重开也撤销上一显示期");
            assert.equal(currentCancelled, 0, "BaseView提前换args不能误取消本次读取");
            assert.equal(fixture.view.kindButtons[0].node.getComponent(Sprite)!.spriteFrame, fixture.selectedFrame);
            const paints = fixture.paints;
            fixture.searchChanged();
            assert.equal(fixture.paints, paints + 1, "直接重开后搜索事件只绘制一次");
            const noticesBefore = notices.length;
            if (reject) {
                oldCatalogue.reject(new Error("旧目录迟到失败"));
            } else {
                oldCatalogue.resolve(evidence("audit-obsolete-replay.pb"));
            }
            await flush();
            assert.equal(fixture.view.playButton!.interactable, false, "旧finally不得解锁新目录");
            assert(fixture.view.owner!.string.includes("正在自动检测"));
            assert.equal(notices.length, noticesBefore);
            currentCatalogue.resolve(evidence());
            await flush();
            fixture.chooseHero();
            fixture.chooseSkill();
            assert(fixture.view.selection!.string.includes("有演示"));
        } finally {
            fixture.dispose();
        }
        assert.equal(oldCancelled, 1);
        assert.equal(currentCancelled, 1);
    }
}

/** 播放准备中关闭窗口，迟到回调不得重新激活节点或报告已经无归属的失败。 */
async function checkClosedPlayback(notices: string[]): Promise<void> {
    for (const reject of [false, true]) {
        const fixture = new AuditFixture();
        const playback = deferred<void>();
        let returned!: () => void;
        let cancellations = 0;
        try {
            fixture.view.runOpen({
                load: async () => evidence(),
                play: async (_skill, back) => { returned = back; await playback.promise; },
                cancel: () => { cancellations++; },
            });
            await flush();
            fixture.chooseHero();
            fixture.chooseSkill();
            const playing = fixture.play();
            fixture.view.runClose();
            fixture.root.active = false;
            const noticesBefore = notices.length;
            returned();
            assert.equal(fixture.root.active, false, "已关闭窗口不能被返回动作复活");
            if (reject) {
                playback.reject(new Error("关闭后的播放失败"));
            } else {
                playback.resolve();
            }
            await playing;
            assert.equal(fixture.root.active, false);
            assert.equal(notices.length, noticesBefore);
            assert.equal(cancellations, 1);
        } finally {
            fixture.dispose();
        }
    }
}

/** 旧播放在同实例新目录和新播放期间完成，不能隐藏新页、解锁新按钮或弹旧错误。 */
async function checkReopenedPlayback(notices: string[]): Promise<void> {
    for (const reject of [false, true]) {
        const fixture = new AuditFixture();
        const oldPlayback = deferred<void>();
        const newCatalogue = deferred<readonly SkillAuditEvidence[]>();
        const newPlayback = deferred<void>();
        let oldReturned!: () => void;
        let newReturned!: () => void;
        try {
            fixture.view.runOpen({
                load: async () => evidence(),
                play: async (_skill, back) => { oldReturned = back; await oldPlayback.promise; },
                cancel: () => {},
            });
            await flush();
            fixture.chooseHero();
            fixture.chooseSkill();
            const oldPlaying = fixture.play();
            fixture.view.runOpen({
                load: () => newCatalogue.promise,
                play: async (_skill, back) => { newReturned = back; await newPlayback.promise; },
                cancel: () => {},
            });
            fixture.root.active = false;
            oldReturned();
            assert.equal(fixture.root.active, false, "旧返回不能激活正在重新准备的新显示期");
            fixture.root.active = true;
            newCatalogue.resolve(evidence());
            await flush();
            fixture.chooseHero();
            fixture.chooseSkill();
            const currentPlaying = fixture.play();
            const noticesBefore = notices.length;
            if (reject) {
                oldPlayback.reject(new Error("上次显示期的播放失败"));
            } else {
                oldPlayback.resolve();
            }
            await oldPlaying;
            assert.equal(fixture.root.active, true, "旧成功不能隐藏新显示期");
            assert.equal(fixture.view.playButton!.interactable, false, "旧finally不能解锁新播放");
            assert.equal(notices.length, noticesBefore);
            newPlayback.resolve();
            await currentPlaying;
            assert.equal(fixture.root.active, false);
            newReturned();
            assert.equal(fixture.root.active, true);
        } finally {
            fixture.dispose();
        }
    }
}

/** 当前播放失败恢复目录并保留选中说明，下一次点击可以重新调用原播放入口。 */
async function checkPlaybackRetry(notices: string[]): Promise<void> {
    const fixture = new AuditFixture();
    let calls = 0;
    try {
        fixture.view.runOpen({
            load: async () => evidence(),
            play: async () => {
                calls++;
                if (calls === 1) {
                    throw new Error("当前演示准备失败");
                }
            },
            cancel: () => {},
        });
        await flush();
        fixture.chooseHero();
        fixture.chooseSkill();
        const selectedText = fixture.view.message!.string;
        const noticesBefore = notices.length;
        await fixture.play();
        assert.equal(fixture.root.active, true);
        assert.equal(fixture.view.playButton!.interactable, true);
        assert.equal(fixture.view.message!.string, selectedText);
        assert.equal(notices.length, noticesBefore + 1);
        assert.equal(notices.at(-1), "演示打开失败：当前演示准备失败");
        await fixture.play();
        assert.equal(calls, 2);
        assert.equal(fixture.root.active, false);
    } finally {
        fixture.dispose();
    }
}

/** 安装唯一真实配置后执行生命周期矩阵，最后解除提示绑定并核对作用域无残留。 */
async function main(): Promise<void> {
    await ConfigFixtureUtils.installReal();
    assert(SkillAuditUtils.skills(heroId).some(skill => skill.id === skillId && skill.level === 2));
    // 旧cc替身未提供EditBox枚举，局部补公开事件常量，不替换生产View的方法或行为。
    (EditBox as any).EventType ||= { TEXT_CHANGED: "text-changed" };
    const notices: string[] = [];
    const initialSubscriptions = EventScope.snapshot();
    const unbindNotice = UIManager.instance.bindNotice(text => notices.push(text));
    try {
        await checkCatalogueSuccess(notices);
        await checkCatalogueRetry(notices);
        await checkClosedCatalogue(notices);
        await checkReopenedCatalogue(notices);
        await checkClosedPlayback(notices);
        await checkReopenedPlayback(notices);
        await checkPlaybackRetry(notices);
        assert.equal(EventScope.snapshot(), initialSubscriptions, "全部测试关闭后无残留页面监听");
        console.log("PASS SkillAuditView: real config matching, async scan/retry, in-place reopen, stale return, playback retry and close cleanup");
    } finally {
        unbindNotice();
    }
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
