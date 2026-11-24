/** 公会目录的创建页签。显式确认输入后更新表单草稿，点击创建才交给公会控制器。 */
import { _decorator, Button, Color, Component, Label, Sprite } from "cc";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { ResManager } from "../../../framework/assets/ResManager";
import type { BaseView } from "../../../framework/ui/BaseView";
import { UIManager } from "../../../framework/ui/UIManager";
import type { AccountModel } from "../../account/AccountModel";
import { GuildController } from "../GuildController";
import { GuildModel } from "../GuildModel";
import { GuildBadgePickerView } from "./GuildBadgePickerView";
import { GuildBadgeUtils } from "./GuildBadgeUtils";
import { GuildTextInputView } from "./GuildTextInputView";

const { ccclass, property } = _decorator;

/** 单行编辑器可写入的建会草稿字段。 */
type CreateTextField = "name" | "description";

@ccclass("GuildCreateView")
export class GuildCreateView extends Component {
    /** 已确认的名字或默认提示，不直接唤起系统键盘。 */
    @property(Label) private _nameLabel: Label | null = null;
    /** 点击名称框时打开输入窗。 */
    @property(Button) private _editName: Button | null = null;
    /** 展示已确认的公会宣言，未编辑时预览旧版文案。 */
    @property(Label) private _descriptionLabel: Label | null = null;
    /** 点击宣言卡或笔形图标时打开同一个输入窗。 */
    @property(Button) private _editDescription: Button | null = null;
    /** 建会按钮上的服务端报价。 */
    @property(Label) private _cost: Label | null = null;
    /** 确认当前报价并发送创建。 */
    @property(Button) private _confirm: Button | null = null;
    /** 正在预览的公会徽章。 */
    @property(Sprite) private _badge: Sprite | null = null;
    /** 打开徽章选择弹窗。 */
    @property(Button) private _selectBadge: Button | null = null;
    /** 底栏公会页，拥有创建输入窗和徽章窗，离开时一并关窗。 */
    private owner: BaseView<unknown> | null = null;
    /** 只读钱包状态，用于着色报价和缺少钻石提示。 */
    private account: AccountModel | null = null;
    /** 当前表单的徽章编号，初次打开随机选择，用户可自行修改。 */
    private badgeId = 0;
    /** 已确认的名称草稿，当前创建表单存活时保留。 */
    private nameDraft = "";
    /** 已确认的宣言；null 表示未编辑，默认文案只展示和预填，不随创建偷偷保存。 */
    private descriptionDraft: string | null = null;
    /** 离开创建页签时释放状态与余额监听。 */
    private listeners: Array<() => void> = [];

    /** 公会主页初始化内嵌表单，后续直接切换预制体节点显隐。 */
    public configure(owner: BaseView<unknown>, account: AccountModel): void {
        this.owner = owner;
        this.account = account;
        this.badgeId = Math.floor(Math.random() * (GuildBadgeUtils.maxId + 1));
    }

    /** 进入创建页签时绑定两个编辑入口、徽章和创建按钮，并同步现有草稿。 */
    protected onEnable(): void {
        this.bindButton(this._confirm!, () => this.submit());
        this.bindButton(this._selectBadge!, () => this.chooseBadge());
        this.bindButton(this._editName!, () => this.editText("name"));
        this.bindButton(this._editDescription!, () => this.editText("description"));
        this.listeners.push(EventDispatcher.instance.on("guild.updated", this, this.render));
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

    /** 刷新建会草稿、旧版提示、报价和徽章，不从回包重置正在填写的内容。 */
    private render(): void {
        const placeholder = GameConfig.instance.requireConfig(GConfig.Language, 41342).value ?? "";
        this._nameLabel!.string = this.nameDraft || placeholder;
        this._nameLabel!.color = this.nameDraft ? new Color(122, 71, 45) : new Color(156, 155, 151);
        this._descriptionLabel!.string = this.descriptionDraft ?? this.defaultDescription();
        const state = GuildModel.instance.snapshot;
        this._editName!.interactable = !!state && !state.guild;
        this._editDescription!.interactable = this._editName!.interactable;
        if (!state || state.guild) {
            this._confirm!.interactable = false;
            return;
        }
        this._cost!.string = `${state.createCostDiamonds} 创建`;
        const diamonds = this.account?.snapshot.role?.diamonds;
        this._cost!.color = diamonds !== undefined && diamonds < state.createCostDiamonds
            ? new Color(255, 73, 64) : Color.WHITE;
        this._confirm!.interactable = !GuildController.instance.busy;
        ResManager.setSprite(this._badge!.node, GuildBadgeUtils.source(this.badgeId));
    }

    /** 返回正式服创建页未编辑时所展示的公会宣言。 */
    private defaultDescription(): string {
        return GameConfig.instance.requireConfig(GConfig.Language, 41343).value ?? "";
    }

    /** 由共享输入窗确认名称或宣言；取消不回填，确认也不发公会协议。 */
    private editText(field: CreateTextField): void {
        const state = GuildModel.instance.snapshot;
        if (!this.owner || !state || state.guild) {
            return;
        }
        const form = this.node;
        const isName = field === "name";
        void UIManager.instance.openChild(this.owner, GuildTextInputView, {
            initialValue: isName ? this.nameDraft : this.descriptionDraft ?? this.defaultDescription(),
            maxLength: isName ? state.nameLimit : GuildModel.noticeLimit,
            onConfirm: value => {
                if (!form.isValid || !form.activeInHierarchy) {
                    return;
                }
                if (isName) {
                    this.nameDraft = value.trim();
                } else {
                    this.descriptionDraft = value.trim();
                }
                this.render();
            },
        }).catch(() => {
            // 开窗失败已由 UIManager 提示。
        });
    }

    /** 绑定本页签按钮，退出时只解除当前处理函数。 */
    private bindButton(button: Button, action: () => void): void {
        const node = button.node;
        node.on(Button.EventType.CLICK, action);
        this.listeners.push(() => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, action);
            }
        });
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
        const name = this.nameDraft;
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
        const description = this.descriptionDraft ?? "";
        GuildController.instance.change({ action: "CREATE", name, description, badgeId: this.badgeId });
    }
}
