/** 契约 VIP 底栏页面。旧任务页、契约预览和权益窗共用服务器等级与任务快照。 */
import { _decorator, Button, Label, Node, Sprite, UITransform } from "cc";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { ResManager } from "../../../framework/assets/ResManager";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { BagInfoView } from "../../bag/ui/BagInfoView";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import { ItemDetailUtils } from "../../bag/utils/ItemDetailUtils";
import { BattleSpineService } from "../../battle/ui/BattleSpineService";
import type { VipState, VipTask } from "../data/VipData";
import { VipController } from "../VipController";
import { VipModel } from "../VipModel";
import { VipBenefitsView } from "./VipBenefitsView";
import { VipTaskCell, type VipTaskDisplay } from "./VipTaskCell";

const { ccclass, property } = _decorator;

/** 当前已迁移的旧任务前往入口。 */
const destinations: Readonly<Record<string, string>> = {
    main_battle: "battle",
    main_hero: "hero",
    main_summon: "main_summon",
    main_mission: "gold-dungeon",
    main_pvp: "arena",
    main_fantasy_tower: "tower",
};

/** 主城导航保持当前账号和底栏状态，VIP 只转交任务前往的入口。 */
export interface VipViewArgs {
    /** 接收已映射的当前主城功能入口。 */
    readonly openFeature?: (id: string) => boolean;
}

/** 原契约总览所用的五个女神编号顺序与独立展示锚点。 */
const portraitOrder = [10101, 10201, 10301, 10401, 10501] as const;

@UIRegistry.view({
    id: "vip",
    prefab: "bundles/module/vip/prefabs/VipView",
    layer: UILayer.Page,
    cache: false,
    allowMultiple: false,
})
@ccclass("VipView")
export class VipView extends BaseView<VipViewArgs> {
    /** 参考 FetterMainViewLayer 的 VIP 内容容器，底栏由主城持有。 */
    @property(UITransform) private panel: UITransform | null = null;
    /** 服务端当前 VIP 档位。 */
    @property(Label) private levelLabel: Label | null = null;
    /** 任务区右侧的已领取／本档总任务数，标题由预制体固定显示。 */
    @property(Label) private progressLabel: Label | null = null;
    /** 旧任务进度填充，从 0 到 1 表示当前档已领取比例。 */
    @property(Sprite) private progressFill: Sprite | null = null;
    /** 页面未获得服务端状态或进入满级只读概览时显示的文字。 */
    @property(Label) private statusLabel: Label | null = null;
    /** 顶部绶带显示正在浏览的女神档位，不代表账号当前等级。 */
    @property(Label) private portraitUnlock: Label | null = null;
    /** 当前女神的原版中文名牌，也随预览箭头更新。 */
    @property(Node) private portraitArtwork: Node | null = null;
    /** 由女神配置技能编号选择的原版技能图标。 */
    @property(Node) private skillIcon: Node | null = null;
    /** 与当前女神一致的简中技能字图，不显示为已装备。 */
    @property(Node) private skillArtwork: Node | null = null;
    /** 五个静态骨骼锚点只在第一次切到时装载。 */
    @property([Node]) private portraitSlots: Node[] = [];
    /** 浏览前一契约。 */
    @property(Button) private previousPortrait: Button | null = null;
    /** 浏览后一契约。 */
    @property(Button) private nextPortrait: Button | null = null;
    /** 打开旧版的 VIP 权益预览弹窗。 */
    @property(Button) private benefitsButton: Button | null = null;
    /** 正式服另有羁绊养成入口；本期仅恢复外观，未接通时给出反馈。 */
    @property(Button) private fetterPowerButton: Button | null = null;
    /** 旧权益表的当前档预告，以预览文案呈现而不声明已经生效。 */
    @property(Label) private privilegeHint: Label | null = null;
    /** 有配置预告时显示原版 New 图。 */
    @property(Node) private privilegeBadge: Node | null = null;
    /** 回到保留的主城根页。 */
    @property(Button) private backButton: Button | null = null;
    /** 契约任务区，已全部解锁时切换为只读契约概览。 */
    @property(Node) private taskPanel: Node | null = null;
    /** 两列任务滚动模板。 */
    @property(SuperScroll) private tasks: SuperScroll | null = null;

    /** 当前浏览的女神序号，重开从第一个开始。 */
    private portraitIndex = 0;
    /** 本轮已向骨骼服务交付的预览编号，实例关闭后由节点释放资源。 */
    private readonly mountedPortraits = new Set<number>();

    /** 初始化预览、特权弹窗和任务状态，领取和跳转仍走既有控制器及导航。 */
    public onOpen(args?: VipViewArgs): void {
        super.onOpen(args);
        if (!this.panel || !this.levelLabel || !this.progressLabel || !this.progressFill || !this.statusLabel
            || !this.portraitUnlock || !this.portraitArtwork || !this.skillIcon || !this.skillArtwork
            || this.portraitSlots.length !== portraitOrder.length || !this.previousPortrait || !this.nextPortrait
            || !this.benefitsButton || !this.fetterPowerButton || !this.privilegeHint || !this.privilegeBadge
            || !this.backButton || !this.taskPanel || !this.tasks) {
            throw new Error("契约 VIP 页面预制体绑定不完整");
        }
        this.portraitIndex = 0;
        const content = this.tasks.list.node;
        content.on(SuperContent.RENDER_ITEM, this.renderTask, this);
        this.ownListener(() => {
            if (content.isValid) {
                content.off(SuperContent.RENDER_ITEM, this.renderTask, this);
            }
        });
        this.bindButton(this.previousPortrait, () => this.movePortrait(-1));
        this.bindButton(this.nextPortrait, () => this.movePortrait(1));
        this.bindButton(this.benefitsButton, () => {
            void UIManager.instance.openChild(this, VipBenefitsView).catch(() => {
                // 取消和失败由页面管理器处理。
            });
        });
        this.bindButton(this.fetterPowerButton, () => UIManager.instance.toast("羁绊之力暂未开放"));
        this.bindButton(this.backButton, () => this.close());
        this.ownListener(EventDispatcher.instance.on(VipModel.Updated, this, this.render));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, this.fit));
        this.render();
    }

    /** 下方显示账号权威等级与任务；上方女神与特权预告保持各自口径。 */
    private render = (): void => {
        const state = VipModel.instance.state;
        this.benefitsButton!.interactable = state !== null;
        this.levelLabel!.string = state ? `VIP ${state.level}` : "VIP";
        const unlocks = GameConfig.instance.getConfig(GConfig.VipUnlock);
        const allUnlocked = state !== null && unlocks.every(row => state.level >= row.vip_level);
        this.statusLabel!.string = !state ? "契约进度尚未同步" : allUnlocked ? "契约已全部解锁" : "";
        this.statusLabel!.node.active = this.statusLabel!.string.length > 0;
        this.taskPanel!.active = state !== null && !allUnlocked;
        if (state && !allUnlocked) {
            this.renderTasks(state);
        }
        this.renderPrivilegeHint(state?.level);
        this.renderPortrait(state?.level);
    };

    /** 旧版以当前 VIP 档位的公告键显示特权提示；没有公告不展示 New。 */
    private renderPrivilegeHint(level?: number): void {
        const config = GameConfig.instance;
        const announceId = level === undefined ? undefined : config.getConfig(GConfig.VipLevel, level)?.announce_lang;
        const text = announceId ? config.getConfig(GConfig.Language, announceId)?.value?.replace(/<[^>]*>/g, "") : "";
        this.privilegeHint!.string = text ? `预览：${text}` : "";
        this.privilegeHint!.node.active = !!text;
        this.privilegeBadge!.active = !!text;
    }

    /** 显示本档全部任务；已有权威进度的任务可前往或领取。 */
    private renderTasks(state: VipState): void {
        const claimed = state.tasks.filter(task => task.claimed).length;
        this.progressLabel!.string = `${claimed}/${state.tasks.length}`;
        this.progressFill!.fillRange = state.tasks.length ? claimed / state.tasks.length : 0;
        this.tasks!.list.setData(state.tasks.map(task => this.taskDisplay(task)));
    }

    /** 保留旧配置的条件高亮；进度只取服务端，不把未接通的任务显示为 0。 */
    private taskDisplay(task: VipTask): VipTaskDisplay {
        const cfg = GameConfig.instance;
        const row = cfg.requireConfig(GConfig.VipMission, task.id);
        const conditions = JSON.parse(row.task) as { condition?: number; subCondition?: number };
        const rewards = JSON.parse(row.reward) as { item_type: number; item_num: number }[];
        const jump = JSON.parse(row.jump_info) as { event_arg: string };
        const condition = String(conditions.condition ?? "");
        const subCondition = String(conditions.subCondition ?? "");
        const title = (cfg.requireConfig(GConfig.Language, row.lang).value ?? "")
            .replace(/\[1\]/g, String(task.target)).replace(/\[2\]/g, condition).replace(/\[3\]/g, subCondition);
        const progress = task.claimed ? task.target : task.progress;
        const claimable = !task.claimed && progress !== undefined && progress >= task.target;
        const destination = this.args?.openFeature && progress !== undefined ? destinations[jump.event_arg] ?? null : null;
        return {
            id: task.id,
            description: ItemDetailUtils.richText(progress === undefined ? title : `${title} (${Math.min(progress, task.target)}/${task.target})`),
            reward: { itemId: rewards[0].item_type, quantity: rewards[0].item_num },
            status: task.claimed ? "已领取" : progress === undefined ? "玩法尚未接入" : "",
            actionText: task.claimed ? "" : claimable ? "领 取" : destination ? "前 往" : "",
            claimable,
            destination,
        };
    }

    /** 当前显示卡片的点击沿用控制器和主城路由，奖励图标为配置预览。 */
    private renderTask(node: Node, task: VipTaskDisplay): void {
        node.getComponent(VipTaskCell)!.render(task, VipController.instance.busy, () => {
            if (task.claimable) {
                VipController.instance.claim(task.id);
            } else if (task.destination) {
                this.args?.openFeature?.(task.destination);
            }
        }, () => {
            const face = BagItemCatalog.face(task.reward.itemId, task.reward.quantity);
            void UIManager.instance.openChild(this, BagInfoView, { source: "description", face }).catch(() => {
                // 页面管理器处理打开失败，切页自动关闭奖励预览。
            });
        });
    }

    /** 切换预览契约，每个静态锚点由自己的页面节点持有资源。 */
    private movePortrait(offset: number): void {
        this.portraitIndex = Math.max(0, Math.min(portraitOrder.length - 1, this.portraitIndex + offset));
        this.renderPortrait(VipModel.instance.state?.level);
    }

    /** 切换女神的解锁门槛、原名牌、技能字图和骨骼，不更改出战状态。 */
    private renderPortrait(level?: number): void {
        const id = portraitOrder[this.portraitIndex];
        const unlock = GameConfig.instance.requireConfig(GConfig.VipUnlock, id);
        const state = level !== undefined && level >= unlock.vip_level ? "已解锁" : "解锁";
        this.portraitUnlock!.string = `VIP ${unlock.vip_level} ${state}`;
        ResManager.setSprite(this.portraitArtwork, ResManager.ui("vip", `fetters-lang_fetter-${id}`));
        ResManager.setSprite(this.skillIcon, ResManager.ui("vip", `fetters_skill_${unlock.skill}`));
        ResManager.setSprite(this.skillArtwork, ResManager.ui("vip", `fetters-lang_spr-skill-${id}`));
        this.previousPortrait!.node.active = this.portraitIndex > 0;
        this.nextPortrait!.node.active = this.portraitIndex < portraitOrder.length - 1;
        this.portraitSlots.forEach((slot, index) => { slot.active = index === this.portraitIndex; });
        if (!this.mountedPortraits.has(id)) {
            this.mountedPortraits.add(id);
            BattleSpineService.instance.mountNamedSpine(this.portraitSlots[this.portraitIndex], String(id), "stand");
        }
    }

    /** 绑定按钮时捕获节点，兼容引擎先销毁子组件再清理页面。 */
    private bindButton(button: Button, action: () => void): void {
        const node = button.node;
        node.on(Button.EventType.CLICK, action);
        this.ownListener(() => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, action);
            }
        });
    }

    /** 页面背景铺满视口，交互区按 640 设计宽度等比缩放。 */
    private fit = (): void => {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const scale = Math.min(1, box.width / this.panel!.width, box.height / this.panel!.height);
        this.panel!.node.setScale(scale, scale, 1);
    };
}
