/**
 * 在已有挂点上播一串 spriteFrame。最后一帧停住，下一拍重新 play 或 stop。
 * 路径是 resources 里的 spriteFrame，不带扩展名。
 */
import { Node,Sprite,SpriteFrame,UITransform } from "cc";
import { battleFrameStepMs } from "../../../config/battleTiming";
import { GameLog } from "../../../core/GameLog";
import { ResourceAssetsUtils } from "../../../framework/assets/ResourceAssets";
import { uiNode } from "../../../framework/ui/UiKit";
import { armBattleDelay } from "./battleClock";

export const FRAME_STEP_MS = 70;

/** ×2、×3 把帧间隔收短，最短约一帧导演步，序列仍能在缩短后的拍子里播完。 */
export function battleFrameStep(speed: number): number {
    let steps = 1;
    if (speed === 2) steps = 2;
    else if (speed === 3) steps = 3;
    const step = Math.floor((battleFrameStepMs() || FRAME_STEP_MS) / steps);
    if (step < 24) return 24;
    return step;
}

export interface FrameReel {
    node: Node;
    play(paths: string[], onResult?: (ok: boolean) => void, stepMs?: number): void;
    stop(): void;
}

/** 创建节点拥有的序列帧播放器；销毁自动停止调度并释放帧资源。 */
export function mountFrameReel(parent: Node, size: number, name = "FrameReel"): FrameReel {
    const node = uiNode(name);
    const ui = node.addComponent(UITransform);
    ui.setContentSize(size, size);
    const sprite = node.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.TRIMMED;
    sprite.type = Sprite.Type.SIMPLE;
    node.active = false;
    node.parent = parent;

    let token = 0;
    let cancel: (() => void) | null = null;

    const clearTimer = () => {
        if (!cancel) return;
        cancel();
        cancel = null;
    };

    const stop = () => {
        token += 1;
        clearTimer();
        if (node.isValid) node.active = false;
    };

    node.once(Node.EventType.NODE_DESTROYED, stop);

    const play = (paths: string[], onResult?: (ok: boolean) => void, stepMs?: number) => {
        token += 1;
        const mine = token;
        clearTimer();
        const step = typeof stepMs === "number" && isFinite(stepMs) && stepMs > 0 ? stepMs : battleFrameStepMs() || FRAME_STEP_MS;
        if (!paths || paths.length === 0) {
            if (node.isValid) node.active = false;
            if (onResult) onResult(false);
            return;
        }
        const pending: Promise<SpriteFrame | null>[] = [];
        for (let i = 0; i < paths.length; i++) pending.push(loadFrame(node, paths[i]));
        Promise.all(pending).then((frames) => {
            if (mine !== token || !node.isValid) return;
            const ready: SpriteFrame[] = [];
            for (let i = 0; i < frames.length; i++) {
                const frame = frames[i];
                if (frame) ready.push(frame);
            }
            if (ready.length === 0) {
                node.active = false;
                GameLog.shared.classified("MODULE", "warn",
                    "BattleFx",
                    "reel empty " + name + " tried=" + paths.slice(0, 3).join(",") + (paths.length > 3 ? "…" : "")
                );
                if (onResult) onResult(false);
                return;
            }
            let index = 0;
            const tick = () => {
                if (mine !== token || !node.isValid) return;
                sprite.spriteFrame = ready[index];
                sprite.sizeMode = Sprite.SizeMode.TRIMMED;
                node.active = true;
                if (index >= ready.length - 1) return;
                index += 1;
                cancel = armBattleDelay(step, tick);
            };
            tick();
            if (onResult) onResult(true);
        });
    };

    return { node, play, stop };
}

/** 同节点重复加载由共享池去重，失败不永久缓存，节点销毁后释放。 */
function loadFrame(node: Node, path: string): Promise<SpriteFrame | null> {
    return ResourceAssetsUtils.forNode(node).loadPath(path + "/spriteFrame", "SpriteFrame").catch(() => null);
}
