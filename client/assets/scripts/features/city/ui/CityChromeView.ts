/**
 * 主城常驻顶底栏：只绑定宿主提供的角色资料、导航状态及交互。
 * 固定结构、位置与大小由 CityChromeView.prefab 保存；代码仅适配外层视口，
 * 顶底栏、主城快捷入口由 Prefab 的 Widget 和 ViewportScale 对齐；浮动聊天只在当前主城记住拖放位置。
 */
import { _decorator, Button, Node, Sprite, UITransform } from "cc";
import { CITY_BAR } from "../../../config/CityNavigationUtils";
import { ResManager } from "../../../framework/assets/ResManager";
import { BaseView } from "../../../framework/ui/BaseView";
import { RedDotBinding } from "../../../framework/ui/RedDotBinding";
import { UIManager } from "../../../framework/ui/UIManager";
import { UiKitUtils } from "../../../framework/ui/UiKitUtils";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { GameRedDotKey } from "../../common/utils/GameRedDotKey";
import { CityTabUtils } from "../utils/CityTabUtils";
import { CityChatDrag } from "./CityChatDrag";
import { CityUtilityFold } from "./CityUtilityFold";

const { ccclass, property } = _decorator;

/** 底栏实际接入的红点汇总分支。 */
const TAB_RED_DOT_PATHS: Readonly<Record<string, string | undefined>> = {
    city: GameRedDotKey.CITY,
    hero: GameRedDotKey.HERO,
    bag: GameRedDotKey.BAG,
    battle: GameRedDotKey.BATTLE,
    dungeon: GameRedDotKey.DUNGEON,
    clan: GameRedDotKey.GUILD,
    fetter: GameRedDotKey.VIP,
};

export interface TabState {
    /** 对应 CITY_BAR 的导航标识。 */
    readonly id: string;
    /** 导航文案；固定字图由预制体提供，不从此字段拼装节点。 */
    readonly text: string;
    /** 宿主已经计算的选中／开放／锁定状态。 */
    readonly state: "selected" | "open" | "locked";
    /** 正整数等级门槛；小于等于 1 或缺失时隐藏门槛文字。 */
    readonly lockLevel?: number;
}

export interface CityChromeOpenArgs {
    /** 把实际按钮选择交给主城宿主。 */
    readonly onTab: (id: string) => void;
    /** 把活动、邮件、排行等意图交给主城宿主，不在顶栏开业务窗口。 */
    readonly actions: {
        readonly openActivity: () => void;
        readonly openMore: () => void;
        readonly openMail: () => void;
        /** 打开好友、礼物、申请和黑名单。 */
        readonly openFriend?: () => void;
        /** 打开每日和成就的共用窗口。 */
        readonly openQuest?: () => void;
        /** 打开主城的本服和跨服排行榜。 */
        readonly openRanking?: () => void;
    };
}

/** 底栏两套立绘共用一个操作入口；点位和层级分开保存于预制体。 */
interface TabBinding {
    /** 普通状态的框、图标及文字。 */
    readonly normal: Node;
    /** 更高绘制层的选中框、图标及文字。 */
    readonly selected: Node;
    /** 锁定标识及等级要求，不影响打开条件提示。 */
    readonly lock: Node;
    /** 等级文字，跟随锁定状态更新。 */
    readonly lockLevel: Node;
    /** 普通和选中版本各自的红点绑定；换状态后刷新显隐。 */
    readonly redDots: readonly RedDotBinding[];
}

/** 顶底栏挂在主城的常驻层，不进入页面栈。 */
@ccclass("CityChromeView")
export class CityChromeView extends BaseView<CityChromeOpenArgs> {
    /** 预制体绑定的角色名称节点，未绑定时由首次打开检查报告错误。 */
    @property(Node)
    lblName: Node | null = null;
    /** 预制体绑定的角色副标题节点，开发身份说明行由显示方法隐藏。 */
    @property(Node)
    lblSub: Node | null = null;
    /** 预制体绑定的等级文字节点，未同步等级时随徽章一起隐藏。 */
    @property(Node)
    lblLevel: Node | null = null;
    /** 预制体绑定的等级徽章底图，与等级文字使用相同显示状态。 */
    @property(Node)
    levelBg: Node | null = null;
    /** 顶栏头像点击区域，由主城绑定打开自身资料。 */
    @property(Node)
    avatar: Node | null = null;
    /** 预制体内的头像图片，使用 headId，不能用角色形象代替。 */
    @property(Node)
    avatarFace: Node | null = null;
    /** 预制体内的头像框，独立于头像加载。 */
    @property(Node)
    avatarBorder: Node | null = null;
    /** 预制体绑定的金币文字节点，只接收宿主已格式化的数量。 */
    @property(Node)
    goldValue: Node | null = null;
    /** 预制体绑定的钻石文字节点，只接收宿主已格式化的数量。 */
    @property(Node)
    gemValue: Node | null = null;
    /** 预制体绑定的战力文字节点，长文本在现有区域内缩放。 */
    @property(Node)
    powerValue: Node | null = null;
    /** 主城专属活动组，进入其他功能页时由宿主隐藏。 */
    @property(Node)
    actGroup: Node | null = null;
    /** 主城专属工具入口行，显示状态与活动组一起切换。 */
    @property(Node)
    utilityRow: Node | null = null;
    /** 底栏的固定背景，由预制体保存位置和大小。 */
    @property(Node)
    bottomBg: Node | null = null;
    /** 预制体绑定的主城导航按钮，按CITY_BAR顺序登记。 */
    @property(Node)
    tabCity: Node | null = null;
    /** 预制体绑定的英雄导航按钮，点击转交宿主导航。 */
    @property(Node)
    tabHero: Node | null = null;
    /** 预制体绑定的背包导航按钮，点击转交宿主导航。 */
    @property(Node)
    tabBag: Node | null = null;
    /** 预制体绑定的战斗导航按钮，点击转交当前主线入口。 */
    @property(Node)
    tabBattle: Node | null = null;
    /** 预制体绑定的副本导航按钮，开放与锁定状态由宿主提供。 */
    @property(Node)
    tabDungeon: Node | null = null;
    /** 预制体绑定的公会导航按钮，开放与锁定状态由宿主提供。 */
    @property(Node)
    tabClan: Node | null = null;
    /** 预制体绑定的VIP导航按钮，使用既有fetter入口标识。 */
    @property(Node)
    tabFetter: Node | null = null;
    /** 按 CITY_BAR 顺序绑定的选中立绘，与普通按钮分层绘制。 */
    @property([Node])
    selectedTabs: Node[] = [];
    /** 活动入口；按钮及显隐由预制体保存，点击交给宿主，不假造活动状态。 */
    @property([Node])
    activityButtons: Node[] = [];
    /** 两侧活动栏的完整展示版，从左到右与收起版对应。 */
    @property([Node])
    expandedActivityRails: Node[] = [];
    /** 两侧活动栏的收起版，保留首个入口和展开按钮。 */
    @property([Node])
    collapsedActivityRails: Node[] = [];
    /** 加号收起时移入锚点并隐藏的工具组，推荐入口和加号本身保持可见。 */
    @property(Node)
    utilityEntries: Node | null = null;
    /** 和加号重合的收拢位置，放在工具组内以便直接使用局部坐标。 */
    @property(Node)
    utilityFoldAnchor: Node | null = null;
    /** 已还原图案但尚未接入业务的快捷按钮，只给出统一未开放提示。 */
    @property([Node])
    shortcutButtons: Node[] = [];
    /** 独立浮动层里的聊天按钮，短按和拖动由同一手势处理区分。 */
    @property(Node)
    btnChat: Node | null = null;
    /** 预制体绑定的录像工具按钮，当前统一转交更多入口。 */
    @property(Node)
    btnReplay: Node | null = null;
    /** 预制体绑定的好友工具按钮，当前统一转交更多入口。 */
    @property(Node)
    btnFriend: Node | null = null;
    /** 预制体绑定的邮件按钮，点击转交主城注入的邮件操作。 */
    @property(Node)
    btnMail: Node | null = null;
    /** 主城右侧的每日任务按钮，进入已接通的任务窗口。 */
    @property(Node)
    btnDailyTask: Node | null = null;
    /** 预制体绑定的排行工具按钮，点击转交主城注入的排行榜操作。 */
    @property(Node)
    btnRank: Node | null = null;
    /** 预制体绑定的加号按钮，点击播放工具栏展开或收拢动画。 */
    @property(Node)
    btnMore: Node | null = null;
    /** 旧主城经验条的横向填充组件，只展示服务器同步的等级内经验。 */
    @property(Sprite)
    experienceFill: Sprite | null = null;

    /** 导航标识到预制体两套立绘与锁定节点；每次打开建立，关闭清空。 */
    private readonly tabBindings = new Map<string, TabBinding>();

    /** 返回当前顶底栏节点，供主城宿主持有和显示。 */
    get root(): Node {
        return this.node;
    }

    /** 校验已有预制体绑定并接管本次显示期的点击、红点和视口监听。 */
    public onOpen(args?: CityChromeOpenArgs): void {
        if (!args) {
            throw new Error("CityChromeView 未注入导航操作");
        }
        this.validateBindings();
        this.ownListener(() => this.tabBindings.clear());
        const buttons = [this.tabCity, this.tabHero, this.tabBag, this.tabBattle, this.tabDungeon, this.tabClan, this.tabFetter];
        for (const [index, entry] of CITY_BAR.entries()) {
            this.bindTab(entry.id, this.requireNode(buttons[index], entry.id), this.selectedTabs[index], args.onTab);
        }
        this.bindShortcuts(args.actions);
        this.bindChat();
        this.bindActivityRails();
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node,
            () => ViewportLayoutUtils.fitVisibleRoot(this.node)));
    }

    /** 更新角色姓名和可用副标题，不把开发身份说明绘制在顶栏。 */
    public setIdentity(nameLine: string, subLine: string): void {
        if (this.lblName) {
            UiKitUtils.setText(this.lblName, nameLine);
        }
        if (this.lblSub) {
            const developer = subLine.startsWith("真服 ·");
            this.lblSub.active = !developer && subLine.length > 0;
            UiKitUtils.setText(this.lblSub, developer ? "" : subLine);
        }
    }

    /** 显示实际金币和次要资源，英雄培养状态仅切换两枚预制体图标。 */
    public setCurrencies(goldLine: string, secondaryLine: string, showHeroExperience = false): void {
        if (this.goldValue) {
            UiKitUtils.setText(this.goldValue, goldLine);
        }
        if (this.gemValue) {
            UiKitUtils.setText(this.gemValue, secondaryLine);
            const group = this.gemValue.parent;
            const diamond = group?.getChildByName("Icon");
            const experience = group?.getChildByName("HeroExperienceIcon");
            if (diamond && experience) {
                diamond.active = !showHeroExperience;
                experience.active = showHeroExperience;
            }
        }
    }

    /** 只写入权威战力；文字溢出和宽度由预制体设置。 */
    public setPower(text: string): void {
        if (this.powerValue) {
            UiKitUtils.setText(this.powerValue, text);
        }
    }

    /** 显示已同步的等级徽章；空字符串隐藏等级文字与底图。 */
    public setLevelBadge(text: string): void {
        const show = text.length > 0;
        if (this.lblLevel) {
            this.lblLevel.active = show;
            UiKitUtils.setText(this.lblLevel, text);
        }
        if (this.levelBg) {
            this.levelBg.active = show;
        }
    }

    /** 刷新当前经验比例；缺失资料或最高级零门槛显示空条。 */
    public setExperience(experience?: number, required?: number): void {
        if (this.experienceFill) {
            const valid = typeof experience === "number" && Number.isFinite(experience)
                && typeof required === "number" && Number.isFinite(required) && required > 0;
            this.experienceFill.fillRange = valid ? Math.max(0, Math.min(1, experience / required)) : 0;
        }
    }

    /** 使用已绑定的头像图片；资源管理器负责取消同节点被替换的在途图片。 */
    public setAvatar(icon: string | null): void {
        if (this.avatar) {
            this.avatar.active = icon !== null;
            ResManager.setSprite(this.avatarFace, icon);
        }
    }

    /** 按宿主状态切换静态立绘和等级要求，并保持锁定优先于红点。 */
    public setTabs(tabs: TabState[]): void {
        const paint = CityTabUtils.tabPaintState(tabs.map(tab => tab.state));
        for (const [index, tab] of tabs.entries()) {
            const binding = this.tabBindings.get(tab.id);
            if (!binding) {
                continue;
            }
            const locked = paint[index] === "locked";
            const selected = paint[index] === "selected";
            const level = locked && (tab.lockLevel ?? 0) > 1 ? `Lv${tab.lockLevel}` : "";
            binding.normal.active = !selected;
            binding.selected.active = selected;
            binding.lock.active = locked;
            binding.lockLevel.active = level.length > 0;
            UiKitUtils.setText(binding.lockLevel, level);
            const icon = binding.normal.getChildByName("Icon")?.getComponent(Sprite);
            if (icon) {
                icon.grayscale = locked;
            }
            for (const redDot of binding.redDots) {
                redDot.refresh();
            }
        }
    }

    /** 仅切换主城快捷入口组，隐藏的未接入子节点不随分组自动开放。 */
    public setCityExtras(visible: boolean): void {
        if (this.actGroup) {
            this.actGroup.active = visible;
        }
        if (this.utilityRow) {
            this.utilityRow.active = visible;
        }
    }

    /** 校验必须由预制体提供的节点及数组；缺失时由宿主报告开页失败。 */
    private validateBindings(): void {
        const required: Array<[Node | null, string]> = [
            [this.lblName, "LblName"],
            [this.lblSub, "LblSub"],
            [this.lblLevel, "LblLevel"],
            [this.levelBg, "LevelBg"],
            [this.avatar, "Avatar"],
            [this.avatarFace, "Avatar/Face"],
            [this.avatarBorder, "Avatar/Border"],
            [this.goldValue, "CurrencyGold/Value"],
            [this.gemValue, "CurrencyGem/Value"],
            [this.powerValue, "PowerSlot/Value"],
            [this.actGroup, "ActGroup"],
            [this.utilityRow, "UtilityRow"],
            [this.bottomBg, "BottomBar/Bg"],
            [this.experienceFill?.node ?? null, "ExperienceFill"],
        ];
        for (const [node, name] of required) {
            this.requireNode(node, name);
        }
        if (this.selectedTabs.length !== CITY_BAR.length) {
            throw new Error("CityChromeView 选中立绘没有绑全");
        }
    }

    /** 绑定单个入口及两套红点锚点，不修改预制体层级、坐标或尺寸。 */
    private bindTab(id: string, button: Node, selectedNode: Node, onTab: (id: string) => void): void {
        const normal = this.requireNode(button.getChildByName("Default"), `${button.name}/Default`);
        const selected = this.requireNode(selectedNode, `${button.name} 的选中立绘`);
        const lock = this.requireNode(button.getChildByName("Lock"), `${button.name}/Lock`);
        const lockLevel = this.requireNode(lock.getChildByName("Lv"), `${button.name}/Lock/Lv`);
        const path = TAB_RED_DOT_PATHS[id];
        const redDots = path ? [normal, selected].map(artwork => {
            const anchor = this.requireNode(artwork.getChildByName("RedDotAnchor"), `${artwork.name}/RedDotAnchor`);
            const dot = RedDotBinding.atAnchor(anchor, path, () => artwork.active && !lock.active);
            this.ownListener(() => dot.dispose());
            return dot;
        }) : [];
        this.bindClick(button, () => onTab(id));
        this.tabBindings.set(id, { normal, selected, lock, lockLevel, redDots });
    }

    /** 绑定活动、排行和其他工具；加号切换工具组的移动动画。 */
    private bindShortcuts(actions: CityChromeOpenArgs["actions"]): void {
        for (const [index, node] of this.activityButtons.entries()) {
            this.bindClick(this.requireNode(node, `活动入口 ${index + 1}`), actions.openActivity);
        }
        for (const [index, node] of this.shortcutButtons.entries()) {
            this.bindClick(this.requireNode(node, `快捷入口 ${index + 1}`),
                () => UIManager.instance.toast("功能暂未开放"));
        }
        this.bindClick(this.requireNode(this.btnReplay, "BtnReplay"), actions.openMore);
        const friend = this.requireNode(this.btnFriend, "BtnFriend");
        this.bindClick(friend, actions.openFriend ?? actions.openMore);
        if (actions.openFriend) {
            const dot = new RedDotBinding(friend, GameRedDotKey.FRIEND);
            this.ownListener(() => dot.dispose());
        }
        const rank = this.requireNode(this.btnRank, "BtnRank");
        if (actions.openRanking) {
            this.bindClick(rank, actions.openRanking);
            const dot = new RedDotBinding(rank, GameRedDotKey.RANKING);
            this.ownListener(() => dot.dispose());
        }
        this.bindUtilityFold(actions.openMore);
        const mail = this.requireNode(this.btnMail, "BtnMail");
        this.bindClick(mail, actions.openMail);
        const mailDot = new RedDotBinding(mail, GameRedDotKey.MAIL);
        this.ownListener(() => mailDot.dispose());
        if (this.btnDailyTask && actions.openQuest) {
            this.bindClick(this.btnDailyTask, actions.openQuest);
            const binding = new RedDotBinding(this.btnDailyTask, GameRedDotKey.QUEST);
            this.ownListener(() => binding.dispose());
        }
    }

    /** 使用预制体的工具组和收拢锚点创建本次显示期的动画绑定。 */
    private bindUtilityFold(openMore: () => void): void {
        const plus = this.requireNode(this.btnMore, "BtnMore");
        if (this.utilityEntries) {
            const anchor = this.requireNode(this.utilityFoldAnchor, "UtilityFoldAnchor");
            const fold = new CityUtilityFold(this.utilityEntries, anchor);
            this.bindClick(plus, () => fold.toggle());
            this.ownListener(() => fold.dispose());
        } else {
            this.bindClick(plus, openMore);
        }
    }

    /** 绑定预制体中的浮动聊天按钮；拖动不触发原有未开放提示。 */
    private bindChat(): void {
        const node = this.requireNode(this.btnChat, "BtnChat");
        const viewport = this.node.getComponent(UITransform);
        const dock = node.parent?.getComponent(UITransform);
        const button = node.getComponent(Button);
        const icon = node.getComponent(UITransform);
        if (!viewport || !dock || !button || !icon) {
            throw new Error("CityChromeView 聊天按钮缺少拖动所需的预制体组件");
        }
        this.ownListener(new CityChatDrag(viewport, dock, button, icon,
            () => UIManager.instance.toast("功能暂未开放")).bind());
    }

    /** 各活动栏独立切换两套预制布局，展开与收起无需改节点坐标。 */
    private bindActivityRails(): void {
        if (this.expandedActivityRails.length !== this.collapsedActivityRails.length) {
            throw new Error("主城活动栏展开与收起布局未成对绑定");
        }
        for (const [index, expanded] of this.expandedActivityRails.entries()) {
            const collapsed = this.requireNode(this.collapsedActivityRails[index], `收起活动栏 ${index + 1}`);
            const collapseButton = this.requireNode(expanded.getChildByName("CollapseButton"), "CollapseButton");
            const expandButton = this.requireNode(collapsed.getChildByName("ExpandButton"), "ExpandButton");
            this.bindClick(collapseButton, () => {
                expanded.active = false;
                collapsed.active = true;
            });
            this.bindClick(expandButton, () => {
                collapsed.active = false;
                expanded.active = true;
            });
        }
    }

    /** 仅登记已存在的 Button；同一显示期结束后移除本次监听。 */
    private bindClick(node: Node, action: () => void): void {
        if (!node.getComponent(Button)) {
            throw new Error(`CityChromeView ${node.name} 缺少 Button`);
        }
        node.on(Button.EventType.CLICK, action);
        this.ownListener(() => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, action);
            }
        });
    }

    /** 返回非空的预制体引用；不同入口的缺项保留明确名称。 */
    private requireNode(node: Node | null | undefined, name: string): Node {
        if (!node) {
            throw new Error(`CityChromeView 缺少 ${name}`);
        }
        return node;
    }
}
