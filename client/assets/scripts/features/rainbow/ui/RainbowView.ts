/**
 * 彩虹圣殿地图：显示六个神位，串起规则、挑战确认、独立出阵和战报。
 * 服务端快照及战报存取由圣殿模块负责，页面只拥有当前播放和待机骨骼。
 */
import { _decorator, Button, Color, Label, Node, Sprite, SpriteFrame, UITransform } from "cc";
import { GameLog } from "../../../core/GameLog";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import type { RainbowSettlement } from "../../../platform/Protocol";
import type { AccountModel } from "../../account/AccountModel";
import { BattleReplayPreview } from "../../battle/ui/BattleReplayPreview";
import type { SpineActor } from "../../battle/ui/BattleSpineService";
import { BattleReplayUtils } from "../../battle/utils/BattleReplayUtils";
import { ConfirmView } from "../../common/ui/ConfirmView";
import { RulesView } from "../../common/ui/RulesView";
import type { MainFormation } from "../../hero/data/HeroSnapshotUtils";
import { HeroRosterModel } from "../../hero/HeroRosterModel";
import { FormationView } from "../../hero/ui/FormationView";
import { RainbowController } from "../RainbowController";
import { RainbowModel } from "../RainbowModel";
import { RainbowChallengeView } from "./RainbowChallengeView";
import { RainbowHistoryView } from "./RainbowHistoryView";
import { RainbowPresentationUtils } from "../utils/RainbowPresentationUtils";
import { RainbowResultView } from "./RainbowResultView";

const { ccclass, property } = _decorator;

/** 应用持有的导航和当前角色身份读取。 */
export interface RainbowViewArgs {
    /** 角色 ID 仅用于本人神位标记，资格及隔离由服务器与认证层处理。 */
    readonly account: AccountModel;
    /** 返回副本大厅并保持底栏选中。 */
    readonly backToHall: () => void;
    /** 打开主城实际竞技场弹窗。 */
    readonly openArena: () => void;
}

@UIRegistry.view({
    id: "rainbow", prefab: "bundles/module/rainbow/prefabs/RainbowView",
    layer: UILayer.Page, cache: false, allowMultiple: false,
})
@ccclass("RainbowView")
export class RainbowView extends BaseView<RainbowViewArgs> {
    /** 原地图背景覆盖可见区，本身不改变神位坐标。 */
    @property(UITransform) private background: UITransform | null = null;
    /** 固定六座台座和顶部、底部条件组的预制体根。 */
    @property(UITransform) private layout: UITransform | null = null;
    /** 播放期间覆盖等待区的战斗背景。 */
    @property(UITransform) private battleBackground: UITransform | null = null;
    /** 共用战报播放器的静态挂点。 */
    @property(Node) private battleHost: Node | null = null;
    /** 返回原副本大厅。 */
    @property(Button) private backButton: Button | null = null;
    /** 查看旧规则全文。 */
    @property(Button) private rulesButton: Button | null = null;
    /** 首次查询失败时重读，写操作中断时用原请求编号恢复。 */
    @property(Button) private retryButton: Button | null = null;
    /** 按固定座次 ID 1～6 排序的交互类型。 */
    @property([Button]) private seatButtons: Button[] = [];
    /** 与座次同序的玩家或空位标签。 */
    @property([Label]) private seatNames: Label[] = [];
    /** 与座次同序的称号图标。 */
    @property([Sprite]) private seatTitles: Sprite[] = [];
    /** 与座次同序的待机模型挂点。 */
    @property([Node]) private seatModels: Node[] = [];
    /** 依次保存彩虹之王、骑士和护卫的原始称号。 */
    @property([SpriteFrame]) private titleFrames: SpriteFrame[] = [];
    /** 打开的地图才可响应父页面操作和迟到回包。 */
    private opened = false;
    /** 当前站位到演员的映射；只在形象变化时替换，对应座次从 1 开始。 */
    private readonly actors = new Map<number, { skin: number; actor: SpineActor }>();
    /** 当前战报 ID，用于防止关页后迟到的播放器提交状态。 */
    private activeBattleId: string | null = null;
    /** 战报返回的停止函数，退回地图或关闭时释放。 */
    private stopReplay: (() => void) | null = null;
    /** 只有第一次结束回调可打开本次结果窗口。 */
    private showingResult = false;

    /** 监听已校验的独立状态并请求六个座位。 */
    public onOpen(args?: RainbowViewArgs): void {
        super.onOpen(args);
        if (!args?.account.snapshot.role || !this.background || !this.layout || !this.battleBackground
            || !this.battleHost || !this.backButton || !this.rulesButton || !this.retryButton
            || this.seatButtons.length !== 6 || this.seatNames.length !== 6 || this.seatModels.length !== 6
            || this.seatTitles.length !== 6 || this.titleFrames.length !== 3) {
            throw new Error("彩虹圣殿地图参数或预制体绑定缺失");
        }
        this.opened = true;
        this.ownListener(RainbowPresentationUtils.bindButton(this.backButton, args.backToHall));
        this.ownListener(RainbowPresentationUtils.bindButton(this.rulesButton, () => this.showRules()));
        this.ownListener(RainbowPresentationUtils.bindButton(this.retryButton,
            () => RainbowController.instance.refreshVisible()));
        this.seatButtons.forEach((button, index) => {
            this.ownListener(RainbowPresentationUtils.bindButton(button, () => this.openSeat(index + 1)));
        });
        this.ownListener(EventDispatcher.instance.on("rainbow.updated", this, this.paint));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fit()));
        this.schedule(this.refreshSeats, 15);
        RainbowController.instance.setVisible(true);
        this.paint();
    }

    /** 离开圣殿时停止可见请求、作废迟到播放，并释放六座演员。 */
    public onClose(): void {
        this.opened = false;
        this.unschedule(this.refreshSeats);
        RainbowController.instance.setVisible(false);
        this.stopBattle();
        for (const row of this.actors.values()) {
            row.actor.node.destroy();
        }
        this.actors.clear();
    }

    /** 吸收其他玩家的占位变化，战斗播放中无需刷新不可见地图。 */
    private refreshSeats(): void {
        if (!this.activeBattleId && !UIManager.instance.isOpen(FormationView)
            && !RainbowController.instance.busy && RainbowModel.instance.state) {
            RainbowController.instance.refreshVisible();
        }
    }

    /** 地图底图铺满可见区，神位位置按旧设计百分比提供窄屏布局。 */
    private fit(): void {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        this.background!.setContentSize(box.width, box.height);
        this.battleBackground!.setContentSize(box.width, box.height);
        this.layout!.node.setScale(box.width / this.layout!.width, box.height / this.layout!.height, 1);
    }

    /** 渲染一次权威快照，空位仍展示对应类型守军。 */
    private paint(): void {
        if (!this.opened) {
            return;
        }
        const state = RainbowModel.instance.state;
        const controller = RainbowController.instance;
        this.retryButton!.node.active = (!state && !controller.busy) || controller.needsRetry;
        for (const [index, button] of this.seatButtons.entries()) {
            const seat = state?.seats.find(row => row.id === index + 1);
            button.node.parent!.active = !!seat;
            if (!seat) {
                continue;
            }
            this.seatTitles[index].spriteFrame = this.titleFrames[seat.type - 1];
            this.seatNames[index].string = seat.owner?.name ?? RainbowPresentationUtils.language(54202);
            this.seatNames[index].color = seat.owner ? new Color(255, 223, 44) : Color.WHITE;
            const skin = RainbowPresentationUtils.skinId(seat);
            const last = this.actors.get(seat.id);
            if (last?.skin !== skin) {
                last?.actor.node.destroy();
                const actor = RainbowPresentationUtils.mountStand(this.seatModels[index], skin, 0.65);
                this.actors.set(seat.id, { skin, actor });
            }
        }
    }

    /** 展示服务器排名限制、称号加成以及被其他玩家取代的旧规则。 */
    private showRules(): void {
        void UIManager.instance.openChild(this, RulesView, {
            title: RainbowPresentationUtils.language(42054),
            message: RainbowPresentationUtils.language(42055).replace(/\\n/g, "\n"),
        }).catch(() => { /* 统一开窗入口反馈。 */ });
    }

    /** 通过唯一座次打开当前快照中的神位详情。 */
    private openSeat(seatId: number): void {
        const roleId = this.args?.account.snapshot.role?.id;
        if (!roleId || !RainbowModel.instance.state?.seats.some(row => row.id === seatId)) {
            return;
        }
        void UIManager.instance.openChild(this, RainbowChallengeView, {
            seatId,
            roleId,
            prepareFight: (id, count) => this.prepareFight(id, count),
            openHistory: () => this.openHistory(seatId),
            openArena: () => this.args?.openArena(),
        }).catch(() => { /* 统一开窗入口反馈。 */ });
    }

    /** 已占领其他神位时先确认换位规则，胜利时才由服务端释放旧神位。 */
    private prepareFight(seatId: number, evolution: number): void {
        const roleId = this.args?.account.snapshot.role?.id;
        if (RainbowModel.instance.state?.seats.some(row => row.owner?.roleId === roleId
            && row.owner && row.id !== seatId)) {
            void UIManager.instance.openChild(this, ConfirmView, {
                title: "",
                message: RainbowPresentationUtils.language(54264),
                onConfirm: () => this.openFormation(seatId, evolution),
            }).catch(() => { /* 统一开窗入口反馈。 */ });
            return;
        }
        this.openFormation(seatId, evolution);
    }

    /** 保存彩虹圣殿自己的阵容，请求用该次确认后的版本挑战。 */
    private openFormation(seatId: number, evolution: number): void {
        if (!this.opened || this.activeBattleId) {
            return;
        }
        const controller = RainbowController.instance;
        void UIManager.instance.openChild(this, FormationView, {
            title: "阵容调整",
            closeAfterSave: true,
            formation: {
                read: () => this.readFormation(),
                save: (draft, done) => controller.saveFormation(draft, done),
                watch: changed => EventDispatcher.instance.on("rainbow.updated", this, changed),
            },
            complete: confirmed => {
                if (confirmed && this.opened) {
                    controller.challenge(seatId, evolution,
                        (result, replay) => this.play(result.battleId, replay, result));
                }
            },
        }).catch(() => { /* 统一开窗入口反馈。 */ });
    }

    /** 可用阵型取共用解锁项，站位和版本只读该模式独立阵容。 */
    private readFormation(): MainFormation | null {
        const current = HeroRosterModel.instance.snapshot.mainFormation;
        const formation = RainbowModel.instance.state?.lineup;
        if (!current || !formation) {
            return null;
        }
        return {
            ...current,
            ...formation,
            assistanceUnlocked: false,
            options: current.options?.map(row => ({
                formationId: row.formationId,
                openPositions: row.openPositions.filter(position => position < 9),
            })),
        };
    }

    /** 通过神位读取冻结记录，旧战报回放不会进入挑战结算。 */
    private openHistory(seatId: number): void {
        void UIManager.instance.openChild(this, RainbowHistoryView, {
            seatId,
            replay: (battleId, stillOpen) => RainbowController.instance.loadReplay(seatId, battleId, bytes => {
                if (stillOpen()) {
                    this.play(battleId, bytes);
                }
            }),
        }).catch(() => { /* 统一开窗入口反馈。 */ });
    }

    /** 使用共用播放器显示真实挑战或历史战报，关闭后恢复神位地图。 */
    private play(battleId: string, bytes: Uint8Array, result?: RainbowSettlement): void {
        if (!this.opened || this.activeBattleId) {
            return;
        }
        UIManager.instance.closeChildren(this);
        this.activeBattleId = battleId;
        this.layout!.node.active = false;
        this.battleBackground!.node.active = true;
        this.battleHost!.active = true;
        const current = () => this.opened && this.activeBattleId === battleId;
        const complete = async () => this.finishBattle(battleId, bytes, result);
        void BattleReplayPreview.open(this.battleHost!, bytes, false, undefined, undefined, "彩虹圣殿",
            true, complete, false, () => !current(), undefined, undefined, "彩虹圣殿阵容", complete).then(stop => {
            if (current()) {
                this.stopReplay = stop;
            } else {
                stop();
            }
        }, error => {
            if (current()) {
                GameLog.shared.classified("MODULE", "warn", "RainbowView", "彩虹圣殿战报播放失败：" + String(error));
                void complete();
            }
        });
    }

    /** 只在新挑战获胜后显示所占神位及加成，历史回放只返回地图。 */
    private finishBattle(battleId: string, bytes: Uint8Array, result?: RainbowSettlement): void {
        if (!this.opened || this.activeBattleId !== battleId || this.showingResult) {
            return;
        }
        if (!result?.won) {
            if (result) {
                UIManager.instance.toast("挑战失败");
            }
            this.stopBattle();
            return;
        }
        const seat = result.state.seats.find(row => row.id === result.seatId);
        if (!seat) {
            this.stopBattle();
            return;
        }
        this.showingResult = true;
        try {
            const detail = BattleReplayUtils.parse(bytes);
            void UIManager.instance.openChild(this, RainbowResultView, {
                seat, units: detail.units, names: detail.names, backToTemple: () => this.stopBattle(),
            }).catch(() => this.stopBattle());
        } catch (error) {
            GameLog.shared.classified("MODULE", "warn", "RainbowView", "彩虹圣殿结果读取失败：" + String(error));
            this.stopBattle();
        }
    }

    /** 撤销唯一活动战场，停用地图后方的播放背景和挂点。 */
    private stopBattle(): void {
        this.activeBattleId = null;
        this.showingResult = false;
        this.stopReplay?.();
        this.stopReplay = null;
        if (this.layout && this.battleHost && this.battleBackground) {
            this.layout.node.active = true;
            this.battleBackground.node.active = false;
            this.battleHost.active = false;
        }
    }
}
