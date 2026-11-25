/** 公会排行子窗，使用公会模型中最新的本服前百、本人排名与前三公会。 */
import { _decorator, Button, Label, Node, Sprite, UITransform } from "cc";
import { ResManager } from "../../../framework/assets/ResManager";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import type { GuildRankEntry } from "../data/GuildRankingData";
import { GuildController } from "../GuildController";
import { GuildModel } from "../GuildModel";
import { GuildBadgeUtils } from "./GuildBadgeUtils";
import { GuildRankingCell } from "./GuildRankingCell";

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "guild-ranking",
    prefab: "bundles/module/guild/prefabs/GuildRankingView",
    layer: UILayer.Popup,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("GuildRankingView")
export class GuildRankingView extends BaseView {
    /** 面板按固定设计比例整体适配竖屏。 */
    @property(UITransform) private _panel: UITransform | null = null;
    /** 关闭按钮由 Prefab 静态传入。 */
    @property(Button) private _close: Button | null = null;
    /** 前一百名的竖向复用列表。 */
    @property(SuperScroll) private _list: SuperScroll | null = null;
    /** 名次一至三对应的领奖台资料组，缺席位置保持空置。 */
    @property([Node]) private _podiumSlots: Node[] = [];
    /** 第一至第三名的公会徽章，与 _podiumSlots 同序。 */
    @property([Node]) private _podiumBadges: Node[] = [];
    /** 第一至第三名的公会名，与 _podiumSlots 同序。 */
    @property([Label]) private _podiumNames: Label[] = [];
    /** 本人实际公会单行，与榜单采用同一行结构。 */
    @property(GuildRankingCell) private _own: GuildRankingCell | null = null;
    /** 尚未加载、未入会或未上榜时的表脚提示。 */
    @property(Label) private _ownHint: Label | null = null;
    /** 榜单为空或尚未取得时的中间提示。 */
    @property(Label) private _listHint: Label | null = null;

    /** 订阅公会排行状态后声明本页可见，控制器负责首次读取及连接恢复。 */
    public onOpen(): void {
        if (!this._panel || !this._close || !this._list || !this._own || !this._ownHint || !this._listHint
            || [this._podiumSlots, this._podiumBadges, this._podiumNames].some(array => array.length !== 3)) {
            throw new Error("公会排行缺少预制体绑定");
        }
        const close = this._close.node;
        close.on(Button.EventType.CLICK, this.close, this);
        this.ownListener(() => {
            if (close.isValid) {
                close.off(Button.EventType.CLICK, this.close, this);
            }
        });
        this._list.validateBindings();
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fit()));
        this.ownListener(EventDispatcher.instance.on("guild.ranking.updated", this, this.render));
        GuildController.instance.setFeatureVisible("ranking", true);
        this.render();
        this._list.toStart();
    }

    /** 关闭后撤销自动恢复读取，释放当前虚拟列表的数据与复用行。 */
    public onClose(): void {
        GuildController.instance.setFeatureVisible("ranking", false);
        if (this._list?.node?.isValid && this._list.content?.isValid) {
            this._list.list.clear();
        }
    }

    /** 面板高度适配短屏，Prefab 保存内部榜单和领奖台坐标。 */
    private fit(): void {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this._panel!;
        const scale = Math.min(1, box.width / panel.width, box.height * 0.88 / panel.height);
        panel.node.setScale(scale, scale, 1);
    }

    /** 同次榜单状态同时更新前三、列表和本人名次，不使用本地成员战力重算数据。 */
    private render(): void {
        const snapshot = GuildModel.instance.ranking;
        const loading = GuildController.instance.rankingBusy;
        const entries = snapshot?.entries ?? [];
        for (let index = 0; index < this._podiumSlots.length; index++) {
            const entry = entries[index];
            this.renderPodium(index, entry);
        }
        const own = snapshot?.own;
        this._list!.list.setData(entries, (node, row) => {
            node.getComponent(GuildRankingCell)!.render(row, row.guildId === own?.guildId);
        });
        this._listHint!.node.active = entries.length === 0;
        this._listHint!.string = snapshot ? "暂无上榜公会" : loading ? "正在读取排行…" : "排行暂未同步";
        this._own!.node.active = !!own && own.rank > 0;
        if (own && own.rank > 0) {
            this._own!.render(own, true);
        }
        this._ownHint!.node.active = !this._own!.node.active;
        this._ownHint!.string = snapshot ? own ? "我的公会未上榜" : "尚未加入公会" : "";
    }

    /** 缺少某个名次时隐藏名牌与徽章，静态领奖台留在原位。 */
    private renderPodium(index: number, entry: GuildRankEntry | undefined): void {
        this._podiumSlots[index].active = entry !== undefined;
        const badge = this._podiumBadges[index];
        if (!entry) {
            ResManager.setSprite(badge, null);
            return;
        }
        badge.getComponent(Sprite)!.spriteFrame = null;
        ResManager.setSprite(badge, GuildBadgeUtils.source(entry.badgeId));
        this._podiumNames[index].string = entry.name;
    }
}
