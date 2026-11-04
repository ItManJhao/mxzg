/** 游戏内开发 GM 弹窗：静态 Prefab 和 SuperScroll 下拉选择，发放交给 GmController。 */
import { _decorator, Button, EditBox, Label, Node, Sprite, SpriteFrame, UITransform, view } from "cc";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { ancestorScale } from "../../../framework/ui/visibleFit";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { GmController } from "../GmController";
import { GmOptionCellView } from "./GmOptionCellView";
const { ccclass, property } = _decorator;
interface Option { id: number; name: string; }
export interface GmOpenArgs { controller: GmController; roleId: string; nickname: string; }
@ccclass("GmView")
export class GmView extends BaseView<GmOpenArgs> {
    /** 当前角色说明。 */
    @property(Label) owner: Label | null = null;
    /** 英雄与道具分类按钮。 */
    @property([Button]) kindButtons: Button[] = [];
    /** 打开或收起下拉选择。 */
    @property(Button) dropdownButton: Button | null = null;
    /** 当前选择文字。 */
    @property(Label) selection: Label | null = null;
    /** 名称或 ID 搜索输入。 */
    @property(EditBox) search: EditBox | null = null;
    /** 发放数量输入。 */
    @property(EditBox) quantity: EditBox | null = null;
    /** 下拉列表区域；布局已序列化。 */
    @property(Node) dropdown: Node | null = null;
    /** 下拉滚动列表，由 SuperContent 复用格子。 */
    @property(SuperScroll) options: SuperScroll | null = null;
    /** 发放按钮，服务端关闭或请求中不可点击。 */
    @property(Button) grantButton: Button | null = null;
    /** 关闭按钮，不注销登录。 */
    @property(Button) closeButton: Button | null = null;
    /** 结果与错误提示。 */
    @property(Label) message: Label | null = null;
    /** 两种页签原图，打开时从预制体读取；切换分类仅交换展示资源。 */
    private tabFrames: Array<SpriteFrame | null> = [];
    /** 当前分类，切换后清空已选配置。 */
    private kind = "hero";
    /** 当前分类的配置投影，不保存玩家资产。 */
    private rows: Option[] = [];
    /** 当前选中配置，搜索输入本身不能当作选择。 */
    private selected: Option | null = null;
    /** 关闭后忽略异步结果。 */
    private closed = true;
    /** 本次打开的事件清理函数。 */
    private stops: Array<() => void> = [];
    /** 初始化角色、分类与事件，查询服务端开关后允许发放。 */
    onOpen(args: GmOpenArgs): void {
        this.args = args; this.closed = false; this.owner!.string = "当前角色：" + args.nickname + "\n" + args.roleId; this.grantButton!.interactable = false;
        const bind = (b: Button, fn: () => void) => { const n = b.node; n.on(Button.EventType.CLICK, fn); this.stops.push(() => { if (n.isValid) n.off(Button.EventType.CLICK, fn); }); };
        bind(this.closeButton!, () => this.close()); this.kindButtons.forEach((b, i) => bind(b, () => this.chooseKind(i === 0 ? "hero" : "item")));
        bind(this.dropdownButton!, () => { this.dropdown!.active = !this.dropdown!.active; }); bind(this.grantButton!, () => { void this.grant(); });
        const search = () => this.paintOptions(); this.search!.node.on(EditBox.EventType.TEXT_CHANGED, search); this.stops.push(() => this.search?.node?.off(EditBox.EventType.TEXT_CHANGED, search));
        const size = view.getVisibleSize(), scale = Math.min(size.width * .94 / 600, size.height * .9 / 820) / ancestorScale(this.node); this.node.setScale(scale, scale, 1);
        this.tabFrames = this.kindButtons.map(b => b.getComponent(Sprite)?.spriteFrame || null);
        const dim = this.node.getChildByName("Dim")?.getComponent(UITransform); if (dim) dim.setContentSize(size.width / (scale * ancestorScale(this.node)), size.height / (scale * ancestorScale(this.node)));
        this.quantity!.string = "1"; this.chooseKind("hero"); this.message!.string = "正在检查服务端 GM 开关…";
        void args.controller.enabled().then(enabled => { if (!this.closed) { this.grantButton!.interactable = enabled; this.message!.string = enabled ? "仅开发测试：英雄每次最多20个；期限道具最多100件" : "服务端 GM 未开启（MXZG_GM_ENABLED=true）"; } }).catch(e => { if (!this.closed) this.message!.string = e instanceof Error ? e.message : String(e); });
    }
    /** 切换类别时按共享表创建展示索引，不创建英雄或库存假数据。 */
    private chooseKind(kind: string): void {
        this.kind = kind; this.kindButtons.forEach((b, i) => { const sprite = b.getComponent(Sprite); if (sprite) sprite.spriteFrame = this.tabFrames[(kind === "hero") === (i === 0) ? 0 : 1]; }); this.selected = null; this.selection!.string = (kind === "hero" ? "英雄" : "道具") + "：请选择 ▼"; this.search!.string = "";
        const db = GameConfig.instance; const language = new Map(db.getFile(GConfig.Language).rows.map(r => [String(r.key), String(r.value)]));
        this.rows = kind === "hero" ? db.getFile(GConfig.HeroType).rows.filter(r => typeof r.type === "number" && r.type > 0).map(r => ({ id: r.type as number, name: String(r.note || r.type) })) : db.getFile(GConfig.Item).rows.filter(r => typeof r.idx === "number" && r.idx > 0).map(r => ({ id: r.idx as number, name: language.get(String(r.name)) || String(r.idx) }));
        this.dropdown!.active = true; this.paintOptions();
    }
    /** 搜索所有配置，最多显示100条，列表尺寸和位置完全交给 SuperScroll。 */
    private paintOptions(): void {
        const word = this.search!.string.trim().toLowerCase(); const rows = this.rows.filter(r => (r.name + " " + r.id).toLowerCase().includes(word)).slice(0, 100);
        this.options!.list.setData(rows, (node, row) => node.getComponent(GmOptionCellView)!.show(row.name + "  [" + row.id + "]", () => { this.selected = row; this.selection!.string = row.name + " [" + row.id + "] ▼"; this.dropdown!.active = false; })); this.options!.toStart();
    }
    /** 只转交发放意图；成功不直接修改资产，等待服务器统一同步。 */
    private async grant(): Promise<void> {
        if (!this.selected || !/^\d+$/.test(this.quantity!.string.trim())) { this.message!.string = "请先选择配置并输入整数数量"; return; }
        this.grantButton!.interactable = false; this.message!.string = "正在发放…";
        try { await this.args!.controller.grant(this.args!.roleId, this.kind, this.selected.id, Number(this.quantity!.string)); if (!this.closed) this.message!.string = "发放成功，资产由服务端同步。"; }
        catch (e) { if (!this.closed) this.message!.string = "发放失败：" + (e instanceof Error ? e.message : String(e)); }
        finally { if (!this.closed) this.grantButton!.interactable = true; }
    }
    /** 关闭清理事件，控制器保留未确认请求供安全重试。 */
    onClose(): void { this.closed = true; for (const stop of this.stops.splice(0)) stop(); this.args = undefined; }
}
