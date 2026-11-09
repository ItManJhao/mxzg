/**
 * Protobuf 信封边界：使用生成的静态代码转换二进制与已约定的消息对象。
 * 不保存会话/资产；解码只返回数据，业务合法性与会话时效仍由传输/API/Controller 校验。
 */
import { Protocol } from "./Protocol";
import { mxzg } from "./GameProtocol.generated";

/** 两端共同声明的 WebSocket 子协议；握手阶段拒绝误连旧 JSON 服务。 */
export const GAME_SOCKET_PROTOCOL = "mxzg.protobuf.v2";
/** 单个完整消息的最大字节数，解码前检查，防止无界输入。 */
export const GAME_FRAME_LIMIT = 262144;
/** 内部可读信封；body 保持模块原有 DTO，网络上传输的是明确的 Protobuf 消息。 */
export interface GameFrame {
  /** 当前信封版本，与握手子协议共同约束兼容范围。 */
  version: number;
  /** 消息方向：request / response / event。 */
  kind: string;
  /** 明确的业务消息名；必须与 oneof 载荷对应。 */
  name: string;
  /** 单次网络往返关联标识，不是业务幂等键。 */
  id?: string;
  /** 服务端分配的连接标识，用于拒绝旧连接消息。 */
  connectionId?: string;
  /** 响应是否成功；缺失与 false 不能混淆。 */
  ok?: boolean;
  /** 模块读取的 DTO，由强类型 Protobuf 载荷投影，不是网络 JSON。 */
  body?: unknown;
  /** 失败响应的稳定原因与重试信息，不与成功载荷共存。 */
  error?: unknown;
}
interface GeneratedType {
  /** 生成器字段类型检查，业务范围校验由手写入口补充。 */
  verify(value: object): string | null;
  /** 将已校验的消息编码为有效字节段。 */
  encode(value: object): { finish(): Uint8Array };
  /** 解析字节并检查 proto2 必填字段。 */
  decode(value: Uint8Array): unknown;
  /** 转换为 DTO 投影所需的普通对象。 */
  toObject(value: unknown, options: object): Record<string, unknown>;
}
/** 唯一生成代码调用口，避免在业务模块散落生成器类型转换。 */
const Frame = (mxzg as unknown as { game: { Frame: GeneratedType } }).game.Frame;
/** oneof 的所有有效载荷字段，用于检查消息名与载荷类型必须对应。 */
const payloads = ["authenticate", "accepted", "snapshot", "inventory", "heartbeat", "kicked", "empty", "login", "servers", "gmGrant", "gmResult", "gmStatus", "formationSave", "formationSaved", "battlePreview", "battlePreviewed", "chapterChallenge", "chapterBattleId", "chapterReceipt", "chapterReplay", "idleEncounter"];

/** 按消息方向和名称选择强类型载荷，不允许以 JSON 字符串或任意 bytes 代替业务定义。 */
function payloadName(frame: GameFrame): string | null {
  if (frame.kind === "response" && frame.ok === false) return null;
  if (frame.kind === "request" && frame.name === Protocol.CHAPTER_CHALLENGE) return "chapterChallenge";
  if (frame.kind === "request" && (frame.name === Protocol.CHAPTER_CLAIM || frame.name === Protocol.CHAPTER_REPLAY)) return "chapterBattleId";
  if (frame.kind === "request" && frame.name === Protocol.BATTLE_PREVIEW) return "battlePreview";
  if (frame.kind === "request" && frame.name === Protocol.FORMATION_SAVE) return "formationSave";
  if (frame.kind === "request" && frame.name === Protocol.GM_GRANT) return "gmGrant";
  if (frame.kind === "request") return frame.name === Protocol.SESSION_AUTHENTICATE ? "authenticate" : frame.name === Protocol.SESSION_LOGIN ? "login" : "empty";
  if (frame.kind === "event" && frame.name === Protocol.STATE_CHANGED) return "snapshot";
  if (frame.kind === "event" && frame.name === Protocol.SESSION_KICKED) return "kicked";
  if (frame.kind === "response") {
    switch (frame.name) {
      case Protocol.SESSION_LOGIN:
      case Protocol.SESSION_AUTHENTICATE: return "accepted";
      case Protocol.CHAPTER_CHALLENGE:
      case Protocol.CHAPTER_CLAIM: return "chapterReceipt";
      case Protocol.CHAPTER_REPLAY: return "chapterReplay";
      case Protocol.CHAPTER_IDLE_ENCOUNTER: return "idleEncounter";
      case Protocol.BATTLE_PREVIEW: return "battlePreviewed";
      case Protocol.FORMATION_SAVE: return "formationSaved";
      case Protocol.GM_GRANT: return "gmResult";
      case Protocol.GM_STATUS: return "gmStatus";
      case Protocol.SERVERS_LIST: return "servers";
      case Protocol.SESSION_HEARTBEAT: return "heartbeat";
    }
  }
  throw new Error("不支持的消息载荷");
}

/** 拒绝超出 JS 安全范围的整数；int64 解码为 number 后也必须通过此检查，不能静默舍入资产。 */
function validateIntegers(value: unknown): void {
  if (typeof value === "number" && !Number.isSafeInteger(value)) throw new Error("协议整数超出安全范围");
  if (value && typeof value === "object") for (const item of Object.values(value)) validateIntegers(item);
}

/** 编码完整帧并限制大小；返回独立 ArrayBuffer，微信小游戏可直接发送，不使用 Base64 包装。 */
export function encodeGameFrame(frame: GameFrame): ArrayBuffer {
  validateIntegers(frame);
  const { body, ...envelope } = frame;
  const payload = payloadName(frame);
  const message: Record<string, unknown> = { ...envelope };
  if (payload) message[payload] = payload === "inventory" ? { items: body } : body;
  const error = Frame.verify(message);
  if (error) throw new Error("协议编码字段无效");
  const bytes = Frame.encode(message).finish();
  if (bytes.length > GAME_FRAME_LIMIT) throw new Error("协议帧超限");
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return copy.buffer;
}

/** 只解码二进制帧；拒绝文本、截断数据、缺失必填字段和消息名/oneof 载荷不匹配。 */
export function decodeGameFrame(raw: unknown): GameFrame {
  const bytes = raw instanceof ArrayBuffer ? new Uint8Array(raw)
    : raw instanceof Uint8Array ? raw : null;
  if (!bytes || !bytes.length || bytes.byteLength > GAME_FRAME_LIMIT) throw new Error("协议帧无效");
  const value = Frame.toObject(Frame.decode(bytes), { longs: Number, arrays: true });
  validateIntegers(value);
  const frame = value as unknown as GameFrame;
  const expected = payloadName(frame);
  const present = payloads.filter(key => Object.prototype.hasOwnProperty.call(value, key));
  if (present.length !== (expected ? 1 : 0) || (expected && present[0] !== expected)) throw new Error("协议载荷不匹配");
  if (expected) {
    const body = value[expected];
    frame.body = expected === "inventory" ? (body as { items: unknown }).items : body;
  } else frame.body = null;
  for (const key of payloads) delete value[key];
  return frame;
}
