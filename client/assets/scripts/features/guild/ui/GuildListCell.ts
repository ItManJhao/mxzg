/** 推荐与查找共用的公会虚拟格，显示徽章、等级、容量和入会状态。 */
import { _decorator, Button, Component, Label, Sprite } from "cc";
import { ResManager } from "../../../framework/assets/ResManager";
import { GuildBadgeUtils } from "./GuildBadgeUtils";

const { ccclass, property } = _decorator;

/** 目录按服务器数据决定是否可以申请加入。 */
export interface GuildCellRow {
    /** 服务器实际公会徽章编号。 */
    readonly badgeId?: number;
    /** 目录等级单列展示。 */
    readonly levelText?: string;
    readonly title: string;
    readonly detail: string;
    readonly actionText?: string;
    readonly action?: () => void;
}

@ccclass("GuildListCell")
export class GuildListCell extends Component {
    /** 行内的公会名。 */
    @property(Label) private _title: Label | null = null;
    /** 当前人数和容量。 */
    @property(Label) private _detail: Label | null = null;
    /** 正式目录的等级行。 */
    @property(Label) private _level: Label | null = null;
    /** 已同步公会的真实徽章。 */
    @property(Sprite) private _badge: Sprite | null = null;
    /** 行内加入按钮，申请已提交或公会满员时禁用。 */
    @property(Button) private _action: Button | null = null;
    /** 当前操作的标签。 */
    @property(Label) private _actionText: Label | null = null;
    /** 本节点当前绑定的数据，虚拟列表换绑时替换。 */
    private row: GuildCellRow | null = null;

    /** 将固定监听绑定在格子生命周期内，点击读取当时绑定的条目。 */
    protected onLoad(): void {
        this._action!.node.on(Button.EventType.CLICK, this.run, this);
    }

    /** 释放目录数据；子按钮可能已先被引擎销毁。 */
    protected onDestroy(): void {
        this.row = null;
        const actionNode = this._action?.node;
        if (actionNode?.isValid) {
            actionNode.off(Button.EventType.CLICK, this.run, this);
        }
    }

    /** 渲染一个复用节点，并根据实际权限显示操作状态。 */
    public render(row: GuildCellRow): void {
        this.row = row;
        this._title!.string = row.title;
        this._detail!.string = row.detail;
        this._level!.node.active = !!row.levelText;
        this._level!.string = row.levelText ?? "";
        const badge = GuildBadgeUtils.source(row.badgeId);
        this._badge!.node.active = badge !== null;
        ResManager.setSprite(this._badge!.node, badge);
        this._action!.node.active = !!row.actionText;
        this._action!.interactable = !!row.action;
        this._actionText!.string = row.actionText ?? "";
    }

    /** 调用当前行实际绑定的请求意图。 */
    private run(): void {
        this.row?.action?.();
    }

}
