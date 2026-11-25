/**
 * 主城加号工具栏的移动动画，由 CityChromeView 在本次显示期持有。
 * 展开位置和加号下的收拢锚点均来自预制体，关闭时停止动画并恢复预制状态。
 */
import { Button, Node, tween, Tween, Vec3 } from "cc";

/** 单个工具按钮正常展示时的几何位置和输入状态。 */
interface UtilityEntry {
    readonly node: Node;
    readonly button: Button;
    readonly expandedPosition: Vec3;
    readonly interactable: boolean;
}

export class CityUtilityFold {
    /** 移动进度，0 表示收拢到加号，1 表示各按钮位于自己的预制坐标。 */
    private readonly pose = { progress: 1 };
    /** 每个需要移动的按钮及其原有展示状态，按预制体层级保存。 */
    private readonly buttons: UtilityEntry[] = [];
    /** 预制体的初始展开状态，解绑后恢复。 */
    private readonly initiallyExpanded: boolean;
    /** 正在播放的补间，结束或解绑时清空；动画期间过滤重复点击。 */
    private animation: Tween<{ progress: number }> | null = null;
    /** 每帧复用的临时坐标，按钮自身复制坐标值。 */
    private readonly position = new Vec3();

    /**
     * @param entries 预制体中的按钮组，只移动组内已激活的工具按钮。
     * @param anchor 与加号重合的锚点，和工具按钮使用同一个局部坐标系。
     */
    public constructor(private readonly entries: Node, private readonly anchor: Node) {
        this.initiallyExpanded = entries.active;
        this.pose.progress = this.initiallyExpanded ? 1 : 0;
        for (const node of entries.children) {
            const button = node.getComponent(Button);
            if (node.active && button) {
                this.buttons.push({ node, button, expandedPosition: node.position.clone(), interactable: button.interactable });
            }
        }
    }

    /** 以旧版的 0.3 秒向加号收拢或从加号展开，移动中的工具按钮暂时不响应点击。 */
    public toggle(): void {
        if (this.animation) {
            return;
        }
        const expanded = !this.entries.active;
        this.updatePose();
        this.setInput(false);
        this.entries.active = true;
        this.animation = tween(this.pose)
            .to(0.3, { progress: expanded ? 1 : 0 }, { onUpdate: () => this.updatePose() })
            .call(() => {
                this.animation = null;
                this.entries.active = expanded;
                this.setInput(expanded);
            })
            .start();
    }

    /** 解绑时取消未完成的补间，使同一预制体重开时从原本布局开始。 */
    public dispose(): void {
        this.animation?.stop();
        this.animation = null;
        if (this.entries.isValid) {
            this.pose.progress = 1;
            this.updatePose();
            this.setInput(true);
            this.entries.active = this.initiallyExpanded;
        }
    }

    /** 由共享进度同步计算所有工具的位置，使横排和竖排同时到达各自锚点。 */
    private updatePose(): void {
        for (const { node, expandedPosition } of this.buttons) {
            if (node.isValid) {
                Vec3.lerp(this.position, this.anchor.position, expandedPosition, this.pose.progress);
                node.setPosition(this.position);
            }
        }
    }

    /** 禁止移动中的点击；动画结束后恢复按钮原有的可交互配置。 */
    private setInput(enabled: boolean): void {
        for (const { button, interactable } of this.buttons) {
            if (button.isValid) {
                button.interactable = enabled && interactable;
            }
        }
    }
}
