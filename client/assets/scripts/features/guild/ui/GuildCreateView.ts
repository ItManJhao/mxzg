/** 公会目录的创建页签。表单保存本次名字、公告和徽章草稿，成功后由公会主页展示成员状态。 */
import { _decorator, Button, Color, Component, EditBox, Label, Sprite } from "cc";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { ResManager } from "../../../framework/assets/ResManager";
import type { BaseView } from "../../../framework/ui/BaseView";
import { UIManager } from "../../../framework/ui/UIManager";
import type { AccountModel } from "../../account/AccountModel";
import { GuildController } from "../GuildController";
import { GuildModel } from "../GuildModel";
import { GuildBadgePickerView } from "./GuildBadgePickerView";
import { GuildBadgeUtils } from "./GuildBadgeUtils";

const { ccclass, property } = _decorator;

@ccclass("GuildCreateView")
export class GuildCreateView extends Component {
    /** 公会名字输入，长度及名称唯一性由服务端确认。 */
    @property(EditBox) private _nameInput: EditBox | null = null;
    /** 可选公会介绍。 */
    @property(EditBox) private _description: EditBox | null = null;
    /** 建会按钮上的服务端报价。 */
    @property(Label) private _cost: Label | null = null;
    /** 确认当前报价并发送创建。 */
    @property(Button) private _confirm: Button | null = null;
    /** 正在预览的公会徽章。 */
    @property(Sprite) private _badge: Sprite | null = null;
    /** 打开徽章选择弹窗。 */
    @property(Button) private _selectBadge: Button | null = null;
    /** 底栏公会页，作为徽章选择弹窗的实际父窗口。 */
    private owner: BaseView<unknown> | null = null;
    /** 只读钱包状态，用于着色报价和缺少钻石提示。 */
    private account: AccountModel | null = null;
    /** 当前表单的徽章编号，初次打开随机选择，用户可自行修改。 */
    private badgeId = 0;
    /** 离开创建页签时释放状态与余额监听。 */
    private listeners: Array<() => void> = [];

    /** 公会主页初始化内嵌表单，后续直接切换预制体节点显隐。 */
    public configure(owner: BaseView<unknown>, account: AccountModel): void {
        this.owner = owner;
        this.account = account;
        this.badgeId = Math.floor(Math.random() * (GuildBadgeUtils.maxId + 1));
    }

    /** 进入创建页签时绑定点击及回包，退出时清理仍存活的按钮监听。 */
    protected onEnable(): void {
        const confirm = this._confirm!.node;
        const chooser = this._selectBadge!.node;
        confirm.on(Button.EventType.CLICK, this.submit, this);
        chooser.on(Button.EventType.CLICK, this.chooseBadge, this);
        this.listeners.push(
            () => {
                if (confirm.isValid) {
                    confirm.off(Button.EventType.CLICK, this.submit, this);
                }
                if (chooser.isValid) {
                    chooser.off(Button.EventType.CLICK, this.chooseBadge, this);
                }
            },
            EventDispatcher.instance.on("guild.updated", this, this.render),
        );
        if (this.account) {
            this.listeners.push(this.account.subscribe(() => this.render()));
        }
        this.render();
    }

    /** 切页签时解除监听并撤回本次徽章赋图，表单数据仍随父页面持有。 */
    protected onDisable(): void {
        for (const stop of this.listeners.splice(0)) {
            stop();
        }
        ResManager.setSprite(this._badge?.node ?? null, null);
    }

    /** 读当前报价及钱包，刷新徽章并禁止本角色重复提交。 */
    private render(): void {
        const state = GuildModel.instance.snapshot;
        if (!state || state.guild) {
            this._confirm!.interactable = false;
            return;
        }
        this._nameInput!.maxLength = state.nameLimit;
        this._cost!.string = `${state.createCostDiamonds} 创建`;
        const diamonds = this.account?.snapshot.role?.diamonds;
        this._cost!.color = diamonds !== undefined && diamonds < state.createCostDiamonds
            ? new Color(255, 73, 64) : Color.WHITE;
        this._confirm!.interactable = !GuildController.instance.busy;
        ResManager.setSprite(this._badge!.node, GuildBadgeUtils.source(this.badgeId));
    }

    /** 徽章选择窗由公会主页拥有，回填时要求原创建表单节点仍有效且可见。 */
    private chooseBadge(): void {
        if (!this.owner) {
            return;
        }
        const form = this.node;
        void UIManager.instance.openChild(this.owner, GuildBadgePickerView, {
            onSelect: id => {
                if (form.isValid && form.activeInHierarchy) {
                    this.badgeId = id;
                    this.render();
                }
            },
        }).catch(() => {
            // 开窗失败已由 UIManager 提示。
        });
    }

    /** 玩家已看到名称和价格，提交当前表单。 */
    private submit(): void {
        const state = GuildModel.instance.snapshot;
        if (!state || state.guild) {
            return;
        }
        if ((this.account?.snapshot.role?.diamonds ?? 0) < state.createCostDiamonds) {
            UIManager.instance.toast("钻石不足");
            return;
        }
        const name = this._nameInput!.string.trim();
        if (!name) {
            UIManager.instance.toast("请输入公会名称");
            return;
        }
        const limit = state.nameLimit;
        let width = 0;
        for (let index = 0; index < name.length; index++) {
            width += name.charCodeAt(index) <= 255 ? 1 : 2;
        }
        if (width > limit) {
            UIManager.instance.toast(`公会名称长度上限为 ${limit}，汉字按 2 计`);
            return;
        }
        const description = this._description!.string.trim();
        GuildController.instance.change({ action: "CREATE", name, description, badgeId: this.badgeId });
    }
}
