/** 每日与赛季奖励表格，复用背包奖励图、前三排名牌及原版浅色底。 */
import { _decorator, Component, Label, Node, Sprite, SpriteFrame } from "cc";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { BagItemView } from "../../bag/ui/BagItemView";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import type { ArenaReward } from "../ArenaModel";

const { ccclass, property } = _decorator;

@ccclass("ArenaRewardCell")
export class ArenaRewardCell extends Component {
    /** 将玩家选择的奖励图标传给窗口统一说明。 */
    public static readonly INSPECT = "arena-reward-inspect";
    /** 原版前三名红、银、铜徽记。 */
    @property([SpriteFrame]) private badges: SpriteFrame[] = [];
    /** 排名牌与普通档位数字互斥。 */
    @property(Sprite) private badge: Sprite | null = null;
    /** 单个名次、名次区间或当前排名。 */
    @property(Label) private rankLabel: Label | null = null;
    /** 自身档位说明，榜上的其他行关闭。 */
    @property(Label) private rankHint: Label | null = null;
    /** 榜外没有真实档位，保留底部领取预期说明。 */
    @property(Label) private noRewards: Label | null = null;
    /** 共用物品格按旧表的右侧三列布局。 */
    @property(SuperScroll) private rewards: SuperScroll | null = null;
    /** 复用行首次刷新前绑定内层滚动。 */
    private bound = false;

    /** 绘制普通区间行和底部自己的当前档位。 */
    public paint(rank: string, marker: number, items: readonly ArenaReward[], own = false): void {
        this.bindRewards();
        const frame = this.badges[marker - 1];
        this.badge!.node.active = !!frame;
        this.badge!.spriteFrame = frame ?? null;
        this.rankLabel!.node.active = !frame;
        this.rankLabel!.string = rank;
        this.rankHint!.node.active = own;
        this.noRewards!.node.active = own && items.length === 0;
        // 旧奖表从右往左按配置下标放置图标，显示顺序是竞技币、钻石、称号框。
        const blanks = Array<ArenaReward | null>(items.length ? Math.max(0, 3 - items.length) : 0).fill(null);
        const positioned = blanks.concat(Array.from(items).reverse());
        this.rewards!.list.setData(positioned);
        this.rewards!.toStart();
    }

    /** 虚拟卡销毁时解除内层监听，与其共享物品格生命周期分开。 */
    protected onDestroy(): void {
        if (this.bound && this.rewards?.content?.isValid) {
            this.rewards.list.node.targetOff(this);
        }
    }

    /** 连接共用物品格；虚拟行第一次激活前也能收到填充事件。 */
    private bindRewards(): void {
        if (this.bound) {
            return;
        }
        this.rewards!.validateBindings();
        const content = this.rewards!.list.node;
        content.on(SuperContent.RENDER_ITEM, this.drawReward, this);
        content.on(SuperContent.SELECT_ITEM, this.selectReward, this);
        this.bound = true;
    }

    /** 缺少一格时留空以保持少量奖励总是贴右。 */
    private drawReward(node: Node, reward: ArenaReward | null): void {
        const cell = node.getComponent(BagItemView)!;
        cell.show(reward, false, reward ? BagItemCatalog.face(reward.itemId, reward.quantity) : undefined);
        cell.frame!.active = !!reward;
    }

    /** 通知当前玩法窗口打开道具说明。 */
    private selectReward(reward: ArenaReward | null): void {
        if (reward) {
            const parent = this.node.parent;
            parent?.emit(ArenaRewardCell.INSPECT, reward);
        }
    }
}
