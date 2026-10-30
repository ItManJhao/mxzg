import { _decorator, Button, Mask, Node, Prefab, UITransform, view } from "cc";
import { BaseView } from "../../../framework/ui/BaseView";
import { spawnPrefab } from "../../../ui/prefabLoad";
import { ancestorScale } from "../../../ui/visibleFit";
import type { ServerSelection, GameServer } from "../ServerSelection";
import { ServerCellView } from "./ServerCellView";
const { ccclass, property } = _decorator;
@ccclass("ServerPickerView")
export class ServerPickerView extends BaseView<ServerSelection> {
    @property(Button)
    closeButton: Button | null = null;
    @property(Node)
    serverContent: Node | null = null;
    @property(Node)
    regionContent: Node | null = null;
    @property(Node)
    scrollHost: Node | null = null;
    @property(Node)
    scrollPort: Node | null = null;
    @property(Prefab)
    cellPrefab: Prefab | null = null;
    @property(Prefab)
    dimPrefab: Prefab | null = null;
    private off: (() => void) | null = null;
    private region = "";
    private dim: Node | null = null;
    private dismiss = () => this.close();
    onOpen(selection?: ServerSelection): void {
        if (!selection || !this.cellPrefab || !this.dimPrefab || !this.serverContent || !this.regionContent)
            throw new Error("选服 Prefab 或数据未绑定");
        this.args = selection;
        this.region = selection.selected?.regionId || selection.servers[0].regionId;
        this.closeButton?.node.on(Button.EventType.CLICK, this.dismiss);
        this.dim = spawnPrefab(this.dimPrefab, this.node);
        this.dim.setSiblingIndex(0);
        this.dim.getChildByName("dim")?.on(Button.EventType.CLICK, this.dismiss);
        const mask = this.scrollHost?.getComponent(Mask);
        if (mask)
            this.scrollHost?.removeComponent(mask);
        if (this.scrollPort)
            (this.scrollPort.getComponent(Mask) || this.scrollPort.addComponent(Mask)).type = Mask.Type.GRAPHICS_RECT;
        view.on("canvas-resize", this.fit, this);
        this.off = selection.subscribe(() => this.paint());
        this.fit();
        this.paint();
    }
    private fit(): void {
        const { width, height } = view.getVisibleSize();
        const scale = Math.min(width * 0.94 / 614, height * 0.86 / 798);
        this.node.setScale(scale / ancestorScale(this.node), scale / ancestorScale(this.node), 1);
        this.node.setPosition(-307 * scale, -399 * scale, 0);
        this.dim?.setPosition(307, 399, 0);
        const background = this.dim?.getChildByName("dim");
        background?.getComponent(UITransform)?.setContentSize(width / scale + 8, height / scale + 8);
    }
    private paint(): void {
        const selection = this.args!;
        for (const content of [this.regionContent!, this.serverContent!])
            for (const child of content.children.slice())
                child.destroy();
        const regions = Array.from(new Map(selection.servers.map(row => [row.regionId, row])).values());
        regions.forEach((row, index) => this.cell(this.regionContent!, index, { ...row, name: row.regionName, enabled: true }, row.regionId === this.region, () => { this.region = row.regionId; this.paint(); }, true));
        const servers = selection.servers.filter(row => row.regionId === this.region);
        this.serverContent!.getComponent(UITransform)?.setContentSize(362, Math.max(602, servers.length * 88));
        servers.forEach((row, index) => this.cell(this.serverContent!, index, row, selection.selected?.id === row.id, () => { selection.choose(row.id); this.close(); }));
    }
    private cell(parent: Node, index: number, server: GameServer, selected: boolean, tap: () => void, region = false): void {
        const node = spawnPrefab(this.cellPrefab!, parent);
        node.setPosition(0, -88 * (index + 1), 0);
        const cell = node.getComponent(ServerCellView);
        if (!cell)
            throw new Error("ChooseServerCell 缺少 ServerCellView");
        cell.show(server, selected, tap, region);
    }
    onClose(): void {
        this.off?.();
        this.off = null;
        view.off("canvas-resize", this.fit, this);
        this.closeButton?.node.off(Button.EventType.CLICK, this.dismiss);
    }
}
