/**
 * 战报回放的拍子。跟导演的帧走，不单靠 setTimeout。
 * 预览里若导演不发 AFTER_UPDATE，或 director.on 抛错，改走 requestAnimationFrame。
 * 到点的 setTimeout 仍会推进。导演已经订上时不再叠一帧动画，避免一拍算两次。
 * 跳过和撤退调用返回的取消函数。
 */
import { director, Director } from "cc";

export function armBattleDelay(ms: number, fn: () => void): () => void {
  let done = false;
  const stops: Array<() => void> = [];
  const finish = (): void => {
    if (done) return;
    done = true;
    for (let i = 0; i < stops.length; i++) stops[i]();
    fn();
  };
  let elapsed = 0;
  let last = Date.now();
  const tick = (): void => {
    const now = Date.now();
    let step = now - last;
    last = now;
    if (step < 0) step = 0;
    if (step > 100) step = 100;
    elapsed += step;
    if (elapsed >= ms) finish();
  };
  let armed = false;
  const eventName = Director && Director.EVENT_AFTER_UPDATE;
  if (eventName && director && typeof director.on === "function") {
    try {
      director.on(eventName, tick);
      armed = true;
      stops.push(() => {
        if (typeof director.off === "function") director.off(eventName, tick);
      });
    } catch (err) {
      armed = false;
    }
  }
  if (!armed && typeof requestAnimationFrame === "function") {
    let raf = 0;
    const frame = (): void => {
      if (done) return;
      tick();
      if (!done) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    stops.push(() => {
      if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(raf);
    });
  }
  const wait = ms < 0 ? 0 : ms;
  const timer = setTimeout(finish, wait);
  const maybe = timer as { unref?: () => void };
  if (typeof maybe.unref === "function") maybe.unref();
  stops.push(() => clearTimeout(timer));
  return () => {
    if (done) return;
    done = true;
    for (let i = 0; i < stops.length; i++) stops[i]();
  };
}
