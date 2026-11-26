/**
 * 圣殿挑战记录单元，使用冻结的玩家名称、进化次数、时间与上阵英雄。
 * 绑定由 SuperContent 驱动，回收时解除当前行的回放操作。
 */
import { _decorator, Button, Component, Label, Node } from "cc";
import { ResManager } from "../../../framework/assets/ResManager";
import type { RainbowHistoryEntry } from "../../../platform/Protocol";
import { HeroIconCellView } from "../../hero/ui/HeroIconCellView";
import { HeroCatalog } from "../../hero/utils/HeroCatalog";
import { RainbowPresentationUtils } from "../utils/RainbowPresentationUtils";

const { ccclass, property } = _decorator;

@ccclass("RainbowHistoryCell")
export class RainbowHistoryCell extends Component {
    /** 记录写入时冻结的挑战者昵称。 */
    @property(Label) private attacker: Label | null = null;
    /** 战斗发生的区服本地时间。 */
    @property(Label) private timestamp: Label | null = null;
    /** 当时挑战阵容的实际战力，后续培养不改变记录。 */
    @property(Label) private power: Label | null = null;
    /** 此战选择的进化次数。 */
    @property(Label) private evolution: Label | null = null;
    /** 播放该神位的冻结战报。 */
    @property(Button) private replayButton: Button | null = null;
    /** 六个静态头像模板结合英雄实际外观、星级和等级。 */
    @property([Node]) private heroSlots: Node[] = [];
    /** 当前虚拟列表单元上的唯一点击监听，换绑或销毁时解除。 */
    private detach: (() => void) | null = null;

    /** 将被冻结的战斗数据绑定到列表行，当前点击交回父窗。 */
    public render(record: RainbowHistoryEntry, replay: () => void): void {
        if (!this.attacker || !this.timestamp || !this.power || !this.evolution
            || !this.replayButton || this.heroSlots.length !== 6) {
            throw new Error("彩虹圣殿挑战记录单元绑定不完整");
        }
        this.detach?.();
        this.detach = RainbowPresentationUtils.bindButton(this.replayButton, replay);
        this.attacker.string = "挑战者：" + record.name;
        this.timestamp.string = this.serverDate(record.foughtAt);
        this.power.string = "战力 " + record.power;
        this.evolution.string = "进化 " + record.evolution + " 次";
        this.heroSlots.forEach((node, index) => {
            const hero = record.heroes[index];
            node.active = !!hero;
            if (hero) {
                const cell = node.getComponent(HeroIconCellView)!;
                const face = HeroCatalog.find(hero.heroTypeId);
                cell.show({
                    kind: "catalog", name: face?.name ?? "", showName: false,
                    face: ResManager.hero(hero.iconId) ?? face?.icon ?? null,
                    elem: face?.elem ?? null, level: hero.level, stars: hero.star, locked: false, deployed: false,
                });
                cell.button!.enabled = false;
            }
        });
    }

    /** 关闭或回收节点时不保留战报点击动作。 */
    public onDestroy(): void {
        this.detach?.();
        this.detach = null;
    }

    /** 将 Unix 毫秒显示为游戏统一时区的紧凑时间。 */
    private serverDate(milliseconds: number): string {
        const shanghaiTime = new Date(milliseconds + 8 * 3600 * 1000);
        return shanghaiTime.toISOString().slice(0, 19).replace("T", " ");
    }
}
