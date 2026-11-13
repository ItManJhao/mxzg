/** 技能验收台：完整Prefab展示配置与开发证据，共享遮罩由UIManager提供；不修改玩家状态。 */
import { _decorator, Button, EditBox, Label, Sprite, SpriteFrame, view as ccView, tween, Tween, Vec3 } from "cc";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { SkillAuditEntry, SkillAuditUtils } from "../utils/SkillAuditUtils";
import { SkillAuditCellView } from "./SkillAuditCellView";
const { ccclass, property } = _decorator;
/** 应用提供受限本机战报播放入口，不携带角色令牌。 */
export interface SkillAuditOpenArgs { play: (skill: SkillAuditEntry, returned: () => void) => Promise<void>; }
@UIRegistry.view({
    id: "skill-audit",
    prefab: "bundles/module/battle/prefabs/SkillAuditView",
    layer: UILayer.Popup,
    cache: false,
    allowMultiple: false,
    hostId: "skill-audit-host",
    modal: { mask: true, closeOnOutside: false },
    prepare: () => GameConfig.instance.prepare([GConfig.HeroType, GConfig.HeroSkill, GConfig.Language]),
})
@ccclass("SkillAuditView")
export class SkillAuditView extends BaseView<SkillAuditOpenArgs> {
    /** Prefab内的浮动提示，不依赖登录页面安装全局toast宿主。 */
    @property(Label) noticeLabel: Label | null = null;
    /** 顶部目录范围说明。 */
    @property(Label) owner: Label | null = null;
    /** 英雄和技能列表切换按钮。 */
    @property([Button]) kindButtons: Button[] = [];
    /** 当前英雄/技能标题。 */
    @property(Label) selection: Label | null = null;
    /** 搜索当前列表的名称或配置ID。 */
    @property(EditBox) search: EditBox | null = null;
    /** 目录滚动容器，格子位置由SuperContent维护。 */
    @property(SuperScroll) options: SuperScroll | null = null;
    /** 播放按钮；未接入条目仍可点击查看飘字原因。 */
    @property(Button) playButton: Button | null = null;
    /** 关闭验收台。 */
    @property(Button) closeButton: Button | null = null;
    /** 说明、状态与缺项，保留在页面而不是只显示飘字。 */
    @property(Label) message: Label | null = null;
    /** 预制体提供的选中/未选中页签图片，打开时保存，切换目录时复用。 */
    private tabFrames: Array<SpriteFrame | null> = [];
    /** 当前选中英雄配置，0表示尚未选择。 */
    private heroId = 0;
    /** 当前技能等级，切换英雄时清空。 */
    private selected: SkillAuditEntry | null = null;
    /** true为英雄目录，false为所选英雄技能目录。 */
    private heroes = true;
    /** 关闭后不再写入异步播放结果。 */
    private closed = true;

    /** 打开目录、绑定本页事件并适配内容比例；遮罩归UIManager，默认展示全部英雄。 */
    onOpen(args: SkillAuditOpenArgs): void {
        this.args = args;
        this.closed = false;
        this.heroId = 0;
        this.selected = null;
        this.heroes = true;
        this.tabFrames = this.kindButtons.map(button => button.getComponent(Sprite)?.spriteFrame || null);
        this.search!.string = "";
        const size = ccView.getVisibleSize();
        const scale = Math.min(size.width * .94 / 600, size.height * .9 / 820) / ViewportLayoutUtils.ancestorScale(this.node);
        this.node.setScale(scale, scale, 1);
        this.bind(this.closeButton!, () => this.close());
        this.bind(this.kindButtons[0], () => { this.heroes = true; this.search!.string = ""; this.paint(); });
        this.bind(this.kindButtons[1], () => {
            if (!this.heroId) { this.showNotice("请先选择英雄"); return; }
            this.heroes = false; this.search!.string = ""; this.paint();
        });
        this.bind(this.playButton!, () => { void this.play(); });
        const changed = () => this.paint();
        this.search!.node.on(EditBox.EventType.TEXT_CHANGED, changed);
        this.ownListener(() => this.search?.node?.off(EditBox.EventType.TEXT_CHANGED, changed));
        this.owner!.string = "开发进度展示 · 不修改玩家数据\n状态按技能等级登记，演示使用固定测试战报";
        this.selection!.string = "请选择英雄";
        this.message!.string = "选择英雄，再选择技能等级。\n规则已验证：通过测试，暂无独立演示。";
        this.paint();
    }

    /** 页面关闭时自动解绑，避免重复打开多次响应。 */
    private bind(button: Button, action: () => void): void {
        button.node.on(Button.EventType.CLICK, action);
        this.ownListener(() => { if (button.node.isValid) button.node.off(Button.EventType.CLICK, action); });
    }

    /** 搜索完整目录，不截断前100条；列表复用格子并滚回顶部。 */
    private paint(): void {
        this.kindButtons.forEach((button, index) => {
            const sprite = button.getComponent(Sprite);
            if (sprite) sprite.spriteFrame = this.tabFrames[this.heroes === (index === 0) ? 0 : 1];
        });
        const word = this.search!.string.trim().toLowerCase();
        const rows: Array<{ caption: string; tap: () => void }> = this.heroes
            ? GameConfig.instance.getFile(GConfig.HeroType).rows.map(hero => {
                const skills = SkillAuditUtils.skills(hero.type);
                const count = skills.filter(skill => skill.fixture).length;
                return { caption: String(hero.note || hero.type) + " [" + hero.type + "] " + count + "/" + skills.length,
                    tap: () => {
                        this.heroId = hero.type; this.selected = null; this.heroes = false;
                        this.search!.string = ""; this.selection!.string = String(hero.note || hero.type);
                        this.message!.string = "请选择技能等级；计数表示可演示条目，不是全部已验收。"; this.paint();
                    } };
            }) : SkillAuditUtils.skills(this.heroId).map(skill => ({
                caption: skill.name + " Lv." + skill.level + " · " + skill.status + " [" + skill.id + "]",
                tap: () => {
                    this.selected = skill;
                    this.selection!.string = skill.name + " Lv." + skill.level + " · " + skill.status;
                    this.message!.string = skill.reason + "\n" + (skill.description.length > 90 ? skill.description.slice(0, 90) + "…" : skill.description);
                }
            }));
        this.options!.list.setData(rows.filter(row => row.caption.toLowerCase().includes(word)),
            (node, row) => node.getComponent(SkillAuditCellView)!.show(row.caption, row.tap));
        this.options!.toStart();
    }

    /** 使用预制体提示节点浮动显示原因；重复提示先取消旧动画，关页时清理。 */
    private showNotice(text: string): void {
        const label = this.noticeLabel!;
        Tween.stopAllByTarget(label.node);
        label.string = text;
        label.node.active = true;
        label.node.setPosition(0, -80, 0);
        tween(label.node).by(0.3, { position: new Vec3(0, 20, 0) }).delay(1.3)
            .call(() => { if (label.node.isValid) label.node.active = false; }).start();
    }

    /** 播放已有证据场景；未支持时保留原因并飘字，失败后可重试。 */
    private async play(): Promise<void> {
        if (!this.selected?.fixture) {
            this.showNotice(this.selected ? this.selected.reason : "请先选择英雄和技能等级");
            return;
        }
        this.playButton!.interactable = false;
        try {
            await this.args!.play(this.selected, () => {
                if (!this.closed && this.node.isValid) this.node.active = true;
            });
            if (!this.closed) this.node.active = false;
        }
        catch (error) {
            if (!this.closed) {
                this.node.active = true;
                this.message!.string = "演示打开失败：" + String(error);
                this.showNotice("演示资源未就绪，请启动独立战报服务");
            }
        } finally { if (!this.closed) this.playButton!.interactable = true; }
    }

    /** 关闭仅释放本页引用，不影响账号、英雄或背包。 */
    onClose(): void {
        this.closed = true;
        if (this.noticeLabel?.node.isValid) Tween.stopAllByTarget(this.noticeLabel.node);
        this.args = undefined;
    }
}
