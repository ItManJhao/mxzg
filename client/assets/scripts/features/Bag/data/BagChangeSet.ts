import type { BagItemData } from "./BagItemData";

/** Identity is the current protocol's role-local inventory itemId, not a hero/equipment instance ID. */
export interface BagQuantityChange {
    readonly itemId: BagItemData["itemId"];
    readonly oldQuantity: number;
    readonly newQuantity: number;
    readonly delta: number;
}

/** Produced by Model only after validation and one complete state commit. */
export interface BagChangeSet {
    readonly roleKey: string | null;
    readonly revision: number;
    readonly initialSync: boolean;
    readonly added: readonly BagItemData[];
    readonly quantityChanged: readonly BagQuantityChange[];
    readonly removed: readonly BagItemData[];
}
