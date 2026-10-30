import { BagEvent } from "../BagEvent";
import type { BagChangeSet } from "./BagChangeSet";
import type { BagState } from "./BagState";

export type BagChangeReason = "initial-sync" | "query" | "reward" | "consume" | "session-reset" | "unknown";
export interface BagUpdateData extends BagChangeSet { readonly reason: BagChangeReason; }
export type BagAddData = Pick<BagUpdateData, "roleKey" | "revision" | "reason" | "added">;
export type BagRemoveData = Pick<BagUpdateData, "roleKey" | "revision" | "reason" | "removed">;
export type BagQuantityChangedData = Pick<BagUpdateData, "roleKey" | "revision" | "reason" | "quantityChanged">;
export type BagSyncStateChangedData = Pick<BagState, "roleKey" | "revision" | "status" | "synced" | "error">;

declare module "../../../framework/EventDispatcher" {
    interface EventPayloads {
        [BagEvent.BagUpdate]: Readonly<BagUpdateData>;
        [BagEvent.BagAdd]: Readonly<BagAddData>;
        [BagEvent.BagRemove]: Readonly<BagRemoveData>;
        [BagEvent.BagQuantityChanged]: Readonly<BagQuantityChangedData>;
        [BagEvent.BagSyncStateChanged]: Readonly<BagSyncStateChangedData>;
    }
}
