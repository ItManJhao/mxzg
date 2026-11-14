/**
 * 只读战斗统计弹层：由结算战报按钮打开，复用旧BattleDetail布局和双方横向SuperScroll。
 * 持有该场冻结展示参数，不联网、不重算战斗、不发奖；独立于结算倒计时，关闭时释放本页监听。
 */
import { _decorator, Button, Label, Node } from "cc";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { HeroCatalog } from "../../hero/utils/HeroCatalog";
import { BattleReplayUnit } from "../utils/BattleReplayUtils";
import { BattleStatisticsUtils } from "../utils/BattleStatisticsUtils";
import { BattleDetailCell } from "./BattleDetailCell";

const { ccclass, property } = _decorator;

/** 来自该场已校验战报，不以当前名册或资产替换历史数据。 */
export interface BattleDetailArgs {
    /** 已校验的开战名称；缺失时显示明确占位，不能从当前角色或关卡猜历史。 */
    readonly names?: Readonly<{ attacker: string | null; defender: string | null }>;
    readonly units: readonly BattleReplayUnit[];
    readonly won: boolean;
}

@UIRegistry.view({
    id: "battle-detail",
    prefab: "bundles/module/battle/prefabs/BattleDetailLayer",
    layer: UILayer.Popup,
    cache: false,
    allowMultiple: false,
    hostId: "remake-modal",
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("BattleDetailLayer")
export class BattleDetailLayer extends BaseView<BattleDetailArgs> {
    /** 旧600×750主体，竖屏等比收窄。 */
    @property(Node) panel: Node | null = null;
    /** 右上角关闭按钮，不影响已完成的结算。 */
    @property(Button) closeButton: Button | null = null;
    /** 攻方名册横向列表，单元与间距由Prefab维护。 */
    @property(SuperScroll) attackerList: SuperScroll | null = null;
    /** 守方名册横向列表，模板重复也独立成格。 */
    @property(SuperScroll) defenderList: SuperScroll | null = null;
    /** 攻方胜利标识，只读取本场胜负。 */
    @property(Node) attackerWin: Node | null = null;
    /** 守方胜利标识。 */
    @property(Node) defenderWin: Node | null = null;
    /** 旧统计字段缺失时的明确提示。 */
    @property(Label) missingNotice: Label | null = null;
    /** 本场攻方名称；由Prefab保存位置和长名称收缩方式。 */
    @property(Label) attackerName: Label | null = null;
    /** 本场守方名称，不使用当前关卡推算旧战报。 */
    @property(Label) defenderName: Label | null = null;
    /** 关闭后为true，禁止继续更新统计或布局。 */
    private released = false;

    /** 绑定关闭按钮并从已安装配置展示统计；遮罩和打开失败由UIManager统一处理。 */
    public onOpen(args?: BattleDetailArgs): void {
        super.onOpen(args);
        if (!args || !this.panel || !this.closeButton || !this.attackerList
            || !this.defenderList || !this.attackerWin || !this.defenderWin || !this.missingNotice
            || !this.attackerName || !this.defenderName) {
            throw new Error("战斗统计参数或预制体绑定缺失");
        }
        this.beginOpen();
        this.released = false;
        this.attackerWin.active = args.won;
        this.defenderWin.active = !args.won;
        this.attackerName.string = args.names?.attacker ?? "我方（历史名称未记录）";
        this.defenderName.string = args.names?.defender ?? "敌方（历史名称未记录）";
        const missing = args.units.some(unit => unit.totalDamage == null || unit.totalTakenDamage == null || unit.totalRecovery == null);
        const missingPortrait = args.units.some(unit => BattleStatisticsUtils.portrait(unit) === null);
        this.missingNotice.string = [
            missing ? "部分统计未记录（—）" : "",
            missingPortrait ? "历史头像缺失，显示基础头像" : "",
        ].filter(Boolean).join("；");
        const close = () => this.close();
        this.closeButton.node.on(Button.EventType.CLICK, close);
        this.ownListener(() => this.closeButton?.node.off(Button.EventType.CLICK, close));
        ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fitViewport());
        try {
            this.paintRows(args);
            this.finishOpen();
        } catch (error) {
            this.failOpen(error instanceof Error ? error : new Error(String(error)));
        }
    }

    /** 当前格子按主键查询名称和基础图标；双方统计沿同一战报顺序，不保存配置索引或重排伤害。 */
    private paintRows(args: BattleDetailArgs): void {
        if (this.released || !this.node.isValid) {
            return;
        }
        const rows = BattleStatisticsUtils.rows(args.units);
        for (const [faction, scroll] of [[1, this.attackerList!], [2, this.defenderList!]] as const) {
            scroll.validateBindings();
            scroll.list.setData(rows.filter(row => row.unit.faction === faction), (node, row) => {
                const cell = node.getComponent(BattleDetailCell);
                if (!cell) {
                    throw new Error("战斗统计列表缺少BattleDetailCell");
                }
                cell.show(row, HeroCatalog.find(row.unit.templateId));
            });
            scroll.toStart();
        }
    }

    /** 只缩放和定位统计主体；遮罩适配归ModalLayer，不修改单元布局或服务器站位。 */
    private fitViewport(): void {
        if (this.released || !this.panel) {
            return;
        }
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const scale = Math.min(1, (box.width - 24) / 600);
        this.panel.setScale(scale, scale, 1);
        this.panel.setPosition(-300 * scale, -375 * scale, 0);
    }

    /** 标记关闭，BaseView释放监听；迟到资源不能重新挂载，不操作结算或资产。 */
    public onClose(): void {
        this.released = true;
        this.finishOpen();
    }
}
