import { NetMessage } from "../NetTypes";

/**
 * 编解码缝。现在请求和回包都是明文对象，MockTransport 直接读。
 * 换成真 Protobuf 时只改本文件：encode 出字节，decode 回与 types.ts 相同的字段。
 * Proto.* 与 Boot 不要自己序列化。
 * 真服二进制帧在 frame.ts，由 WsTransport 在发送前另编。这里仍给 Mock 用。
 */
export function encodeRequest(cmd: string, data?: unknown): NetMessage {
  return { cmd, data };
}

export function decodeResponse<T>(msg: NetMessage): T {
  if (msg.data === undefined || msg.data === null) return {} as T;
  return msg.data as T;
}
