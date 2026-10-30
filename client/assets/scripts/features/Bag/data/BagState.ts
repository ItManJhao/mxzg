import type { BagItemData } from "./BagItemData";

export type BagStatus = "idle" | "loading" | "ready" | "error";

export interface BagState {
    readonly roleKey: string | null;
    readonly revision: number;
    readonly status: BagStatus;
    readonly synced: boolean;
    readonly items: readonly BagItemData[];
    readonly error: string;
}
