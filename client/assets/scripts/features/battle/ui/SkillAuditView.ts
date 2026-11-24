/** 技能验收台：完整Prefab展示配置与开发证据，共享遮罩和操作飘字由UIManager提供；不修改玩家状态。 */
import { _decorator, Button, EditBox, Label, Sprite, SpriteFrame, view as ccView } from "cc";
import { BaseView } from "../../../framework/ui/BaseView";
import { EventScope } from "../../../framework/EventScope";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { UIManager } from "../../../framework/ui/UIManager";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { SkillAuditEntry, SkillAuditEvidence, SkillAuditUtils } from "../utils/SkillAuditUtils";
import { SkillAuditCellView } from "./SkillAuditCellView";
const { ccclass, property } = _decorator;
/** 应用提供本机目录读取和战报播放能力，不携带角色令牌。 */
export interface SkillAuditOpenArgs {
    /** 每次打开重新扫描并校验已有战报，不复用人工完成清单。 */
    load: () => Promise<readonly SkillAuditEvidence[]>;
    /** 播放本次目录已校验的原二进制，返回时恢复目录。 */
    play: (skill: SkillAuditEntry, returned: () => void) => Promise<void>;
    /** 关闭本窗时撤销本次目录读取及所属演示，不影响其他开发窗口。 */
    cancel: () => void;
}
@UIRegistry.view({
    id: "skill-audit",
    prefab: "bundles/module/battle/prefabs/SkillAuditView",
    layer: UILayer.Popup,
    cache: false,
    allowMultiple: false,
    hostId: "skill-audit-host",
    modal: { mask: true, closeOnOutside: false },
})
@ccclass("SkillAuditView")
export class SkillAuditView extends BaseView<SkillAuditOpenArgs> {
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
    /** 预制体提供的选中/未选中页签图片，首次打开保存，重开时不采集已切换的顺序。 */
    private tabFrames: Array<SpriteFrame | null> = [];
    /** 当前显示期的按钮与搜索监听；重开先清理，关闭后全部解除，不影响其他界面。 */
    private readonly bindings = new EventScope("SkillAuditView");
    /** 当前选中英雄配置，0表示尚未选择。 */
    private heroId = 0;
    /** 当前技能等级，切换英雄时清空。 */
    private selected: SkillAuditEntry | null = null;
    /** true为英雄目录，false为所选英雄技能目录。 */
    private heroes = true;
    /** 关闭后不再写入异步播放结果。 */
    private closed = true;
    /** 本次打开检测到的精确出手证据；关闭清空，不代表模块开发完成状态。 */
    private evidence: readonly SkillAuditEvidence[] = [];
    /** true表示目录已经读完；失败时可点击播放按钮重试检测。 */
    private catalogueReady = false;
    /** 目录读取的本窗代次，关闭或重新打开后拒绝迟到展示。 */
    private catalogueEpoch = 0;
    /** 当前显示期由应用提供的撤销函数；BaseView提前更新args时仍能正确撤销上一期。 */
    private cancelSession: (() => void) | null = null;

    /** 打开配置目录并自动检测真实战报，绑定本页事件；遮罩归UIManager，默认展示全部英雄。 */
    onOpen(args: SkillAuditOpenArgs): void {
        this.catalogueEpoch++;
        this.bindings.clear();
        this.cancelSession?.();
        this.cancelSession = args.cancel;
        this.args = args;
        this.closed = false;
        this.heroId = 0;
        this.selected = null;
        this.heroes = true;
        this.evidence = [];
        this.catalogueReady = false;
        if (this.tabFrames.length === 0) {
            this.tabFrames = this.kindButtons.map(button => button.getComponent(Sprite)?.spriteFrame || null);
        }
        this.search!.string = "";
        const size = ccView.getVisibleSize();
        const scale = Math.min(size.width * .94 / 600, size.height * .9 / 820)
            / ViewportLayoutUtils.ancestorScale(this.node);
        this.node.setScale(scale, scale, 1);
        this.bind(this.closeButton!, () => this.close());
        this.bind(this.kindButtons[0], () => {
            this.heroes = true;
            this.search!.string = "";
            this.paint();
        });
        this.bind(this.kindButtons[1], () => {
            if (!this.heroId) {
                this.showNotice("请先选择英雄");
                return;
            }
            this.heroes = false;
            this.search!.string = "";
            this.paint();
        });
        this.bind(this.playButton!, () => {
            void this.play();
        });
        const changed = () => this.paint();
        const searchNode = this.search!.node;
        searchNode.on(EditBox.EventType.TEXT_CHANGED, changed);
        this.bindings.add(() => {
            if (searchNode.isValid) {
                searchNode.off(EditBox.EventType.TEXT_CHANGED, changed);
            }
        });
        this.owner!.string = "只读技能演示 · 不修改玩家数据\n正在自动检测已有战报";
        this.selection!.string = "请选择英雄";
        this.message!.string = "选择英雄，再选择技能等级。\n有演示表示已检测到真实出手，不等同于已验收。";
        this.paint();
        void this.loadCatalogue();
    }

    /** 自动重扫目录；错误只飘字一次，保留配置列表和显式重试，不把失败当成没有实现。 */
    private async loadCatalogue(): Promise<void> {
        const args = this.args;
        const epoch = ++this.catalogueEpoch;
        this.playButton!.interactable = false;
        try {
            const evidence = await args!.load();
            if (this.closed || epoch !== this.catalogueEpoch) {
                return;
            }
            this.evidence = evidence;
            this.catalogueReady = true;
            this.owner!.string = "只读技能演示 · 不修改玩家数据\n自动匹配真实出手和当前动作解析，不是验收记录";
            this.paint();
        } catch (error) {
            if (!this.closed && epoch === this.catalogueEpoch) {
                this.owner!.string = "只读技能演示 · 不修改玩家数据\n目录未就绪，点击播放按钮重新检测";
                if (!UIManager.isOpenCancelled(error) && !UIManager.isFailureReported(error)) {
                    this.showNotice(error instanceof Error ? error.message : String(error));
                }
            }
        } finally {
            if (!this.closed && epoch === this.catalogueEpoch) {
                this.playButton!.interactable = true;
            }
        }
    }

    /** 将按钮监听登记到当前显示期，只在原绑定节点存活时主动解除。 */
    private bind(button: Button, action: () => void): void {
        const node = button.node;
        node.on(Button.EventType.CLICK, action);
        this.bindings.add(() => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, action);
            }
        });
    }

    /** 从统一配置的只读行筛选完整目录，不复制配置索引；搜索后列表复用格子并回到顶部。 */
    private paint(): void {
        this.kindButtons.forEach((button, index) => {
            const sprite = button.getComponent(Sprite);
            if (sprite) {
                sprite.spriteFrame = this.tabFrames[this.heroes === (index === 0) ? 0 : 1];
            }
        });
        const word = this.search!.string.trim().toLowerCase();
        let rows: Array<{ caption: string; tap: () => void }>;
        if (this.heroes) {
            rows = GameConfig.instance.getConfig(GConfig.HeroType).map(hero => {
                const skills = SkillAuditUtils.skills(hero.type, this.evidence);
                const count = skills.filter(skill => skill.fixture).length;
                return {
                    caption: String(hero.note || hero.type) + " [" + hero.type + "] " + count + "/" + skills.length,
                    tap: () => {
                        this.heroId = hero.type;
                        this.selected = null;
                        this.heroes = false;
                        this.search!.string = "";
                        this.selection!.string = String(hero.note || hero.type);
                        this.message!.string = "请选择技能等级；计数为匹配真实出手的条目，不是已验收数量。";
                        this.paint();
                    },
                };
            });
        } else {
            rows = SkillAuditUtils.skills(this.heroId, this.evidence).map(skill => ({
                caption: skill.name + " Lv." + skill.level + " · " + skill.status + " [" + skill.id + "]",
                tap: () => {
                    this.selected = skill;
                    this.selection!.string = skill.name + " Lv." + skill.level + " · " + skill.status;
                    const description = skill.description.length > 90
                        ? skill.description.slice(0, 90) + "…" : skill.description;
                    this.message!.string = skill.reason + "\n" + description;
                },
            }));
        }
        this.options!.list.setData(
            rows.filter(row => row.caption.toLowerCase().includes(word)),
            (node, row) => node.getComponent(SkillAuditCellView)!.show(row.caption, row.tap),
        );
        this.options!.toStart();
    }

    /** 操作原因转交全局飘字；关闭后的迟到结果和空串不覆盖其他页面的提示。 */
    private showNotice(text: string): void {
        if (!this.closed && text.trim()) {
            UIManager.instance.toast(text);
        }
    }

    /** 播放本次自动检测的原战报；目录读取失败时重新检测，取消和框架失败不重复飘字。 */
    private async play(): Promise<void> {
        if (this.closed || this.playButton?.interactable === false) {
            return;
        }
        if (!this.catalogueReady) {
            await this.loadCatalogue();
            return;
        }
        if (this.selected) {
            this.selected = SkillAuditUtils.skills(this.heroId, this.evidence)
                .find(skill => skill.id === this.selected!.id && skill.level === this.selected!.level) || null;
        }
        if (!this.selected?.fixture) {
            this.showNotice(this.selected ? this.selected.reason : "请先选择英雄和技能等级");
            return;
        }
        const epoch = this.catalogueEpoch;
        this.playButton!.interactable = false;
        try {
            await this.args!.play(this.selected, () => {
                if (!this.closed && epoch === this.catalogueEpoch && this.node.isValid) {
                    this.node.active = true;
                }
            });
            if (!this.closed && epoch === this.catalogueEpoch) {
                this.node.active = false;
            }
        } catch (error) {
            if (!this.closed && epoch === this.catalogueEpoch) {
                this.node.active = true;
                if (!UIManager.isOpenCancelled(error) && !UIManager.isFailureReported(error)) {
                    this.showNotice("演示打开失败：" + (error instanceof Error ? error.message : String(error)));
                }
            }
        } finally {
            if (!this.closed && epoch === this.catalogueEpoch) {
                this.playButton!.interactable = true;
            }
        }
    }

    /** 关闭仅释放本页引用，不清除全局飘字，也不影响账号、英雄或背包。 */
    onClose(): void {
        this.closed = true;
        this.catalogueEpoch++;
        this.bindings.clear();
        this.evidence = [];
        this.selected = null;
        this.cancelSession?.();
        this.cancelSession = null;
        this.args = undefined;
    }
}
