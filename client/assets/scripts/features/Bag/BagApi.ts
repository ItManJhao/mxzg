import { JsonClient } from "../../platform/http/JsonClient";
import { readBagItems } from "./data/BagItemData";
import type { BagItemData } from "./data/BagItemData";

/** Handwritten inventory gateway. No state, event delivery or Model ownership. */
export class BagApi {
    constructor(private readonly http: JsonClient) {}

    async list(token: string): Promise<readonly BagItemData[]> {
        return readBagItems(await this.http.request("/api/v1/inventory", undefined, token));
    }
}
