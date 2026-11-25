/** 好友列表的可复用角色卡片，按所在页签显示赠送、领取、申请或关系操作。 */
import { _decorator, Button, Component, Label, Node } from "cc";
import { ResManager } from "../../../framework/assets/ResManager";
import { RolePortraitUtils } from "../../account/utils/RolePortraitUtils";
import type { FriendAction, FriendEntry, FriendTab } from "../data/FriendData";

const { ccclass, property } = _decorator;

/** 一个角色卡片的界面上下文，搜索页也复用同一静态布局。 */
export type FriendCellMode = FriendTab | "search" | "remove";

@ccclass("FriendCell")
export class FriendCell extends Component {
    /** 将已点击的角色和动作转交给当前列表宿主。 */
    public static readonly ACTION = "friend-cell-action";
    /** 将公开资料查看意图转交主窗口。 */
    public static readonly PROFILE = "friend-cell-profile";

    /** 角色头像和框由统一画像工具加载。 */
    @property(Node) private face: Node | null = null;
    /** 原头像框静态锚点。 */
    @property(Node) private border: Node | null = null;
    /** 位于头像区域的公开资料入口。 */
    @property(Button) private portraitButton: Button | null = null;
    /** 真实角色名称。 */
    @property(Label) private displayName: Label | null = null;
    /** 等级及当前主队战力。 */
    @property(Label) private stats: Label | null = null;
    /** 最近登录日期，未提供时留空。 */
    @property(Label) private lastLogin: Label | null = null;
    /** 右侧主操作按钮。 */
    @property(Button) private mainButton: Button | null = null;
    /** 主操作文案随页签变化。 */
    @property(Label) private mainText: Label | null = null;
    /** 右侧下方的拒绝或回赠按钮。 */
    @property(Button) private extraButton: Button | null = null;
    /** 第二操作文案。 */
    @property(Label) private extraText: Label | null = null;

    /** 当前虚拟行展示的资料，回收后清空。 */
    private entry: FriendEntry | null = null;
    /** 主按钮本次绑定的动作，未授权点击时为 null。 */
    private mainAction: FriendAction | null = null;
    /** 次按钮本次绑定的动作，不显示时为 null。 */
    private extraAction: FriendAction | null = null;

    /** 卡片初始化时绑定按钮，后续只替换当前行的业务数据。 */
    protected onLoad(): void {
        this.mainButton?.node.on(Button.EventType.CLICK, this.actMain, this);
        this.extraButton?.node.on(Button.EventType.CLICK, this.actExtra, this);
        this.portraitButton?.node.on(Button.EventType.CLICK, this.openProfile, this);
    }

    /** 将公开资料、礼物状态以及该页可用动作渲染到静态卡片。 */
    public paint(entry: FriendEntry, mode: FriendCellMode, busy: boolean): void {
        this.entry = entry;
        RolePortraitUtils.paint(this.face, this.border, entry.headId, entry.borderId);
        this.displayName!.string = entry.name;
        this.stats!.string = `Lv.${entry.level}    战力 ${entry.power}`;
        this.lastLogin!.string = entry.lastLoginAt > 0 ? `最近登录 ${new Date(entry.lastLoginAt * 1000)
            .toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai" })}` : "";
        this.portraitButton!.interactable = mode !== "search" && mode !== "blocked";
        this.extraAction = null;
        this.extraButton!.node.active = false;
        let label: string;
        switch (mode) {
            case "friends":
                this.mainAction = entry.sentToday ? null : "SEND";
                label = entry.sentToday ? "已赠送" : "赠送";
                break;
            case "remove":
                this.mainAction = "REMOVE";
                label = "删除";
                break;
            case "gifts":
                this.mainAction = entry.giftState === 1 ? "CLAIM" : null;
                label = entry.giftState === 1 ? "领取" : "已领取";
                this.setExtra("回赠", entry.sentToday ? null : "SEND", busy);
                break;
            case "applications":
                this.mainAction = "ACCEPT";
                label = "同意";
                this.setExtra("拒绝", "REJECT", busy);
                break;
            case "blocked":
                this.mainAction = "UNBLOCK";
                label = "解除";
                break;
            case "search":
                this.mainAction = entry.requested ? null : "APPLY";
                label = entry.requested ? "已申请" : "添加";
                break;
        }
        this.mainText!.string = label;
        this.mainButton!.interactable = !busy && this.mainAction !== null;
    }

    /** 配置次按钮，已回赠等不可用状态交给按钮禁用态显示。 */
    private setExtra(label: string, action: FriendAction | null, busy: boolean): void {
        this.extraAction = action;
        this.extraText!.string = label;
        this.extraButton!.node.active = true;
        this.extraButton!.interactable = !busy && action !== null;
    }

    /** 交付主按钮的当前操作。 */
    private actMain(): void {
        this.emitAction(this.mainAction);
    }

    /** 交付次按钮的当前操作。 */
    private actExtra(): void {
        this.emitAction(this.extraAction);
    }

    /** 转交角色资料，不在卡片内管理黑名单或打开窗口。 */
    private openProfile(): void {
        if (this.entry) {
            this.node.parent?.emit(FriendCell.PROFILE, this.entry);
        }
    }

    /** 仅当前角色卡可见时将选中操作向上交给列表。 */
    private emitAction(action: FriendAction | null): void {
        if (action && this.entry && this.node.activeInHierarchy) {
            this.node.parent?.emit(FriendCell.ACTION, action, this.entry);
        }
    }

    /** 释放头像持有；节点自带的一次性按钮监听随组件一起销毁。 */
    protected onDestroy(): void {
        this.entry = null;
        ResManager.setSprite(this.face, null);
        ResManager.setSprite(this.border, null);
    }
}
