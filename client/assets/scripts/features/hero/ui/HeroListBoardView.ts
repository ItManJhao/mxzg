/**
 * 完整英雄页面中的静态列表板：绑定筛选交互和显示数据，不加载页面片段或调整布局。
 * 纸面、筛选图标、容量栏和视口均由主Prefab保存；名册及筛选数据由外部传入。
 */
import { _decorator, Button, Component, Label, Mask, Node } from "cc";
import { SuperScroll } from "../../../framework/ui/SuperScroll";

const { ccclass, property } = _decorator;

@ccclass("HeroListBoardView")
export class HeroListBoardView extends Component {
    /** 统一滚动容器，静态绑定SuperScroll。 */
    @property(Node) heroScroll: Node | null = null;
    /** 带Mask的裁剪视口，由Widget跟随滚动容器。 */
    @property(Node) heroPort: Node | null = null;
    /** SuperContent持有的复用内容节点，不由本组件手排。 */
    @property(Node) heroContent: Node | null = null;
    /** 当前筛选的加载、空态或错误说明。 */
    @property(Label) emptyLabel: Label | null = null;
    /** 服务端名册容量投影，位置由Prefab钉底。 */
    @property(Label) capacityLabel: Label | null = null;
    /** 六个筛选按钮，图片在Prefab绑定；顺序为全部及五个元素。 */
    @property([Button]) elemButtons: Button[] = [];

    /** 每个静态板子只绑定一份筛选回调，节点销毁时释放。 */
    private elemBound = false;

    /** 取得Prefab绑定的统一滚动组件；缺失时拒绝伪造列表。 */
    public get scroll(): SuperScroll {
        const scroll = this.heroScroll?.getComponent(SuperScroll);
        if (!scroll) {
            throw new Error("HeroListBoardView缺少SuperScroll");
        }
        return scroll;
    }

    /** 返回由统一滚动列表持有的内容节点。 */
    public get content(): Node | null {
        return this.heroContent;
    }

    /** 校验静态视口、Mask和SuperContent归属，返回当前板子是否已激活。 */
    public prepare(): boolean {
        if (!this.heroScroll || !this.heroPort || !this.heroContent) {
            throw new Error("HeroListBoardView缺少滚动绑定");
        }
        if (this.heroContent.parent !== this.heroPort || this.heroScroll.getComponent(Mask)
            || !this.heroPort.getComponent(Mask)) {
            throw new Error("HeroListBoardView需要view/Mask/content静态布局");
        }
        const scroll = this.scroll;
        if (scroll.content !== this.heroContent) {
            throw new Error("HeroListBoardView SuperScroll.content绑定错误");
        }
        scroll.validateBindings();
        return this.node.activeInHierarchy;
    }

    /** 每个静态板子只绑定一次筛选；不重新加载已由Prefab持有的六张图标。 */
    public bindElem(pick: (id: number) => void): void {
        if (this.elemBound) {
            return;
        }
        if (this.elemButtons.length !== 6 || this.elemButtons.some(button => !button?.node)) {
            throw new Error("HeroListBoardView必须绑定六个元素按钮");
        }
        this.elemBound = true;
        this.elemButtons.forEach((button, id) => {
            button.node.on(Button.EventType.CLICK, () => pick(id));
        });
    }

    /** 用选中态缩放区分当前筛选，不改变列表或固定控件布局。 */
    public markElem(elem: number): void {
        this.elemButtons.forEach((button, id) => {
            const scale = id === elem ? 1 : 0.8;
            button.node.setScale(scale, scale, 1);
        });
    }

    /** 显示当前名册投影的容量文本。 */
    public setCapacity(text: string): void {
        if (this.capacityLabel) {
            this.capacityLabel.node.active = true;
            this.capacityLabel.string = text;
        }
    }

    /** 有说明时显示空态，正常列表隐藏该文本。 */
    public setEmpty(text: string): void {
        if (this.emptyLabel) {
            this.emptyLabel.node.active = text.length > 0;
            this.emptyLabel.string = text;
        }
    }
}
