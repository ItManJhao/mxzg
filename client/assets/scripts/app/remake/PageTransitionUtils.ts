/**
 * 功能页面切换动画：由新页面导航调用，按当前可见宽度移动页面，不参与业务状态切换。
 */
import { director, Director, Node, view } from "cc";
import { PageSlideUtils } from "../../framework/ui/PageSlideUtils";
/** 执行功能页过渡并返回取消函数；取消也恢复节点位置且完成done。 */
export type PageTransition = (outgoing: Node | null, incoming: Node, from: string, to: string, done: () => void) => () => void;
/** 现有底栏页的左右顺序，只用于过渡方向，不登记页面资源。 */
const pageIndex: Record<string, number> = { "remake-home": 0, hero: 1, bag: 2, mainline: 3, "remake-campaign": 3 };
/** 当前功能页滑动过渡时长，单位为毫秒。 */
export const PAGE_TRANSITION_MS = 280;
/** 功能页过渡工具：节点位置和取消状态只归本次返回的清理句柄，不保存当前页面。 */
export class PageTransitionUtils {
    /** 仅提供静态入口，禁止创建工具实例。 */
    private constructor() {
    }

    /** 只移动功能内容，保留主城顶底栏；销毁或取消后停止帧监听并恢复原位置。 */
    public static slideFeaturePage(outgoing: Node | null, incoming: Node, from: string, to: string, done: () => void): () => void {
        const direction = PageSlideUtils.barSlideDir(pageIndex[from] ?? -1, pageIndex[to] ?? -1);
        if (!direction || !outgoing?.isValid || !incoming.isValid) {
            done();
            return () => {
            };
        }
        const width = view.getVisibleSize().width;
        const start = Date.now();
        const before = { x: outgoing.position.x, y: outgoing.position.y, z: outgoing.position.z };
        const after = { x: incoming.position.x, y: incoming.position.y, z: incoming.position.z };
        type Moving = Node & {
            /** 过渡期间为true，避免可见区刷新把正在滑动的页面强制居中。 */
            mxzgPageAnimating?: boolean;
        };
        (outgoing as Moving).mxzgPageAnimating = true;
        (incoming as Moving).mxzgPageAnimating = true;
        outgoing.active = true;
        incoming.active = true;
        let finished = false;
        /** 每次过渡只结束一次，取消与自然完成共用恢复和清理顺序。 */
        const finish = () => {
            if (finished) {
                return;
            }
            finished = true;
            director.off(Director.EVENT_AFTER_UPDATE, tick);
            if (outgoing.isValid) {
                outgoing.setPosition(before.x, before.y, before.z);
                (outgoing as Moving).mxzgPageAnimating = false;
            }
            if (incoming.isValid) {
                incoming.setPosition(after.x, after.y, after.z);
                (incoming as Moving).mxzgPageAnimating = false;
            }
            done();
        };
        /** 根据实际经过时间更新这一帧，不改变导航当前页或业务状态。 */
        const tick = () => {
            if (!outgoing.isValid || !incoming.isValid) {
                finish();
                return;
            }
            const t = Math.min(1, Math.max(0, (Date.now() - start) / PAGE_TRANSITION_MS));
            const progress = PageSlideUtils.expoOut(t);
            outgoing.setPosition(before.x - direction * width * progress, before.y, before.z);
            incoming.setPosition(after.x + direction * width * (1 - progress), after.y, after.z);
            if (t >= 1) {
                finish();
            }
        };
        director.on(Director.EVENT_AFTER_UPDATE, tick);
        tick();
        return finish;
    }
}
