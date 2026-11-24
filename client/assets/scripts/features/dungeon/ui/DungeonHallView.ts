/** 旧版 SlzmLayer 的副本大厅。读取当前角色等级和统一配置包，展示四条入口和各自的奖励预览。 */
import { _decorator, Node, SpriteFrame, UITransform } from "cc";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { EntryGateUtils } from "../../../config/EntryGateUtils";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import type { AccountModel, AccountState } from "../../account/AccountModel";
import { BagInfoView } from "../../bag/ui/BagInfoView";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import { GameRedDotKey } from "../../common/utils/GameRedDotKey";
import { DungeonHallCardView, type DungeonHallCard } from "./DungeonHallCardView";

/** 与旧 SlzmContentLayer 相同的四个入口顺序、条件和原提示语言键。 */
const entries = [
    { gate: "main_mission", game: 1, description: 72231 },
    { gate: "main_infinite", game: 2, description: 72119 },
    { gate: "main_proving_lang", game: 3, description: 72120 },
    { gate: "main_chsd", game: 4, description: 54307 },
] as const;

/** 策划表给大厅提供的产物展示，不代表本次真实结算数量。 */
interface DungeonRewardPreview {
    readonly game_type: number;
    readonly game_id: number;
    readonly reward_show: string;
}

/** 当前主城提供的角色快照和已接通玩法入口。 */
export interface DungeonHallArgs {
    readonly account: AccountModel;
    /** 日常副本入口打开共用关卡页，默认展示金币。 */
    readonly openDailyDungeon: () => void;
}

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "dungeon-hall",
    prefab: "bundles/module/dungeon/prefabs/DungeonHallView",
    layer: UILayer.Page,
    cache: false,
    allowMultiple: false,
})
@ccclass("DungeonHallView")
export class DungeonHallView extends BaseView<DungeonHallArgs> {
    /** 预制体内的大厅布局，手机窄屏时按整体比例缩放。 */
    @property(UITransform) private _panel: UITransform | null = null;
    /** 存放入口卡模板和滚动裁剪的列表。 */
    @property(SuperScroll) private _list: SuperScroll | null = null;
    /** 四张可用入口图与最后一张旧版预告横幅。 */
    @property([SpriteFrame]) private _openArts: SpriteFrame[] = [];
    /** 四张对应的原锁定入口图。 */
    @property([SpriteFrame]) private _lockedArts: SpriteFrame[] = [];
    /** 上次渲染的角色等级，只用于避免资产变化导致列表重复换绑。 */
    private shownLevel = 0;

    /** 接入服务端角色快照和卡片监听，页面关闭时释放二者。 */
    public onOpen(args?: DungeonHallArgs): void {
        super.onOpen(args);
        const model = args?.account;
        if (!model?.snapshot.role || !this._panel || !this._list
            || this._openArts.length !== 5 || this._lockedArts.length !== 4) {
            throw new Error("副本大厅缺少角色快照或预制体绑定");
        }
        this.shownLevel = 0;
        const content = this._list.list.node;
        content.on(SuperContent.RENDER_ITEM, this.renderCard, this);
        content.on(SuperContent.SELECT_ITEM, this.selectCard, this);
        this.ownListener(() => {
            if (content.isValid) {
                content.off(SuperContent.RENDER_ITEM, this.renderCard, this);
                content.off(SuperContent.SELECT_ITEM, this.selectCard, this);
            }
        });
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fitPanel()));
        this.ownListener(model.subscribe(state => this.render(state)));
        this.render(model.snapshot);
    }

    /** 投影入口、等级与奖励预览，日常副本卡汇总各类型资格红点。 */
    private render(state: AccountState): void {
        const level = state.role?.level ?? 0;
        if (!level || level === this.shownLevel) {
            return;
        }
        const config = GameConfig.instance;
        const { rows } = config.getFileByPath("config/gamerewardshow") as { rows: readonly DungeonRewardPreview[] };
        const lockTemplate = config.requireConfig(GConfig.Language, 47032).value;
        if (!lockTemplate) {
            throw new Error("副本大厅缺少等级开启文案");
        }
        const cards: DungeonHallCard[] = entries.map((entry, index) => {
            const gate = config.requireConfig(GConfig.OpenCondition, entry.gate);
            const open = EntryGateUtils.isEntryOpen(gate, level, 0);
            const preview = rows.find(row => row.game_type === 1 && row.game_id === entry.game);
            if (!preview?.reward_show) {
                throw new Error(`副本大厅缺少奖励展示配置 ${entry.game}`);
            }
            const rewards = JSON.parse(preview.reward_show) as DungeonHallCard["rewards"];
            if (!Array.isArray(rewards) || rewards.length > 4) {
                throw new Error(`副本大厅奖励展示配置无效 ${entry.game}`);
            }
            return {
                art: (open ? this._openArts : this._lockedArts)[index],
                title: gate.name,
                description: config.requireConfig(GConfig.Language, entry.description).value ?? "",
                lockText: open ? "" : lockTemplate.replace("%s", String(gate.level)),
                reminderPath: open && entry.gate === "main_mission" ? GameRedDotKey.DAILY_DUNGEON : undefined,
                rewards,
            };
        });
        cards.push({ art: this._openArts[4], title: "", description: "", lockText: "", rewards: [] });
        this.shownLevel = level;
        this._list!.list.setData(cards);
    }

    /** 渲染当前滚动范围内的卡片，奖励点击与卡片主体选择分开。 */
    private renderCard(node: Node, card: DungeonHallCard): void {
        node.getComponent(DungeonHallCardView)!.render(card, (id, quantity) => this.openReward(id, quantity));
    }

    /** 日常副本打开共用关卡页，其他卡片提示当前实现状态。 */
    private selectCard(card: DungeonHallCard, index: number): void {
        if (index === 0) {
            this.args?.openDailyDungeon();
            return;
        }
        UIManager.instance.toast(`${card.title}玩法尚未接入`);
    }

    /** 打开配置产物说明；旧表填 0 表示只预览种类，不能当作实际发放数量。 */
    private openReward(itemId: number, quantity: number): void {
        const face = BagItemCatalog.face(itemId, quantity);
        void UIManager.instance.openChild(this, BagInfoView, {
            source: "description",
            face: quantity > 0 ? face : { ...face, typeLine: "副本产物" },
        }).catch(() => {
            // 失败提示由统一开窗入口处理，切页取消时直接关闭。
        });
    }

    /** 将背景与根铺满画布，保持入口卡片比例并留出常驻导航位置。 */
    private fitPanel(): void {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this._panel!;
        const scale = Math.min(1, box.width / panel.width, box.height / panel.height);
        panel.node.setScale(scale, scale, 1);
    }
}
