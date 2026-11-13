/**
 * 主城顶底栏 View：绑定导航与资产显示，由主城页面提供数据和操作，不读取网络或全局角色仓库。
 */
import { ResManager } from "../../../framework/assets/ResManager";
import { _decorator, Color, Label, Node, Overflow, Sprite, UITransform } from "cc";
import { CITY_BAR } from "../../../config/CityNavigationUtils";
import { ErrorUtils } from "../../../core/ErrorUtils";
import { GameLog } from "../../../core/GameLog";
import { BaseView } from "../../../framework/ui/BaseView";
import { CityChrome, CityChromeActions, CityChromeUtils, TabState } from "./CityChromeUtils";
import { CityTabUtils } from "../utils/CityTabUtils";
import { PrefabLoader } from "../../../framework/assets/PrefabLoader";
import { CITY_CHROME_PREFAB_PATH } from "../../../config/PrefabCatalog";
import { UiKitUtils } from "../../../framework/ui/UiKitUtils";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
const { ccclass, property } = _decorator;
const PREFAB_TAB_SELECTED = new Color(255, 210, 140, 255);
const PREFAB_TAB_OPEN = new Color(255, 255, 255, 255);
const PREFAB_TAB_LOCKED = new Color(160, 164, 176, 255);
const BOTTOM_BG_WIDTH = 724;
/**
 * 底栏字图。副本的文件名是 skin，字是「副本」。
 * 最右一格用日服 VIP 字，不用国服「羁绊」。
 */
const TAB_CAPTION: {
    [id: string]: string;
} = {
    city: "home/ui/main-scene-lang_lbl-city",
    hero: "home/ui/main-scene-lang_lbl-hero",
    bag: "home/ui/main-scene-lang_lbl-backpack",
    battle: "home/ui/main-scene-lang_lbl-battle",
    dungeon: "home/ui/main-scene-lang_lbl-skin",
    clan: "home/ui/main-scene-lang_lbl-clan",
    fetter: "home/ui/main-scene-lang_lbl-fetters-unlock",
};
const TAB_ICON: {
    [id: string]: string;
} = {
    fetter: "home/ui/main-scene_spr-fetters-unlock",
};
const ACTIVITY_NAMES = [
    "ActRecommend",
    "ActSevenDay",
    "ActHeroArrive",
    "ActPrivilege",
    "ActWelfare",
    "BtnActExpand",
    "ActLimitGift",
    "ActLimitTime",
];
export interface CityChromeOpenArgs {
    onTab: (id: string) => void;
    actions: CityChromeActions;
}
/**
 * 顶栏和底栏。挂在 UIShell 的 chrome 层，不进页面栈。
 * 货币、战力和头像只显示 MainApp 送进来的字符串，这里不读协议。
 */
@ccclass("CityChromeView")
export class CityChromeView extends BaseView<CityChromeOpenArgs> implements CityChrome {
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
    /** 底栏预制体背景节点，适配时只调整这张图的宽度。 */
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
    /** 按ACTIVITY_NAMES顺序绑定的活动按钮，首次打开核对数量和空引用。 */
    @property([Node])
    activityButtons: Node[] = [];
    /** 预制体绑定的录像工具按钮，当前统一转交更多入口。 */
    @property(Node)
    btnReplay: Node | null = null;
    /** 预制体绑定的好友工具按钮，当前统一转交更多入口。 */
    @property(Node)
    btnFriend: Node | null = null;
    /** 预制体绑定的邮件按钮，点击转交主城注入的邮件操作。 */
    @property(Node)
    btnMail: Node | null = null;
    /** 预制体绑定的排行工具按钮，当前统一转交更多入口。 */
    @property(Node)
    btnRank: Node | null = null;
    /** 预制体绑定的更多工具按钮，点击转交统一更多入口。 */
    @property(Node)
    btnMore: Node | null = null;
    /** 主城打开时注入的导航回调；null表示尚未装配，不由本页持有导航状态。 */
    private onTab: ((id: string) => void) | null = null;
    /** 主城打开时注入的活动、更多与邮件操作；null时按钮只记录缺少回调。 */
    private actions: CityChromeActions | null = null;
    /** 导航标识到本实例按钮节点的索引，首次绑定生成，刷新样式时复用。 */
    private tabs: {
        [id: string]: Node;
    } = {};
    /** 本实例首次开始绑定后为true，后续打开只更新注入操作，不重复登记按钮。 */
    private started = false;
    /** 返回当前顶底栏节点，供主城宿主持有和显示。 */
    get root(): Node {
        return this.node;
    }
    /** 接收主城注入的导航操作；本实例只绑定一次节点和按钮，绑定失败使开页等待明确失败。 */
    onOpen(args?: CityChromeOpenArgs): void {
        if (args) {
            this.args = args;
            this.onTab = args.onTab;
            this.actions = args.actions;
        }
        if (this.started) {
            return;
        }
        this.started = true;
        this.beginOpen();
        try {
            this.bindAll();
            this.finishOpen();
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(ErrorUtils.messageOf(err));
            GameLog.shared.classified("MODULE", "warn", "CityChromeView", "没有挂上 " + error.message);
            this.failOpen(error);
        }
    }
    /** 更新角色名称及副标题；开发身份说明行隐藏，不在顶栏展示调试资料。 */
    setIdentity(nameLine: string, subLine: string): void {
        if (this.lblName) {
            UiKitUtils.setText(this.lblName, nameLine);
        }
        if (!this.lblSub) {
            return;
        }
        const debug = subLine.indexOf("真服 ·") === 0;
        this.lblSub.active = !debug;
        UiKitUtils.setText(this.lblSub, debug ? "" : subLine);
    }
    /** 把已格式化的金币和钻石数量写入现有文字节点，不读取或修改钱包。 */
    setCurrencies(goldLine: string, diamondLine: string): void {
        if (this.goldValue) {
            UiKitUtils.setText(this.goldValue, goldLine);
        }
        if (this.gemValue) {
            UiKitUtils.setText(this.gemValue, diamondLine);
        }
    }
    /** 更新服务端战力文字，并在既有区域内缩放长文本；空字符串按调用方约定清空占位值。 */
    setPower(text: string): void {
        const node = this.powerValue;
        if (!node) {
            return;
        }
        UiKitUtils.setText(node, text);
        const label = node.getComponent(Label);
        if (label) {
            label.overflow = Overflow.SHRINK;
        }
        ViewportLayoutUtils.assignContentSize(node.getComponent(UITransform), 68, 24);
    }
    /** 显示已同步的等级徽章；空字符串隐藏等级文字与底图。 */
    setLevelBadge(text: string): void {
        const show = text.length > 0;
        if (this.lblLevel) {
            this.lblLevel.active = show;
            if (show) {
                UiKitUtils.setText(this.lblLevel, text);
            }
        }
        if (this.levelBg) {
            this.levelBg.active = show;
        }
    }

    /** 旧主城经验条的横向填充组件，只展示服务器同步的等级内经验。 */
    @property(Sprite)
    experienceFill: Sprite | null = null;
    /** 刷新当前经验比例；缺失资料或最高级零门槛显示空条，不自行升级。 */
    setExperience(experience?: number, required?: number): void {
        if (!this.experienceFill) {
            return;
        }
        const valid = typeof experience === "number" && Number.isFinite(experience)
            && typeof required === "number" && Number.isFinite(required) && required > 0;
        this.experienceFill.fillRange = valid ? Math.max(0, Math.min(1, experience! / required!)) : 0;
    }
    /** 按主城提供的资源路径更新头像；null隐藏头像，不推断角色形象。 */
    setAvatar(icon: string | null): void {
        this.paintAvatar(icon);
    }
    /** 根据已计算的导航状态刷新七个按钮的选中样式和锁定等级，不在页面内决定开放条件。 */
    setTabs(tabs: TabState[]): void {
        const paint = CityTabUtils.tabPaintState(tabs.map((tab) => tab.state));
        for (let i = 0; i < tabs.length; i++) {
            const tab = tabs[i];
            const button = this.tabs[tab.id];
            if (!button) {
                continue;
            }
            const state = paint[i] === "locked" ? "locked" : paint[i] === "selected" ? "selected" : "open";
            CityChromeUtils.setCityTabSelected(button, state === "selected");
            PrefabLoader.tintSprite(button, CityChromeView.prefabTabColor(state));
            const lock = button.getChildByName("Lock");
            if (lock) {
                const locked = tab.state === "locked";
                lock.active = locked;
                if (locked) {
                    CityChromeView.paintLockLevel(lock, tab.lockLevel && tab.lockLevel > 1 ? tab.lockLevel : 0);
                }
            }
        }
    }
    /** 切换主城专属活动组和工具行的显示；进入其他功能页时由宿主隐藏。 */
    setCityExtras(visible: boolean): void {
        if (this.actGroup) {
            this.actGroup.active = visible;
        }
        if (this.utilityRow) {
            this.utilityRow.active = visible;
        }
    }

    /** 核对必需节点，绑定底栏与工具入口，并登记随视口刷新的布局；只在本实例首次打开执行。 */
    private bindAll(): void {
        this.sealBottom();
        const tabNodes = [this.tabCity, this.tabHero, this.tabBag, this.tabBattle, this.tabDungeon, this.tabClan, this.tabFetter];
        if (tabNodes.length !== CITY_BAR.length) {
            throw new Error("底栏按钮数量不对");
        }
        for (let i = 0; i < CITY_BAR.length; i++) {
            const entry = CITY_BAR[i];
            const button = tabNodes[i];
            if (!button) {
                throw new Error("缺少节点 " + entry.id);
            }
            CityChromeUtils.prepareCityTab(button);
            const lock = button.getChildByName("Lock");
            if (lock) {
                lock.active = false;
            }
            const label = button.getChildByName("Label");
            if (label) {
                label.active = false;
            }
            CityChromeView.mountTabCaption(button, TAB_CAPTION[entry.id] || "");
            CityChromeView.mountTabIcon(button, TAB_ICON[entry.id] || "");
            PrefabLoader.bindClick(button, () => {
                if (this.onTab) {
                    this.onTab(entry.id);
                }
            });
            this.tabs[entry.id] = button;
        }
        this.bindActivity();
        this.bindMore();
        this.requireNode(this.lblName, "LblName");
        this.requireNode(this.lblSub, "LblSub");
        this.requireNode(this.goldValue, "CurrencyGold/Value");
        this.requireNode(this.gemValue, "CurrencyGem/Value");
        this.requireNode(this.powerValue, "PowerSlot/Value");
        this.requireNode(this.lblLevel, "LblLevel");
        this.requireNode(this.levelBg, "LevelBg");
        this.requireNode(this.avatar, "Avatar");
        this.requireNode(this.actGroup, "ActGroup");
        this.requireNode(this.utilityRow, "UtilityRow");
        ViewportLayoutUtils.bindVisibleRefresh(this.node, () => {
            if (!this.node || !this.node.isValid) {
                return;
            }
            const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
            this.fitChildren(box.width);
        });
        GameLog.shared.classified("MODULE", "info", "CityChromeView", "view " + CITY_CHROME_PREFAB_PATH);
    }

    /** 核对活动按钮引用并统一转交活动列表操作，缺少注入操作时记录展示警告。 */
    private bindActivity(): void {
        const buttons = this.activityButtons;
        if (!buttons || buttons.length !== ACTIVITY_NAMES.length) {
            throw new Error("ActGroup 按钮没有绑全");
        }
        for (let i = 0; i < buttons.length; i++) {
            const button = buttons[i];
            if (!button) {
                throw new Error("缺少节点 " + ACTIVITY_NAMES[i]);
            }
            PrefabLoader.bindClick(button, () => {
                if (this.actions) {
                    this.actions.openActivity();
                }
                else {
                    GameLog.shared.classified("MODULE", "warn", "CityChromeView", "活动按钮没有回调");
                }
            });
        }
    }

    /** 绑定录像、好友、排行及更多到统一更多入口，并单独转交邮件操作；不开放额外玩法。 */
    private bindMore(): void {
        const more = [this.btnReplay, this.btnFriend, this.btnRank, this.btnMore];
        const names = ["BtnReplay", "BtnFriend", "BtnRank", "BtnMore"];
        for (let i = 0; i < more.length; i++) {
            const button = more[i];
            if (!button) {
                throw new Error("缺少节点 " + names[i]);
            }
            PrefabLoader.bindClick(button, () => {
                if (this.actions) {
                    this.actions.openMore();
                }
                else {
                    GameLog.shared.classified("MODULE", "warn", "CityChromeView", "更多按钮没有回调");
                }
            });
        }
        const mail = this.requireNode(this.btnMail, "BtnMail");
        PrefabLoader.bindClick(mail, () => {
            if (this.actions) {
                this.actions.openMail();
            }
            else {
                GameLog.shared.classified("MODULE", "warn", "CityChromeView", "邮件按钮没有回调");
            }
        });
    }

    /** 返回已绑定的必需节点；缺失时抛出绑定错误，由开页边界记录并中止打开。 */
    private requireNode(node: Node | null, label: string): Node {
        if (!node) {
            throw new Error("缺少节点 " + label);
        }
        return node;
    }

    /**
     * 底栏只用预制上的 Bg。不再铺运行时色块，避免七个键后面多一层深色垫。
     */
    private sealBottom(): void {
        const bg = this.requireNode(this.bottomBg, "BottomBar/Bg");
        const ui = bg.getComponent(UITransform);
        const bottom = bg.parent;
        if (!bottom) {
            return;
        }
        const barUi = bottom.getComponent(UITransform);
        const barSize = ViewportLayoutUtils.uiSize(barUi);
        const bgSize = ViewportLayoutUtils.uiSize(ui);
        const barW = barSize && barSize.width > BOTTOM_BG_WIDTH ? barSize.width : BOTTOM_BG_WIDTH;
        const height = bgSize && bgSize.height > 0 ? bgSize.height : 129;
        if (ui) {
            ui.setContentSize(barW, height);
        }
        const pad = bottom.getChildByName("BgPad");
        if (pad) {
            pad.active = false;
        }
    }

    /**
     * 顶栏底栏按可见宽拉开。这里只看根的直接子节点，用来拉条，不拿来找业务节点。
     */
    private fitChildren(width: number): void {
        const kids = this.node.children;
        for (let i = 0; i < kids.length; i++) {
            const child = kids[i];
            if (child.name === "TopBar" || child.name === "top-bg") {
                ViewportLayoutUtils.stretchBar(child, width, "top");
            }
            else if (child.name === "BottomBar" || child.name === "bottom-bg") {
                ViewportLayoutUtils.stretchBar(child, width, "bottom");
            }
            else {
                ViewportLayoutUtils.squeezeWideNode(child, width);
            }
        }
        for (let i = 0; i < kids.length; i++) {
            const child = kids[i];
            if (child.name !== "TopBar" && child.name !== "BottomBar") {
                continue;
            }
            const inner = child.children;
            for (let j = 0; j < inner.length; j++) {
                const node = inner[j];
                if (node.name === "Bg" || node.name === "BgPad") {
                    continue;
                }
                if (CityChromeUtils.isCityTab(node.name)) {
                    CityChromeUtils.layoutCityTab(node, width);
                }
                else {
                    ViewportLayoutUtils.squeezeWideNode(node, width);
                }
            }
        }
        CityChromeUtils.layoutCityHeader(this.node, width);
    }

    /** 复用头像容器并按路径标记更新图片，迟到的旧路径结果不能覆盖当前头像。 */
    private paintAvatar(icon: string | null): void {
        const avatar = this.avatar;
        if (!avatar) {
            return;
        }
        if (!icon) {
            avatar.active = false;
            return;
        }
        avatar.active = true;
        let face = avatar.getChildByName("Face");
        if (!face) {
            face = UiKitUtils.uiNode("Face");
            const ui = face.addComponent(UITransform);
            ui.setContentSize(78, 78);
            const sprite = face.addComponent(Sprite);
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            face.setPosition(0, 0, 0);
            face.parent = avatar;
        }
        const mark = face as Node & {
            mxzgIcon?: string;
        };
        if (mark.mxzgIcon === icon) {
            return;
        }
        mark.mxzgIcon = icon;
        const sprite = face.getComponent(Sprite);
        if (!sprite) {
            return;
        }
        const wanted = icon;
        ResManager.setSprite(face, [wanted], () => mark.mxzgIcon === wanted);
    }

    /** 首次绑定时在已有按钮内创建底栏文字图节点，图片资源随该节点释放。 */
    private static mountTabCaption(button: Node, path: string): void {
        if (!path) {
            return;
        }
        const size = ViewportLayoutUtils.uiSize(button.getComponent(UITransform));
        const plate = size ? size.height : 78;
        const node = UiKitUtils.uiNode("Caption");
        const captionUi = node.addComponent(UITransform);
        captionUi.setContentSize(plate >= 90 ? 65 : 54, plate >= 90 ? 36 : 30);
        const sprite = node.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        node.setPosition(0, plate >= 90 ? -46 : -36, 0);
        node.parent = button;
        ResManager.setSprite(sprite.node, [path]);
    }

    /** 按既有按钮节点更新图标，空路径使用预制体原图。 */
    private static mountTabIcon(button: Node, path: string): void {
        if (!path) {
            return;
        }
        const icon = button.getChildByName("Icon");
        const sprite = icon ? icon.getComponent(Sprite) : null;
        if (!sprite) {
            return;
        }
        ResManager.setSprite(sprite.node, [path]);
    }

    /** 在既有锁定节点显示主线等级门槛，零门槛时隐藏文字。 */
    private static paintLockLevel(lock: Node, level: number): void {
        const text = level > 1 ? "Lv" + level : "";
        let node = lock.getChildByName("Lv");
        if (!text) {
            if (node) {
                node.active = false;
            }
            return;
        }
        if (!node) {
            node = UiKitUtils.createLabel(text, 16, { color: new Color(255, 244, 220, 255), width: 64, height: 22 });
            node.name = "Lv";
            node.setPosition(0, -20, 0);
            node.parent = lock;
        }
        node.active = true;
        UiKitUtils.setText(node, text);
        const label = node.getComponent(Label);
        if (label) {
            label.overflow = Overflow.SHRINK;
        }
    }

    /** 根据开放、选中或锁定状态返回底栏预制体的统一颜色。 */
    private static prefabTabColor(state: TabState["state"]): Color {
        if (state === "locked") {
            return PREFAB_TAB_LOCKED;
        }
        if (state === "selected") {
            return PREFAB_TAB_SELECTED;
        }
        return PREFAB_TAB_OPEN;
    }
}
