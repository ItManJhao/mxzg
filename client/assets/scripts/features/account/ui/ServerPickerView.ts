/** 选服弹窗：UIManager 管理生命周期，SuperScroll 管理区域和服务器列表；只转交选择，不发登录协议。 */
import { _decorator, Button, Node, Prefab, UITransform, view } from "cc";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { spawnPrefab } from "../../../framework/assets/PrefabLoader";
import { ancestorScale } from "../../../framework/ui/visibleFit";
import type { ServerSelection, GameServer } from "../ServerSelection";
import { ServerCellView } from "./ServerCellView";
const { ccclass, property } = _decorator;
@ccclass("ServerPickerView")
export class ServerPickerView extends BaseView<ServerSelection> {
    /** 关闭按钮，由统一窗口管理器关闭弹窗。 */
    @property(Button) closeButton: Button | null = null;
    /** 服务器列表，预制体保存格子、裁切和间距。 */
    @property(SuperScroll) serverScroll: SuperScroll | null = null;
    /** 区域列表，与服务器列表使用相同的滚动模板。 */
    @property(SuperScroll) regionScroll: SuperScroll | null = null;
    /** 通用遮罩预制体，拦截底层登录按钮。 */
    @property(Prefab) dimPrefab: Prefab | null = null;
    /** 本次打开选中的区域 ID，关闭后不保存业务状态。 */
    private region = "";
    /** 本窗口的遮罩节点，关闭时清理。 */
    private dim: Node | null = null;
    /** 本次打开的监听注销函数；重复打开前和关闭时成对清理。 */
    private stops: Array<() => void> = [];

    /** 绑定真实选服状态，初始化两列列表和适配；空列表也允许关闭。 */
    onOpen(selection?: ServerSelection): void {
        if (!selection || !this.serverScroll || !this.regionScroll || !this.dimPrefab || !this.closeButton) {
            throw new Error("选服预制体或数据未绑定");
        }
        this.onClose();
        this.args = selection;
        this.region = selection.selected?.regionId || selection.servers[0]?.regionId || "";
        this.serverScroll.validateBindings();
        this.regionScroll.validateBindings();
        this.dim = spawnPrefab(this.dimPrefab, this.node);
        this.dim.setSiblingIndex(0);
        const dismiss = () => this.close();
        for (const node of [this.closeButton.node, this.dim.getChildByName("dim")]) {
            if (!node) continue;
            node.on(Button.EventType.CLICK, dismiss);
            this.stops.push(() => { if (node.isValid) node.off(Button.EventType.CLICK, dismiss); });
        }
        view.on("canvas-resize", this.fit, this);
        this.stops.push(() => view.off("canvas-resize", this.fit, this));
        this.stops.push(selection.subscribe(() => this.paint()));
        this.fit();
        this.paint();
    }

    /** 保持旧窗口比例和整体位置，只适配视口，不手动排列列表格子。 */
    private fit(): void {
        const { width, height } = view.getVisibleSize();
        const scale = Math.min(width * 0.94 / 614, height * 0.86 / 798);
        this.node.setScale(scale / ancestorScale(this.node), scale / ancestorScale(this.node), 1);
        this.node.setPosition(-307 * scale, -399 * scale, 0);
        this.dim?.setPosition(307, 399, 0);
        this.dim?.getChildByName("dim")?.getComponent(UITransform)?.setContentSize(width / scale + 8, height / scale + 8);
    }

    /** 依据真实列表更新两列，布局和节点复用交给 SuperContent。 */
    private paint(): void {
        const selection = this.args;
        if (!selection) return;
        const regions = Array.from(new Map(selection.servers.map(row => [row.regionId, row])).values());
        if (!regions.some(row => row.regionId === this.region)) this.region = regions[0]?.regionId || "";
        this.regionScroll!.list.setData(regions, (node, row) => {
            this.paintCell(node, { ...row, name: row.regionName, enabled: true }, this.region === row.regionId, () => {
                this.region = row.regionId;
                this.paint();
                this.serverScroll!.toStart();
            }, true);
        });
        const servers = selection.servers.filter(row => row.regionId === this.region);
        this.serverScroll!.list.setData(servers, (node, row) => {
            this.paintCell(node, row, selection.selected?.id === row.id, () => {
                selection.choose(row.id);
                this.close();
            }, false);
        });
    }

    /** 向复用格子传递显示内容和选择回调，不设置格子坐标或 content 高度。 */
    private paintCell(node: Node, server: GameServer, selected: boolean, tap: () => void, region: boolean): void {
        const cell = node.getComponent(ServerCellView);
        if (!cell) throw new Error("ServerCellView 预制体缺少格子脚本");
        cell.show(server, selected, tap, region);
    }

    /** 关闭时丢弃本页参数和遮罩；按钮及订阅由 BaseView 统一释放。 */
    onClose(): void {
        for (const stop of this.stops.splice(0)) stop();
        this.args = undefined;
        this.dim?.destroy();
        this.dim = null;
    }
}
