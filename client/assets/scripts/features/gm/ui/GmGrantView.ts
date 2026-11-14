/**
 * GM 独立发放窗：从菜单固定选择英雄或道具，读取真实配置并转交唯一 GmController。
 * 完整表单由 Prefab 保存，SuperScroll 负责列表复用；关窗只清理展示，资产等待服务端推送。
 * 关闭或重开后忽略旧异步结果，不在 View 中创建实例或写 Model。
 */
import { _decorator, Button, EditBox, Label, Node } from "cc";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { ErrorUtils } from "../../../core/ErrorUtils";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { GmGrantArgs } from "../data/GmViewArgs";
import { GmOptionCellView } from "./GmOptionCellView";

const { ccclass, property } = _decorator;

/** 只读配置选项，不代表玩家已拥有的资产。 */
interface GmOption {
    /** 提交服务端重新校验的配置 ID。 */
    id: number;
    /** 搜索和选择使用的配置名称。 */
    name: string;
}

@UIRegistry.view({
    id: "gm-grant",
    prefab: "bundles/module/gm/prefabs/GmGrantView",
    layer: UILayer.Popup,
    cache: false,
    allowMultiple: false,
    hostId: "remake-modal",
    modal: { mask: true, closeOnOutside: false },
})
@ccclass("GmGrantView")
export class GmGrantView extends BaseView<GmGrantArgs> {
    /** 当前英雄或道具发放标题。 */
    @property(Label) title: Label | null = null;
    /** 当前测试角色说明。 */
    @property(Label) owner: Label | null = null;
    /** 当前选中配置名称和 ID。 */
    @property(Label) selection: Label | null = null;
    /** 固定限制和同步状态，操作结果通过全局飘字展示。 */
    @property(Label) message: Label | null = null;
    /** 展开或收起配置列表。 */
    @property(Button) dropdownButton: Button | null = null;
    /** 开关已确认且没有发放在途时可点击。 */
    @property(Button) grantButton: Button | null = null;
    /** 只关闭本窗，返回下方总菜单。 */
    @property(Button) closeButton: Button | null = null;
    /** 名称或配置 ID 搜索输入。 */
    @property(EditBox) search: EditBox | null = null;
    /** 数量输入，提交时校验为 1～9999 的整数。 */
    @property(EditBox) quantity: EditBox | null = null;
    /** Prefab 保存的下拉区域。 */
    @property(Node) dropdown: Node | null = null;
    /** 由 SuperContent 处理格子复用的配置列表。 */
    @property(SuperScroll) options: SuperScroll | null = null;
    /** 当前类别的配置投影，每次打开重建。 */
    private rows: GmOption[] = [];
    /** 真实列表选中项；关闭和重开时清空。 */
    private selected: GmOption | null = null;
    /** true 表示关闭，旧状态和发放结果不再展示。 */
    private closed = true;
    /** 本次打开的事件清理函数。 */
    private stops: Array<() => void> = [];

    /** 初始化固定类别的配置选择，服务端开关查询完成前禁止发放。 */
    onOpen(args: GmGrantArgs): void {
        this.releaseBindings();
        this.args = args;
        this.closed = false;
        this.title!.string = args.kind === "hero" ? "英雄 GM" : "道具 GM";
        this.owner!.string = "当前角色：" + args.nickname + "\n" + args.roleId;
        this.grantButton!.interactable = false;
        this.message!.string = "正在检查服务端 GM 开关…";
        this.quantity!.string = "1";
        this.search!.string = "";
        this.selected = null;
        this.selection!.string = (args.kind === "hero" ? "英雄" : "道具") + "：请选择 ▼";
        ViewportLayoutUtils.fitVisibleRoot(this.node);
        this.bindButton(this.closeButton!, () => this.close());
        this.bindButton(this.dropdownButton!, () => {
            this.dropdown!.active = !this.dropdown!.active;
        });
        this.bindButton(this.grantButton!, () => void this.grant());
        const search = () => this.paintOptions();
        this.search!.node.on(EditBox.EventType.TEXT_CHANGED, search);
        this.stops.push(() => {
            if (this.search?.node.isValid) {
                this.search.node.off(EditBox.EventType.TEXT_CHANGED, search);
            }
        });
        this.readOptions(args.kind);
        this.dropdown!.active = true;
        this.paintOptions();
        void this.readStatus(args);
    }

    /** 搜索列表只投影本类别的ID与名称；语言直接读统一索引，不复制全语言表。 */
    private readOptions(kind: "hero" | "item"): void {
        const db = GameConfig.instance;
        if (kind === "hero") {
            this.rows = db.getConfig(GConfig.HeroType)
                .filter(row => typeof row.type === "number" && row.type > 0)
                .map(row => ({ id: row.type as number, name: String(row.note || row.type) }));
            return;
        }
        this.rows = db.getConfig(GConfig.Item)
            .filter(row => typeof row.idx === "number" && row.idx > 0)
            .map(row => ({
                id: row.idx as number,
                name: db.getConfig(GConfig.Language, row.name ?? "")?.value || String(row.idx),
            }));
    }

    /** 真实开关为开启才允许提交；失败保持禁用并通过全局飘字报告原因。 */
    private async readStatus(args: GmGrantArgs): Promise<void> {
        try {
            const enabled = await args.controller.enabled();
            if (!this.closed && this.args === args) {
                this.grantButton!.interactable = enabled;
                this.message!.string = enabled ? this.instructions() : "服务端 GM 已关闭，当前不能发放。";
            }
        } catch (error) {
            if (!this.closed && this.args === args) {
                this.message!.string = "服务端 GM 状态暂不可用，请重新打开检查。";
                UIManager.instance.toast("GM 状态检查失败：" + ErrorUtils.messageOf(error));
            }
        }
    }

    /** 返回固定使用说明，最终类型和数量以服务端真实校验为准。 */
    private instructions(): string {
        return this.args?.kind === "hero"
            ? "仅用于测试。英雄每次最多 20 个，发放后等待服务端同步。"
            : "按真实配置发放；期限道具每次最多 100 件，未恢复类型由服务端拒绝。";
    }

    /** 搜索最多展示 100 条配置，列表位置、尺寸和复用完全交给 SuperScroll。 */
    private paintOptions(): void {
        const word = this.search!.string.trim().toLowerCase();
        const rows = this.rows.filter(row => (row.name + " " + row.id).toLowerCase().includes(word)).slice(0, 100);
        this.options!.list.setData(rows, (node, row) => node.getComponent(GmOptionCellView)!.show(
            row.name + "  [" + row.id + "]",
            () => {
                this.selected = row;
                this.selection!.string = row.name + " [" + row.id + "] ▼";
                this.dropdown!.active = false;
            },
        ));
        this.options!.toStart();
    }

    /** 发放交控制器；结果未知保留幂等键，GM 关闭拒绝后按钮保持禁用。 */
    private async grant(): Promise<void> {
        const args = this.args;
        if (this.closed || !args || !this.grantButton!.interactable) {
            return;
        }
        const selected = this.selected;
        const quantity = this.quantity!.string.trim();
        if (!selected || !/^\d+$/.test(quantity)) {
            UIManager.instance.toast("请先选择配置并输入整数数量");
            return;
        }
        this.grantButton!.interactable = false;
        this.message!.string = "正在发放，等待服务端确认…";
        let allowRetry = true;
        try {
            await args.controller.grant(args.roleId, args.kind, selected.id, Number(quantity));
            if (!this.closed && this.args === args) {
                UIManager.instance.toast("发放成功，资产由服务端同步");
            }
        } catch (error) {
            allowRetry = (error as { code?: string })?.code !== "GM_DISABLED";
            if (!this.closed && this.args === args) {
                UIManager.instance.toast("发放失败：" + ErrorUtils.messageOf(error));
            }
        } finally {
            if (!this.closed && this.args === args) {
                this.grantButton!.interactable = allowRetry;
                this.message!.string = allowRetry ? this.instructions() : "服务端 GM 已关闭，当前不能发放。";
            }
        }
    }

    /** 登记本窗按钮和清理，重复打开不叠加监听。 */
    private bindButton(button: Button, action: () => void): void {
        const node = button.node;
        node.on(Button.EventType.CLICK, action);
        this.stops.push(() => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, action);
            }
        });
    }

    /** 清理展示，不销毁控制器或未知结果请求。 */
    onClose(): void {
        this.closed = true;
        this.releaseBindings();
        this.args = undefined;
        this.rows = [];
        this.selected = null;
    }

    /** 只清理本次登记的监听。 */
    private releaseBindings(): void {
        for (const stop of this.stops.splice(0)) {
            stop();
        }
    }
}
