/** 主线产物双页说明，展示全部旧配置关卡；由主线收益说明按钮打开。
 * 配置读取统一GameConfig，详情美术仍按资源池加载；不请求资产/领取，不改变挑战开放范围。 */
import { _decorator, Button, Node, Sprite, SpriteFrame } from "cc";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { GameConfig } from "../../../config/GameConfig";
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
    /** 页面只读配置投影，打开时从已安装配置建立，关闭清空引用。 */
    private rows: readonly ChapterRewardInfoRow[] = [];
    /** 当前页签，true展示挂机产物；每次开页默认首通，行复用时读取当前值。 */
    private idle = false;
    /** 关闭后拒绝迟到详情操作。 */
    private released = false;

    /** 登记本页交互并读取已安装配置，投影完成后显示主体；失败交UIManager处理。 */
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
        try {
            this.readConfig();
            this.panel.active = true;
            this.select(false);
            this.finishOpen();
        } catch (error) {
            this.failOpen(error instanceof Error ? error : new Error(String(error)));
        }
    }

    /** 从GameConfig唯一快照投影关卡列表；物品按当前ID直接查询，不建立整表索引。 */
    private readConfig(): void {
        this.rows = ChapterRewardInfoUtils.rows(GameConfig.instance.getFileByPath("config/chapterreward"));
    }

    /** 选中旧页签并按配置顺序绑定所有关卡；不增加任何挑战/领取入口。 */
    private select(idle: boolean): void {
        if (this.released || !this.stages) {
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
        if (!cell) {
            throw new Error("产物说明关卡预制体缺失");
        }
        cell.bind(row.stage, this.idle ? row.idleItems : row.firstItems);
    }

    /** 打开只读物品详情，隐藏获取跳转，数量明确为产物说明而非库存。 */
    private showItem(id: number): void {
        if (this.released) {
            return;
        }
        const args: BagInfoArgs = {
            source: "description",
            face: { ...BagItemCatalog.face(id, 0), typeLine: "产物说明（只读）" },
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
        UIManager.instance.closeById(UIRegistry.viewSpecOf(BagInfoView)!.id);
        this.finishOpen();
    }
}
