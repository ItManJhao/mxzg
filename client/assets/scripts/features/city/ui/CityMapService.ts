/**
 * 主城底板资源服务：按资源路径复用共享池中的图片与在途请求，供CityHubView补齐地图底板。
 * 超时只放行等待，迟到帧仍通知等待者，页面负责检查目标节点；应用退出时清空索引，实际资源由既有资源池管理。
 */
import { TrackedTimers } from "../../../framework/TrackedTimers";
import { ResourceAssetsUtils } from "../../../framework/assets/ResourceAssetsUtils";
import { Node, SpriteFrame } from "cc";
import { GateSnapshot } from "../../../config/CityNavigationUtils";
export interface CityMapQuery {
    level(): number;
    openDay(): number;
    db(): GateSnapshot | null;
}
/** 主城底板资源服务：唯一实例按路径合并请求、复用就绪帧并通知迟到等待者，应用退出时统一清空索引。 */
export class CityMapService {
    /** 当前资源服务唯一实例，统一持有节点、请求及清理状态。 */
    public static readonly instance = new CityMapService();
    /** 由唯一实例承担本模块状态，不从页面重复创建。 */
    private constructor() { }

    /** 底板资源路径到在途请求和就绪帧；同路径复用，退出由clearCitySpriteCache清空。 */
    private readonly plateLoads = new Map<string, PlateLoad>();
    /**
     * 同一路径只解码一次。超时把 await 放开（返回 null），不取消加载。
     * 图晚到时写进 record.frame，并通知 waiters。真失败才标 failed，方便再试。
     */
    public loadCitySpriteFrame(path: string): Promise<SpriteFrame | null> {
        const existing = CityMapService.instance.plateLoads.get(path);
        if (existing) {
            if (existing.frame) {
                return Promise.resolve(existing.frame);
            }
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
                if (frame) {
                    record.frame = frame;
                }
                if (failed) {
                    record.failed = true;
                }
                const pending = record.waiters.splice(0, record.waiters.length);
                for (let i = 0; i < pending.length; i++) {
                    pending[i](frame);
                }
                if (unblocked) {
                    return;
                }
                unblocked = true;
                resolve(frame);
            };
            const timer = TrackedTimers.timeout(() => {
                if (unblocked) {
                    return;
                }
                unblocked = true;
                resolve(null);
            }, CITY_PLATE_WAIT_MS);
            try {
                ResourceAssetsUtils.loadResidentSprite(path).then(asset => {
                    TrackedTimers.clear(timer);
                    give(asset, false);
                }, () => {
                    TrackedTimers.clear(timer);
                    give(null, true);
                });
            }
            catch (_err) {
                TrackedTimers.clear(timer);
                give(null, true);
            }
        });
        CityMapService.instance.plateLoads.set(path, record);
        return record.promise;
    }

    /** 真失败之后才允许再 load 一次。进行中的解码不丢掉。 */
    public dropCitySpriteLoad(path: string): void {
        const record = CityMapService.instance.plateLoads.get(path);
        if (!record || record.frame || !record.failed) {
            return;
        }
        CityMapService.instance.plateLoads.delete(path);
    }

    /**
     * 图到了就画。超时不算缺图：晚到的帧仍会画上。
     * 只有 resources 明确失败才返回 fail，调用方再试。
     */
    public paintCitySpriteWhenReady(path: string, apply: (frame: SpriteFrame) => void): Promise<"ok" | "fail"> {
        let record = CityMapService.instance.plateLoads.get(path);
        if (record && record.frame) {
            apply(record.frame);
            return Promise.resolve("ok");
        }
        if (record && record.failed) {
            return Promise.resolve("fail");
        }
        if (!record) {
            void CityMapService.instance.loadCitySpriteFrame(path);
            record = CityMapService.instance.plateLoads.get(path);
        }
        if (!record) {
            return Promise.resolve("fail");
        }
        if (record.frame) {
            apply(record.frame);
            return Promise.resolve("ok");
        }
        if (record.failed) {
            return Promise.resolve("fail");
        }
        const live = record;
        live.waiters.push((frame) => {
            if (frame) {
                apply(frame);
            }
        });
        return live.promise.then((frame) => {
            if (frame || live.frame) {
                return "ok";
            }
            if (live.failed) {
                return "fail";
            }
            return new Promise<"ok" | "fail">((resolve) => {
                live.waiters.push((late) => {
                    resolve(late || live.frame ? "ok" : "fail");
                });
            });
        });
    }

    /** 应用结束后清除旧底板索引，不在页面仍显示时调用。 */
    public clearCitySpriteCache(): void {
        CityMapService.instance.plateLoads.clear();
    }
}
/** 单张底板大约 1.2 秒还不回调就放行。调用方再试，不把整张城卡死。晚到的帧仍然贴上。 */
export const CITY_PLATE_WAIT_MS = 1200;
interface PlateLoad {
    promise: Promise<SpriteFrame | null>;
    frame: SpriteFrame | null;
    failed: boolean;
    waiters: Array<(frame: SpriteFrame | null) => void>;
}
