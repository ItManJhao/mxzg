/**
 * 通用升级只读窗口：保留旧RoleUpgradeLayer的等级对比、奖励区域和下一功能预告布局。
 * 奖励标题统一为“本次获得”，同时准确覆盖正常附赠和冷恢复的基础奖励加附赠，不把整笔实际量说成升级赠送。
 * 由原奖励队列打开完整common预制体，复用BagItemView、SuperScroll与现有资源池。
 * 历史等级和到账明细由调用方提供；本窗不联网、不发奖、不读取当前资产或开放预告功能。
 */
import { _decorator, AudioSource, Label, Node, RichText, Sprite, SpriteFrame } from "cc";
import { AudioPreferences } from "../../../core/AudioPreferences";
import { GameLog } from "../../../core/GameLog";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { ResManager } from "../../../framework/assets/ResManager";
import { ResourceAssetsUtils } from "../../../framework/assets/ResourceAssetsUtils";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { BagInfoView } from "../../bag/ui/BagInfoView";
import { BagItemView } from "../../bag/ui/BagItemView";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import type { RewardArgs, RewardRow } from "../data/RewardData";
import { RewardUtils } from "../utils/RewardUtils";
import { RoleUpgradeUtils, RoleUpgradeFeature } from "../utils/RoleUpgradeUtils";

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "role-upgrade",
    prefab: "bundles/module/common/prefabs/RoleUpgradeView",
    layer: UILayer.Popup,
    cache: false,
    allowMultiple: false,
    hostId: "remake-modal",
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("RoleUpgradeView")
export class RoleUpgradeView extends BaseView<RewardArgs> {
    /** 旧640×550完整主体，等级、奖励及预告位置均保存在Prefab。 */
    @property(Node) panel: Node | null = null;
    /** 历史升级前等级，不从当前AccountModel反推。 */
    @property(Label) beforeLevel: Label | null = null;
    /** 同一历史结果的升级后等级，不随后来状态变化。 */
    @property(Label) afterLevel: Label | null = null;
    /** 原物品格的四列虚拟列表；冷恢复含基础与附赠时可纵滚，Prefab限制一行视口避免遮挡预告。 */
    @property(SuperScroll) rewards: SuperScroll | null = null;
    /** 真实升级零到账时的只读说明，仍可显示前后等级。 */
    @property(Label) emptyLabel: Label | null = null;
    /** 下一功能的信息容器；没有更高候选时只隐藏信息，不改变任何入口。 */
    @property(Node) featureInfo: Node | null = null;
    /** 下一功能旧home图标，按up图再icon图回退，不绑定点击事件。 */
    @property(Sprite) featureIcon: Sprite | null = null;
    /** 下一功能的真实名称语言，缺失明确标记。 */
    @property(Label) featureName: Label | null = null;
    /** 下一功能的真实说明语言，长文换行由Prefab保存。 */
    @property(Label) featureDescription: Label | null = null;
    /** 原47576的等级条件颜色文本，不用于判断或开放功能。 */
    @property(RichText) featureCondition: RichText | null = null;
    /** 旧item-get获得音源，关闭时停止并解除clip引用。 */
    @property(AudioSource) rewardAudio: AudioSource | null = null;
    /** 当前已经校验的实际到账行，关闭清空，不保存库存或持久实例。 */
    private rows: readonly RewardRow[] = [];
    /** 当前窗口的完整只读参数指纹，同回执重复打开不重播声音或替换内容。 */
    private signature = "";
    /** true表示本次窗口已结束，迟到资源不再显示。 */
    private released = true;
    /** 本页资源准备代次，每次打开与关闭递增，不承担账号隔离。 */
    private preparation = 0;
    /** 当前原回执关闭回调；取走后再通知，重复关闭不能推进队列两次。 */
    private closedCallback: (() => void) | undefined;

    /** 校验静态绑定，登记列表与可见区域监听；本窗口关闭后由BaseView统一解除。 */
    public onBind(): void {
        if (!this.panel || !this.beforeLevel || !this.afterLevel || !this.rewards || !this.emptyLabel
            || !this.featureInfo || !this.featureIcon || !this.featureName || !this.featureDescription
            || !this.featureCondition || !this.rewardAudio) {
            throw new Error("升级窗口静态绑定缺失");
        }
        const content = this.rewards.list.node;
        content.on(SuperContent.RENDER_ITEM, this.onRender, this);
        content.on(SuperContent.SELECT_ITEM, this.onSelect, this);
        this.ownListener(() => {
            if (content.isValid) {
                content.off(SuperContent.RENDER_ITEM, this.onRender, this);
                content.off(SuperContent.SELECT_ITEM, this.onSelect, this);
            }
        });
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node,
            () => ViewportLayoutUtils.fitVisibleRoot(this.node)));
    }

    /** 展示同一真实回执的等级与到账；零奖励仍开升级窗，同编号不同等级或物品拒绝替换。 */
    public onOpen(args: RewardArgs): void {
        const levels = RoleUpgradeUtils.levels(args?.roleUpgrade);
        const rows = RewardUtils.rows(args);
        if (args.onClosed !== undefined && typeof args.onClosed !== "function") {
            throw new Error("升级窗口关闭回调无效");
        }
        const signature = JSON.stringify([args.receiptId, levels, rows]);
        if (!this.released) {
            if (signature !== this.signature) {
                throw new Error("当前升级回执展示内容不一致");
            }
            this.closedCallback = args.onClosed ?? this.closedCallback;
            this.args = args;
            return;
        }
        this.beginOpen();
        this.args = args;
        this.signature = signature;
        this.rows = rows;
        this.released = false;
        this.closedCallback = args.onClosed;
        this.panel!.active = false;
        this.beforeLevel!.string = String(levels.beforeLevel);
        this.afterLevel!.string = String(levels.afterLevel);
        this.rewards!.list.setData(rows);
        this.rewards!.toStart();
        this.emptyLabel!.node.active = rows.length === 0;
        const feature = this.nextFeature(levels.afterLevel);
        this.showFeature(feature);
        const preparation = ++this.preparation;
        void this.prepare(preparation, feature).catch(error => {
            if (this.current(preparation)) {
                this.failOpen(error instanceof Error ? error : new Error(String(error)));
            }
        });
    }

    /** 直接读取登录已安装的旧客户端候选与语言映射，不另行准备JSON或改变当前实际入口门槛。 */
    private nextFeature(afterLevel: number): RoleUpgradeFeature | null {
        return RoleUpgradeUtils.nextFeature(afterLevel, GameConfig.instance.getConfig(GConfig.RoleUpgradeFeature),
            id => GameConfig.instance.getConfig(GConfig.Language, id)?.value);
    }

    /** 只修改Prefab已有显示节点，预告没有按钮，不触发模块打开或玩法状态变化。 */
    private showFeature(feature: RoleUpgradeFeature | null): void {
        this.featureInfo!.active = feature !== null;
        this.featureIcon!.spriteFrame = null;
        if (!feature) {
            return;
        }
        this.featureName!.string = feature.name ?? "功能名称缺失";
        this.featureDescription!.string = feature.description ?? "功能说明缺失";
        this.featureCondition!.string = feature.condition ?? "开放条件缺失";
    }

    /** 准备原获得音和功能图，音效遵循设备设置，关页后不恢复主体或播放。 */
    private async prepare(preparation: number, feature: RoleUpgradeFeature | null): Promise<void> {
        const [clip, icon] = await Promise.all([
            ResourceAssetsUtils.forNode(this.node).loadPath("audio/item-get", "AudioClip"),
            this.loadFeatureIcon(feature, preparation),
        ]);
        if (!this.current(preparation)) {
            return;
        }
        this.featureIcon!.spriteFrame = icon;
        this.featureIcon!.node.active = icon !== null;
        this.rewardAudio!.clip = clip;
        this.panel!.active = true;
        AudioPreferences.playEffect(this.rewardAudio!);
        this.finishOpen();
    }

    /** 依旧先读up图再读icon图；都缺失时只记录明确路径，保留等级与文字，不造资源清单。 */
    private async loadFeatureIcon(feature: RoleUpgradeFeature | null, preparation: number): Promise<SpriteFrame | null> {
        if (!feature) {
            return null;
        }
        for (const name of ["main-city_up-" + feature.atom, "main-city_icon-" + feature.atom]) {
            try {
                return await ResManager.getSpriteFrame(this.node, ResManager.ui("home", name));
            } catch (error) {
                if (!this.current(preparation)) {
                    return null;
                }
                GameLog.shared.warnOnce("MODULE", "RoleUpgradeView", "FEATURE_ICON:" + name,
                    "升级功能预告图片未加载：home/ui/" + name + "；" + String(error));
            }
        }
        return null;
    }

    /** 资源和异步开窗结果只在原显示代次有效；关页不干预服务端成功回执。 */
    private current(preparation: number): boolean {
        return !this.released && this.preparation === preparation && this.node.isValid;
    }

    /** 复用现有物品格展示本次实际获得数，不将奖励配置行当作当前库存。 */
    private onRender(node: Node, row: RewardRow): void {
        if (this.released) {
            return;
        }
        const cell = node.getComponent(BagItemView);
        if (!cell) {
            throw new Error("升级奖励Cell缺少BagItemView");
        }
        cell.show(row, false, BagItemCatalog.face(row.itemId, row.quantity), true, false);
    }

    /** 实际奖励可读配置简介，子窗随本升级窗口关闭，不增加使用、领取或功能跳转入口。 */
    private onSelect(row: RewardRow): void {
        if (this.released) {
            return;
        }
        void UIManager.instance.openChild(this, BagInfoView, {
            source: "description",
            face: { ...BagItemCatalog.face(row.itemId, row.quantity), typeLine: "本次获得：" + row.quantity },
        }).catch(() => { /* 打开失败与取消由UIManager统一反馈。 */ });
    }

    /** 先结束本页资源和音效再单次通知原队列；销毁时子节点已失效也不解引用它们。 */
    public onClose(): void {
        this.released = true;
        this.preparation++;
        this.rows = [];
        this.signature = "";
        this.args = undefined;
        try {
            if (this.rewardAudio?.isValid) {
                try {
                    this.rewardAudio.stop();
                } finally {
                    this.rewardAudio.clip = null;
                }
            }
        } finally {
            try {
                if (this.featureIcon?.isValid) {
                    this.featureIcon.spriteFrame = null;
                }
            } finally {
                this.finishOpen();
                this.notifyClosed();
            }
        }
    }

    /** 异常卸载复用同一清理口，不能遗留等待关闭的奖励队列。 */
    public dispose(): void {
        if (!this.released || this.closedCallback) {
            this.onClose();
        }
    }

    /** 等BaseView完成同步退订再交付一次关闭通知，回调异常只记模块日志。 */
    private notifyClosed(): void {
        const callback = this.closedCallback;
        this.closedCallback = undefined;
        if (callback) {
            void Promise.resolve().then(callback).catch(error => {
                GameLog.shared.classified("MODULE", "error", "RoleUpgradeView", "升级窗口关闭回调失败：" + String(error));
            });
        }
    }
}
