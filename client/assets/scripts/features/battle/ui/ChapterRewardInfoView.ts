/** 主线产物双页说明，展示全部旧配置关卡；由主线收益说明按钮打开。
 * 仅加载配置和详情资源，不请求资产/领取，不改变挑战开放范围；关闭丢弃迟到加载。 */
import { _decorator, Button, Node, Sprite, SpriteFrame } from "cc";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { ResourceAssetsUtils } from "../../../framework/assets/ResourceAssetsUtils";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { RemakeConfigUtils } from "../../../config/RemakeConfigUtils";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import { BagInfoArgs, BagInfoView } from "../../bag/ui/BagInfoView";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ChapterRewardInfoRow, ChapterRewardInfoUtils } from "../utils/ChapterRewardInfoUtils";
import { ChapterRewardInfoCell } from "./ChapterRewardInfoCell";
const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "chapter-reward-info",
    prefab: "bundles/module/battle/prefabs/ChapterRewardInfoView",
    layer: UILayer.Popup,
    cache: false,
    allowMultiple: false,
    hostId: "remake-modal",
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("ChapterRewardInfoView")
export class ChapterRewardInfoView extends BaseView {
    /** 旧560×700说明主体，竖屏等比适配。 */
    @property(Node) panel: Node | null = null;
    /** 关闭说明入口。 */
    @property(Button) closeButton: Button | null = null;
    /** 首通产物页签，默认选中。 */
    @property(Button) firstTab: Button | null = null;
    /** 挂机产物页签，不代表当前可领取物品。 */
    @property(Button) idleTab: Button | null = null;
    /** 关卡纵向列表，保留全部850行配置。 */
    @property(SuperScroll) stages: SuperScroll | null = null;
    /** 左页签旧选中图片。 */
    @property(SpriteFrame) firstSelected: SpriteFrame | null = null;
    /** 右页签旧选中图片。 */
    @property(SpriteFrame) idleSelected: SpriteFrame | null = null;
    /** 左右未选中图片来自Prefab，切页时恢复。 */
    private normalTabs: (SpriteFrame | null)[] = [];
    /** 页面只读配置投影，加载完成后设置。 */
    private rows: readonly ChapterRewardInfoRow[] = [];
    /** 本页物品显示配置，不保存库存。 */
    private catalog: BagItemCatalog | null = null;
    /** 当前页签，true展示挂机产物；每次开页默认首通，行复用时读取当前值。 */
    private idle = false;
    /** 关闭后拒绝迟到配置及详情操作。 */
    private released = false;

    /** 登记本页按钮、行渲染和物品选择，准备期间隐藏主体，失败交UIManager处理。 */
    public onOpen(): void {
        if (!this.panel || !this.closeButton || !this.firstTab || !this.idleTab || !this.stages) {
            throw new Error("产物说明页面绑定缺失");
        }
        this.beginOpen();
        this.panel.active = false;
        this.released = false;
        this.normalTabs = [this.firstTab.node.getComponent(Sprite)!.spriteFrame, this.idleTab.node.getComponent(Sprite)!.spriteFrame];
        for (const [button, action] of [[this.closeButton, () => this.close()],
            [this.firstTab, () => this.select(false)], [this.idleTab, () => this.select(true)]] as const) {
            button.node.on(Button.EventType.CLICK, action);
            this.ownListener(() => button.node.off(Button.EventType.CLICK, action));
        }
        const content = this.stages.list.node;
        content.on(SuperContent.RENDER_ITEM, this.onRender, this);
        content.on(ChapterRewardInfoCell.ITEM_SELECTED, this.showItem, this);
        this.ownListener(() => {
            if (content.isValid) {
                content.off(SuperContent.RENDER_ITEM, this.onRender, this);
                content.off(ChapterRewardInfoCell.ITEM_SELECTED, this.showItem, this);
            }
        });
        ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fitViewport());
        void this.prepare().then(() => {
            if (!this.released) {
                this.panel!.active = true;
                this.select(false);
                this.finishOpen();
            }
        }).catch(error => {
            if (!this.released) {
                this.failOpen(error instanceof Error ? error : new Error(String(error)));
            }
        });
    }

    /** 加载同源关卡与共享物品配置；节点资源作用域负责关闭后的释放。 */
    private async prepare(): Promise<void> {
        const assets = ResourceAssetsUtils.forNode(this.node);
        const [table] = await Promise.all([
            assets.loadPath("config/chapterreward", "JsonAsset"),
            RemakeConfigUtils.prepareInventoryConfig(),
        ]);
        if (this.released) {
            return;
        }
        this.rows = ChapterRewardInfoUtils.rows(table.json);
        this.catalog = new BagItemCatalog(GameConfig.instance.getFile(GConfig.Item), GameConfig.instance.getFile(GConfig.Language));
    }

    /** 选中旧页签并按配置顺序绑定所有关卡；不增加任何挑战/领取入口。 */
    private select(idle: boolean): void {
        if (this.released || !this.catalog || !this.stages) {
            return;
        }
        this.firstTab!.node.getComponent(Sprite)!.spriteFrame = idle ? this.normalTabs[0] : this.firstSelected;
        this.idleTab!.node.getComponent(Sprite)!.spriteFrame = idle ? this.idleSelected : this.normalTabs[1];
        this.idle = idle;
        this.stages.list.setData(this.rows);
        this.stages.toStart();
    }

    /** 外层列表创建或复用可视行时绑定当前页签；不保留850个行组件或手工判可见。 */
    private onRender(node: Node, row: ChapterRewardInfoRow): void {
        const cell = node.getComponent(ChapterRewardInfoCell);
        if (this.released) {
            return;
        }
        if (!cell || !this.catalog) {
            throw new Error("产物说明关卡预制体或显示索引缺失");
        }
        cell.bind(row.stage, this.idle ? row.idleItems : row.firstItems, this.catalog);
    }

    /** 打开只读物品详情，隐藏获取跳转，数量明确为产物说明而非库存。 */
    private showItem(id: number): void {
        if (this.released || !this.catalog) {
            return;
        }
        const args: BagInfoArgs = {
            source: "description",
            face: { ...this.catalog.face(id, 0), typeLine: "产物说明（只读）" },
        };
        void UIManager.instance.open(BagInfoView, args).then(info => {
            if (!this.released) {
                info.runOpen(args);
            }
        }).catch(() => { /* 加载失败或取消由 UIManager 统一处理。 */ });
    }

    /** 主体按旧尺寸等比适配；列表自行处理视口变化，遮罩尺寸和空白关闭统一归ModalLayer。 */
    private fitViewport(): void {
        if (this.released || !this.panel) {
            return;
        }
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const scale = Math.min(1, (box.width - 24) / 580, (box.height - 24) / 720);
        this.panel.setScale(scale, scale, 1);
        this.panel.setPosition(-280 * scale, -350 * scale, 0);
    }

    /** 释放本页引用并取消迟到更新；关闭说明不改动挂机时钟和资产。 */
    public onClose(): void {
        this.released = true;
        this.rows = [];
        this.catalog = null;
        UIManager.instance.closeById(UIRegistry.viewSpecOf(BagInfoView)!.id);
        this.finishOpen();
    }
}
