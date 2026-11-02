/** 背包查询适配：只获取并校验完整库存，状态和读写协调仍归 BagController。 */
import { JsonClient } from "../../platform/http/JsonClient";
import type { GameSocketClient } from "../../platform/GameSocketClient";
import { readBagItems } from "./data/BagItemData";
import type { BagItemData } from "./data/BagItemData";

/** Handwritten inventory gateway. No state, event delivery or Model ownership. */
export class BagApi {
    /** 应用显式选择试点传输，不在请求失败后暗中回退另一条通道。 */
    constructor(private readonly http: JsonClient, private readonly socket?: GameSocketClient) {}

    /** 获取当前角色库存；仅查询，模块负责会话代次、旧读失效和写后刷新。 */
    async list(token: string): Promise<readonly BagItemData[]> {
        if (this.socket) return readBagItems(await this.socket.request(token, "inventory.list"));
        return readBagItems(await this.http.request("/api/v1/inventory", undefined, token));
    }
}
