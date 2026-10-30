import { director, Director, Node, view } from "cc";
import { barSlideDir, expoOut } from "../../ui/barSlide";
export type PageTransition = (outgoing: Node | null, incoming: Node, from: string, to: string, done: () => void) => () => void;
const pageIndex: Record<string, number> = { "remake-home": 0, hero: 1, bag: 2, mainline: 3, "remake-campaign": 3 };
export const PAGE_TRANSITION_MS = 280;
/** Slide only content. Shared top/bottom chrome stays in the home root. */
export const slideFeaturePage: PageTransition = (outgoing, incoming, from, to, done) => {
    const direction = barSlideDir(pageIndex[from] ?? -1, pageIndex[to] ?? -1);
    if (!direction || !outgoing?.isValid || !incoming.isValid) {
        done();
        return () => { };
    }
    const width = view.getVisibleSize().width;
    const start = Date.now();
    const before = { x: outgoing.position.x, y: outgoing.position.y, z: outgoing.position.z };
    const after = { x: incoming.position.x, y: incoming.position.y, z: incoming.position.z };
    type Moving = Node & {
        mxzgPageAnimating?: boolean;
    };
    (outgoing as Moving).mxzgPageAnimating = true;
    (incoming as Moving).mxzgPageAnimating = true;
    outgoing.active = true;
    incoming.active = true;
    let finished = false;
    const finish = () => {
        if (finished)
            return;
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
    const tick = () => {
        if (!outgoing.isValid || !incoming.isValid) {
            finish();
            return;
        }
        const t = Math.min(1, Math.max(0, (Date.now() - start) / PAGE_TRANSITION_MS));
        const progress = expoOut(t);
        outgoing.setPosition(before.x - direction * width * progress, before.y, before.z);
        incoming.setPosition(after.x + direction * width * (1 - progress), after.y, after.z);
        if (t >= 1)
            finish();
    };
    director.on(Director.EVENT_AFTER_UPDATE, tick);
    tick();
    return finish;
};
