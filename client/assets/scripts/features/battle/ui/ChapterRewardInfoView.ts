/** 主线产物双页说明，展示全部旧配置关卡；由主线收益说明按钮打开。
 * 仅加载配置和详情资源，不请求资产/领取，不改变挑战开放范围；关闭丢弃迟到加载。 */
import { _decorator, Button, Node, Rect, ScrollView, Sprite, SpriteFrame, UITransform, Vec3 } from "cc";
import { BaseView } from "../../../framework/ui/BaseView";
import { UIManager } from "../../../framework/ui/UIManager";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { ResourceAssetsUtils } from "../../../framework/assets/ResourceAssets";
import { bindVisibleRefresh, fitVisibleRoot } from "../../../framework/ui/visibleFit";
import { prepareInventoryConfig } from "../../../config/RemakeConfig";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import { BagInfoArgs, BagInfoView } from "../../bag/ui/BagInfoView";
import { viewSpecOf } from "../../../framework/ui/UIRegistry";
import { ChapterRewardInfoRow, ChapterRewardInfoUtils } from "../utils/ChapterRewardInfoUtils";
import { ChapterRewardInfoCell } from "./ChapterRewardInfoCell";
const { ccclass, property } = _decorator;

@ccclass("ChapterRewardInfoView")
export class ChapterRewardInfoView extends BaseView {
    /** 旧560×700说明主体，竖屏等比适配。 */
    @property(Node) panel: Node | null = null;
    /** 遮罩静态节点，适配到当前视口。 */
    @property(Node) backdrop: Node | null = null;
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
    /** 当前列表行组件，滚动时只更新可见图标。 */
    private cells: ChapterRewardInfoCell[] = [];
    /** 关闭后拒绝迟到配置及详情操作。 */
    private released = false;

    /** 登记本页按钮和滚动监听，准备资源期间隐藏主体，失败交UIManager处理。 */
    public onOpen(): void {
        if (!this.panel || !this.backdrop || !this.closeButton || !this.firstTab || !this.idleTab || !this.stages) {
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
        this.stages.node.on(ScrollView.EventType.SCROLLING, this.refreshVisible, this);
        this.ownListener(() => this.stages?.node.off(ScrollView.EventType.SCROLLING, this.refreshVisible, this));
        bindVisibleRefresh(this.node, () => this.fitViewport());
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
            prepareInventoryConfig(),
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
        this.cells = [];
        this.stages.list.setData(this.rows, (node, row) => {
            const cell = node.getComponent(ChapterRewardInfoCell);
            if (!cell) {
                throw new Error("产物说明关卡预制体缺组件");
            }
            cell.bind(row.stage, idle ? row.idleItems : row.firstItems, this.catalog!, id => this.showItem(id));
            this.cells.push(cell);
        });
        this.stages.toStart();
        this.refreshVisible();
    }

    /** 使用纵向Mask的世界矩形判可见，不自行布局或修改内容高度。 */
    private refreshVisible(): void {
        if (this.released || !this.stages?.content?.parent) {
            return;
        }
        const ui = this.stages.content.parent.getComponent(UITransform)!;
        // getBoundingBoxToWorld会合并子节点，包含850行content，不能用它作为Mask裁剪区域。
        const lower = ui.convertToWorldSpaceAR(new Vec3(-ui.width * ui.anchorX, -ui.height * ui.anchorY));
        const upper = ui.convertToWorldSpaceAR(new Vec3(ui.width * (1 - ui.anchorX), ui.height * (1 - ui.anchorY)));
        const port = new Rect(lower.x, lower.y, upper.x - lower.x, upper.y - lower.y);
        for (const cell of this.cells) {
            cell.refreshVisible(port);
        }
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

    /** 主体按旧尺寸等比适配，缩放后重新判断可视行。 */
    private fitViewport(): void {
        if (this.released || !this.panel || !this.backdrop) {
            return;
        }
        const box = fitVisibleRoot(this.node);
        const scale = Math.min(1, (box.width - 24) / 580, (box.height - 24) / 720);
        this.backdrop.getComponent(UITransform)!.setContentSize(box.width, box.height);
        this.panel.setScale(scale, scale, 1);
        this.panel.setPosition(-280 * scale, -350 * scale, 0);
        this.refreshVisible();
    }

    /** 释放本页引用并取消迟到更新；关闭说明不改动挂机时钟和资产。 */
    public onClose(): void {
        this.released = true;
        this.cells = [];
        this.rows = [];
        UIManager.instance.closeById(viewSpecOf(BagInfoView)!.id);
        this.finishOpen();
    }
}
