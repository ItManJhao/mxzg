/**
 * 彩虹圣殿夺位成功后的专用结算。
 * 展示冻结的神位称号、其真实属性加成和通用战斗统计，关闭后返回地图。
 */
import { _decorator, Button, Label, Sprite, SpriteFrame, UITransform } from "cc";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import type { RainbowSeat } from "../../../platform/Protocol";
import { BattleDetailLayer, type BattleDetailArgs } from "../../battle/ui/BattleDetailLayer";
import { RainbowPresentationUtils } from "../utils/RainbowPresentationUtils";

const { ccclass, property } = _decorator;

/** 播放结束后由地图提交的真实战斗统计与夺位结果。 */
interface RainbowResultArgs extends Pick<BattleDetailArgs, "units" | "names"> {
    /** 此战占领的神位信息，来自当时冻结的成功回包。 */
    readonly seat: RainbowSeat;
    /** 离开结算时恢复神位地图。 */
    readonly backToTemple: () => void;
}

@UIRegistry.view({
    id: "rainbow-result", prefab: "bundles/module/rainbow/prefabs/RainbowResultView",
    layer: UILayer.Popup, hostId: "remake-modal", cache: false, allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("RainbowResultView")
export class RainbowResultView extends BaseView<RainbowResultArgs> {
    /** 居中横幅跟随可用宽高等比布局。 */
    @property(UITransform) private panel: UITransform | null = null;
    /** 点击可打开通用战报详情。 */
    @property(Button) private detailsButton: Button | null = null;
    /** 返回当前圣殿地图。 */
    @property(Button) private closeButton: Button | null = null;
    /** 此战占据的新称号。 */
    @property(Sprite) private title: Sprite | null = null;
    /** 夺位角色当前生效的攻击百分比。 */
    @property(Label) private attackBonus: Label | null = null;
    /** 夺位角色当前生效的生命百分比。 */
    @property(Label) private healthBonus: Label | null = null;
    /** 彩虹之王、骑士、护卫按类型顺序存放。 */
    @property([SpriteFrame]) private titleFrames: SpriteFrame[] = [];

    /** 展示冻结奖励并接入战斗统计和关闭。 */
    public onOpen(args?: RainbowResultArgs): void {
        super.onOpen(args);
        if (!args || !this.panel || !this.detailsButton || !this.closeButton || !this.title
            || !this.attackBonus || !this.healthBonus || this.titleFrames.length !== 3) {
            throw new Error("彩虹圣殿挑战结算参数或绑定缺失");
        }
        this.title.spriteFrame = this.titleFrames[args.seat.type - 1];
        this.attackBonus.string = "攻击力：+" + RainbowPresentationUtils.bonus(args.seat.attackBonus);
        this.healthBonus.string = "生命值：+" + RainbowPresentationUtils.bonus(args.seat.healthBonus);
        this.ownListener(RainbowPresentationUtils.bindButton(this.closeButton, () => this.close()));
        this.ownListener(RainbowPresentationUtils.bindButton(this.detailsButton, () => {
            void UIManager.instance.openChild(this, BattleDetailLayer, {
                units: args.units, names: args.names, won: true,
            }).catch(() => { /* 统一开窗入口反馈。 */ });
        }));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node,
            () => RainbowPresentationUtils.fitPanel(this.node, this.panel!)));
    }

    /** 不再次结算，关闭时仅让地图停止当前播放。 */
    public onClose(): void {
        this.args?.backToTemple();
    }
}
