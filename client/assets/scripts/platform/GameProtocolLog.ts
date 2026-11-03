/**
 * 服务端收包展示：默认隐藏心跳，用中文标题、字段说明和分行数据展示玩法回包。
 * 仅在开发预览启用，隐藏凭证并有界；JSON 只用于人读，线上仍是 Protobuf 二进制。
 */
import type { GameFrame } from "./GameProtocolCodec";
import { Protocol, findProtocol } from "./Protocol";

/** 日志显示选项，默认保持简洁。 */
export interface ServerLogOptions {
    /** 排查连接保活时显式打开；默认不让心跳刷掉玩法数据。 */
    readonly includeHeartbeat?: boolean;
    /** 排查请求关联时打开 id/connectionId；默认不显示这些噪声。 */
    readonly includeEnvelope?: boolean;
}
/** 递归拷贝可读数据并隐藏凭证，长数组/文本显式标记截断，绝不修改真实回包。 */
function readable(value: unknown, depth = 0): unknown {
    if (depth > 6) return "[层级已截断]";
    if (typeof value === "string") return value.length > 512 ? value.slice(0, 512) + "[已截断]" : value;
    if (Array.isArray(value)) {
        const rows = value.slice(0, 100).map(item => readable(item, depth + 1));
        if (value.length > 100) rows.push("[其余 " + (value.length - 100) + " 项已截断]");
        return rows;
    }
    if (value && typeof value === "object") {
        const result: Record<string, unknown> = Object.create(null);
        for (const [key, item] of Object.entries(value)) result[key] =
            /token|password|authorization|secret|credential/i.test(key) ? "[已隐藏]" : readable(item, depth + 1);
        return result;
    }
    return value;
}
/** 返回中文分行日志；心跳默认返回空字符串，调用方不能把空结果写入日志缓冲。 */
export function formatServerFrame(frame: Readonly<GameFrame>, options: ServerLogOptions = {}): string {
    if (frame.name === Protocol.SESSION_HEARTBEAT && !options.includeHeartbeat) return "";
    const definition = findProtocol(frame.name);
    const lines = ["服务端 → 客户端｜" + (definition?.module || "未知模块") + "｜" + frame.name
        + "｜" + (definition?.description || "") + (frame.kind === "response" ? (frame.ok ? "｜成功" : "｜失败") : "｜通知")];
    if (options.includeEnvelope) lines.push("请求标识：" + (frame.id || "-") + "；连接标识：" + (frame.connectionId || "-"));
    const data=frame.body as Record<string,unknown>|undefined;
    const state=(frame.kind==="event"?data:data?.initial) as Record<string,unknown>|undefined;
    if (state && Array.isArray(state.inventory)) {
        lines.push("物品种类数：" + state.inventory.length + "（不是背包格子数，也不是单个物品数量）");
        lines.push("结构：Snapshot { revision, role, inventory: Item[] }；Item { itemId, quantity }");
        lines.push("itemId = 策划物品 ID；quantity = 该物品当前持有数量（绝对值，不是新增数量）");
        lines.push("实际数据（Protobuf 解码后）：", JSON.stringify(readable(state), null, 2));
    } else {
        lines.push("实际数据（Protobuf 解码后）：", JSON.stringify(readable(frame.ok === false ? frame.error : frame.body), null, 2));
    }
    const text = lines.join("\n");
    return text.length > 8192 ? text.slice(0, 8192) + "\n[日志已截断]" : text;
}
