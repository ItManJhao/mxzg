/**
 * 只读战斗统计弹层：由结算战报按钮打开，复用旧BattleDetail布局和双方横向SuperScroll。
 * 持有该场冻结展示参数，不联网、不重算战斗、不发奖；独立于结算倒计时，关闭时释放本页监听。
 */
import { _decorator, Button, Label, Node, UITransform } from "cc";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { prepareHeroDetailConfig } from "../../../config/RemakeConfig";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { bindVisibleRefresh, fitVisibleRoot } from "../../../framework/ui/visibleFit";
import { HeroCatalog } from "../../hero/utils/HeroCatalog";
import { BattleReplayUnit } from "../utils/BattleReplayUtils";
import { BattleStatisticsUtils } from "../utils/BattleStatisticsUtils";
import { BattleDetailCell } from "./BattleDetailCell";

const { ccclass, property } = _decorator;

/** 来自该场已校验战报，不以当前名册或资产替换历史数据。 */
export interface BattleDetailArgs {
    readonly units: readonly BattleReplayUnit[];
    readonly won: boolean;
}

@ccclass("BattleDetailLayer")
export class BattleDetailLayer extends BaseView<BattleDetailArgs> {
    /** 旧600×750主体，竖屏等比收窄。 */
    @property(Node) panel: Node | null = null;
    /** 全屏遮罩，只阻挡穿透并关闭本页。 */
    @property(Node) backdrop: Node | null = null;
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
    /** 关闭后为true，阻止迟到配置更新已销毁页面。 */
    private released = false;

    /** 绑定关闭并加载显示配置；不发送业务请求，异步失败交UIManager统一处理。 */
    public onOpen(args?: BattleDetailArgs): void {
        super.onOpen(args);
        if (!args || !this.panel || !this.backdrop || !this.closeButton || !this.attackerList
            || !this.defenderList || !this.attackerWin || !this.defenderWin || !this.missingNotice) {
            throw new Error("战斗统计参数或预制体绑定缺失");
        }
        this.beginOpen();
        this.released = false;
        this.attackerWin.active = args.won;
        this.defenderWin.active = !args.won;
        const missing = args.units.some(unit => unit.totalDamage == null || unit.totalTakenDamage == null || unit.totalRecovery == null);
        this.missingNotice.string = missing ? "旧战报部分统计未记录，— 表示缺失" : "";
        const close = () => this.close();
        this.closeButton.node.on(Button.EventType.CLICK, close);
        this.backdrop.on(Button.EventType.CLICK, close);
        this.ownListener(() => this.closeButton?.node.off(Button.EventType.CLICK, close));
        this.ownListener(() => this.backdrop?.off(Button.EventType.CLICK, close));
        bindVisibleRefresh(this.node, () => this.fitViewport());
        void this.prepare(args).then(() => {
            if (!this.released) {
                this.finishOpen();
            }
        }).catch(error => {
            if (!this.released) {
                this.failOpen(error instanceof Error ? error : new Error(String(error)));
            }
        });
    }

    /** 同源配置仅用于名称和图标；双方最大值取同一战报名册，顺序不按伤害重排。 */
    private async prepare(args: BattleDetailArgs): Promise<void> {
        await prepareHeroDetailConfig();
        if (this.released || !this.node.isValid) {
            return;
        }
        const catalog = new HeroCatalog(GameConfig.instance.getFile(GConfig.HeroType), GameConfig.instance.getFile(GConfig.Item));
        const rows = BattleStatisticsUtils.rows(args.units);
        for (const [faction, scroll] of [[1, this.attackerList!], [2, this.defenderList!]] as const) {
            scroll.validateBindings();
            scroll.list.setData(rows.filter(row => row.unit.faction === faction), (node, row) => {
                const cell = node.getComponent(BattleDetailCell);
                if (!cell) {
                    throw new Error("战斗统计列表缺少BattleDetailCell");
                }
                cell.show(row, catalog.find(row.unit.templateId));
            });
            scroll.toStart();
        }
    }

    /** 遮罩铺满可见区域；只缩放静态主体，不修改单元布局或服务器站位。 */
    private fitViewport(): void {
        if (this.released || !this.panel || !this.backdrop) {
            return;
        }
        const box = fitVisibleRoot(this.node);
        const scale = Math.min(1, (box.width - 24) / 600);
        this.backdrop.getComponent(UITransform)!.setContentSize(box.width, box.height);
        this.panel.setScale(scale, scale, 1);
        this.panel.setPosition(-300 * scale, -375 * scale, 0);
    }

    /** 标记关闭，BaseView释放监听；迟到资源不能重新挂载，不操作结算或资产。 */
    public onClose(): void {
        this.released = true;
        this.finishOpen();
    }
}
