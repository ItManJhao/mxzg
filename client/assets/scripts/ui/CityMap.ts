/**
 * 主城地图的贴图和建筑摆放工具。运行时主城只走 CityHub 预制。
 * 这里不再手搓 CityMap。缺预制由调用方打日志。
 * 配置里的活动图标不再铺成通栏。右上活动在 CityChrome 的 ActGroup。
 */
import { Color, Node, Sprite, SpriteFrame, resources } from "cc";
import { GateSnapshot } from "../config/nav";
import { ConfigLoader } from "../config/ConfigLoader";
import { GameLog } from "../core/GameLog";

export interface CityMapQuery {
  level(): number;
  openDay(): number;
  db(): GateSnapshot | null;
}

export interface CityMapHandle {
  root: Node;
  refreshLocks(): void;
  dispose(): void;
}

const OPEN_COLOR = new Color(255, 255, 255, 255);

export async function mountCityMap(
  _parent: Node,
  _onAtom: (atom: string) => void,
  _query: CityMapQuery
): Promise<CityMapHandle> {
  GameLog.shared.warn("CityMap", "预制主城未挂上，不手搓一整城");
  throw new Error("city map prefab missing");
}

function paintSprite(node: Node, frame: SpriteFrame): Sprite {
  const sprite = node.getComponent(Sprite) || node.addComponent(Sprite);
  sprite.sizeMode = Sprite.SizeMode.CUSTOM;
  sprite.spriteFrame = frame;
  sprite.grayscale = false;
  sprite.color = OPEN_COLOR;
  return sprite;
}

/** 单张底板大约 1.2 秒还不回调就放行。调用方再试，不把整张城卡死。晚到的帧仍然贴上。 */
export const CITY_PLATE_WAIT_MS = 1200;

const cityPlateMisses = new Set<string>();

interface PlateLoad {
  promise: Promise<SpriteFrame | null>;
  frame: SpriteFrame | null;
  failed: boolean;
  waiters: Array<(frame: SpriteFrame | null) => void>;
}

const plateLoads = new Map<string, PlateLoad>();

/**
 * 同一路径只解码一次。超时把 await 放开（返回 null），不取消加载。
 * 图晚到时写进 record.frame，并通知 waiters。真失败才标 failed，方便再试。
 */
export function loadCitySpriteFrame(path: string): Promise<SpriteFrame | null> {
  const existing = plateLoads.get(path);
  if (existing) {
    if (existing.frame) return Promise.resolve(existing.frame);
    return existing.promise;
  }
  const record: PlateLoad = {
    promise: Promise.resolve(null),
    frame: null,
    failed: false,
    waiters: [],
  };
  record.promise = new Promise((resolve) => {
    let unblocked = false;
    const give = (frame: SpriteFrame | null, failed: boolean) => {
      if (frame) record.frame = frame;
      if (failed) record.failed = true;
      const pending = record.waiters.splice(0, record.waiters.length);
      for (let i = 0; i < pending.length; i++) pending[i](frame);
      if (unblocked) return;
      unblocked = true;
      resolve(frame);
    };
    const timer = setTimeout(() => {
      if (unblocked) return;
      unblocked = true;
      resolve(null);
    }, CITY_PLATE_WAIT_MS);
    try {
      resources.load(path + "/spriteFrame", SpriteFrame, (err, asset) => {
        clearTimeout(timer);
        if (err || !asset) give(null, true);
        else give(asset, false);
      });
    } catch (_err) {
      clearTimeout(timer);
      give(null, true);
    }
  });
  plateLoads.set(path, record);
  return record.promise;
}

/** 真失败之后才允许再 load 一次。进行中的解码不丢掉。 */
export function dropCitySpriteLoad(path: string): void {
  const record = plateLoads.get(path);
  if (!record || record.frame || !record.failed) return;
  plateLoads.delete(path);
}

/**
 * 图到了就画。超时不算缺图：晚到的帧仍会画上。
 * 只有 resources 明确失败才返回 fail，调用方再试。
 */
export function paintCitySpriteWhenReady(path: string, apply: (frame: SpriteFrame) => void): Promise<"ok" | "fail"> {
  let record = plateLoads.get(path);
  if (record && record.frame) {
    apply(record.frame);
    return Promise.resolve("ok");
  }
  if (record && record.failed) return Promise.resolve("fail");
  if (!record) {
    void loadCitySpriteFrame(path);
    record = plateLoads.get(path);
  }
  if (!record) return Promise.resolve("fail");
  if (record.frame) {
    apply(record.frame);
    return Promise.resolve("ok");
  }
  if (record.failed) return Promise.resolve("fail");
  const live = record;
  live.waiters.push((frame) => {
    if (frame) apply(frame);
  });
  return live.promise.then((frame) => {
    if (frame || live.frame) return "ok";
    if (live.failed) return "fail";
    return new Promise<"ok" | "fail">((resolve) => {
      live.waiters.push((late) => {
        resolve(late || live.frame ? "ok" : "fail");
      });
    });
  });
}

function paintCityFrames(jobs: { node: Node; path: string }[]): void {
  for (let i = 0; i < jobs.length; i++) paintCityFrame(jobs[i].node, jobs[i].path, 3);
}

function paintCityFrame(node: Node, path: string, left: number): void {
  void paintCitySpriteWhenReady(path, (frame) => {
    if (!node.isValid) return;
    paintSprite(node, frame);
  }).then((status) => {
    if (!node.isValid || status === "ok") return;
    if (left > 1) {
      dropCitySpriteLoad(path);
      paintCityFrame(node, path, left - 1);
      return;
    }
    if (cityPlateMisses.has(path)) return;
    cityPlateMisses.add(path);
    GameLog.shared.warn("CityMap", "plate miss " + path);
  });
}

async function loadCfg<T>(path: string): Promise<T | null> {
  try {
    return await ConfigLoader.loadJson<T>(path);
  } catch (err) {
    GameLog.shared.error("CityMap", path + " " + (err instanceof Error ? err.message : "load failed"));
    return null;
  }
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
