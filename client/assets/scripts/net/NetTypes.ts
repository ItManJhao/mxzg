export type NetState = "idle" | "connecting" | "connected" | "reconnecting" | "closed";

export interface NetMessage<T = unknown> {
  cmd: string;
  data?: T;
}

export type NetHandler = (msg: NetMessage) => void;

/** 传输层。Mock / 回放不建真 socket。WsTransport 才打开浏览器 WebSocket。 */
export interface ITransport {
  connect(url: string): Promise<void>;
  send(msg: NetMessage): void;
  close(): void;
  onMessage(handler: NetHandler): void;
  onClose(handler: () => void): void;
}
