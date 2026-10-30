import { GameLog } from "../core/GameLog";
import { ErrorCode, GameError, logErrorCode, messageOf } from "../core/errors";
import { MockTransport } from "./MockTransport";
import { encodeRequest } from "./protocol/codec";
import { Cmd } from "./protocol/cmds";
import { HeartbeatReq } from "./protocol/types";
import { ITransport, NetHandler, NetMessage, NetState } from "./NetTypes";

export type { ITransport, NetHandler, NetMessage, NetState } from "./NetTypes";
export { MockTransport } from "./MockTransport";
export { MockGameSession } from "./MockGameSession";
export type { MockRoleState, MockSessionSeed } from "./MockGameSession";
export { parseMockFixture } from "./MockFixture";
export type { MockEnvelope, MockFixture } from "./MockFixture";
export { ReplayTransport } from "./ReplayTransport";
export { WsTransport, readObservedCmdId } from "./WsTransport";
export {
  DEFAULT_WS_URL,
  TransportConfig,
  explainWireTimeout,
  parseTransportSearch,
  readPreviewTransport,
  WS_CLOSE_STATUS,
  WS_DOWN_LOG,
  WS_DOWN_STATUS,
  WS_MOCK_STATUS,
  WS_OPEN_STATUS,
  WS_OPEN_TOAST,
} from "./transportSelect";
export type { WireTimeoutReport } from "./transportSelect";

export interface NetClientOptions {
  heartbeatMs?: number;
  reconnectDelayMs?: number;
  maxReconnect?: number;
  requestTimeoutMs?: number;
}

/**
 * 连接状态机 + 心跳 + 断线重连占位 + subscribe/emit。
 * 默认走 MockTransport（mock://local），不需要真实服。
 * ?transport=ws 时 Boot 另建一条 WsTransport，不替换这条 Mock。
 */
export class NetClient {
  static shared = new NetClient();

  state: NetState = "idle";
  url = "";

  private transport: ITransport;
  private heartbeatMs: number;
  private reconnectDelayMs: number;
  private maxReconnect: number;
  private requestTimeoutMs: number;
  private handlers = new Map<string, Set<NetHandler>>();
  private stateHandlers = new Set<(state: NetState) => void>();
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private wantConnected = false;
  private reconnectAttempt = 0;
  private heartbeatAcks = 0;

  constructor(transport?: ITransport, options?: NetClientOptions) {
    this.transport = transport ?? new MockTransport();
    this.heartbeatMs = options?.heartbeatMs ?? 5000;
    this.reconnectDelayMs = options?.reconnectDelayMs ?? 400;
    this.maxReconnect = options?.maxReconnect ?? 3;
    this.requestTimeoutMs = options?.requestTimeoutMs ?? 3000;
    this.transport.onMessage((msg) => this.dispatch(msg));
    this.transport.onClose(() => this.onTransportClosed());
  }

  async connect(url: string): Promise<void> {
    this.url = url;
    this.wantConnected = true;
    this.clearReconnect();
    this.stopHeartbeat();
    this.setState("connecting");
    GameLog.shared.info("Net", "connect " + url);
    try {
      await this.transport.connect(url);
    } catch (err) {
      logErrorCode("Net", ErrorCode.NET_CLOSED, "connect " + messageOf(err));
      if (this.reconnectAttempt <= 0) {
        this.wantConnected = false;
        this.setState("closed");
      }
      throw err;
    }
    if (!this.wantConnected) return;
    this.reconnectAttempt = 0;
    this.setState("connected");
    this.startHeartbeat();
  }

  close(): void {
    this.wantConnected = false;
    this.stopHeartbeat();
    this.clearReconnect();
    this.transport.close();
    this.setState("closed");
  }

  send(cmd: string, data?: unknown): void {
    if (this.state !== "connected") {
      logErrorCode("Net", ErrorCode.NET_NOT_CONNECTED, "drop " + cmd + " state=" + this.state);
      return;
    }
    this.transport.send(encodeRequest(cmd, data));
  }

  /** 订阅 cmd。传 "*" 接收全部。返回取消函数。同一 cmd 可多个监听。 */
  subscribe(cmd: string, handler: NetHandler): () => void {
    let set = this.handlers.get(cmd);
    if (!set) {
      set = new Set();
      this.handlers.set(cmd, set);
    }
    set.add(handler);
    return () => {
      set.delete(handler);
    };
  }

  onState(handler: (state: NetState) => void): () => void {
    this.stateHandlers.add(handler);
    return () => {
      this.stateHandlers.delete(handler);
    };
  }

  request<T = unknown>(cmd: string, data?: unknown, timeoutMs?: number): Promise<NetMessage<T>> {
    if (this.state !== "connected") {
      logErrorCode("Net", ErrorCode.NET_NOT_CONNECTED, cmd);
      return Promise.reject(new GameError(ErrorCode.NET_NOT_CONNECTED, cmd));
    }
    const wait = timeoutMs ?? this.requestTimeoutMs;
    return new Promise((resolve, reject) => {
      let off = () => {};
      const timer = setTimeout(() => {
        off();
        logErrorCode("Net", ErrorCode.NET_TIMEOUT, cmd);
        reject(new GameError(ErrorCode.NET_TIMEOUT, cmd));
      }, wait);
      this.dontBlock(timer);
      off = this.subscribe(cmd, (msg) => {
        clearTimeout(timer);
        off();
        resolve(msg as NetMessage<T>);
      });
      this.send(cmd, data);
    });
  }

  /** 已连接时模拟掉线，走重连占位。预览里主城「模拟断线」会调到这里。 */
  simulateDrop(): void {
    if (this.state !== "connected") return;
    GameLog.shared.info("Net", "simulate drop");
    this.transport.close();
  }

  private dispatch(msg: NetMessage): void {
    if (msg.cmd === Cmd.heartbeat) {
      this.heartbeatAcks += 1;
      if (this.heartbeatAcks === 1) GameLog.shared.info("Net", "heartbeat ack");
    } else {
      GameLog.shared.info("Net", "recv " + (msg.cmd || "(empty)"));
    }
    this.emitLocal(msg.cmd, msg);
    if (msg.cmd !== "*") this.emitLocal("*", msg);
  }

  private emitLocal(cmd: string, msg: NetMessage): void {
    const set = this.handlers.get(cmd);
    if (!set) return;
    for (const handler of Array.from(set)) handler(msg);
  }

  private onTransportClosed(): void {
    this.stopHeartbeat();
    if (!this.wantConnected) {
      this.setState("closed");
      return;
    }
    if (this.reconnectAttempt >= this.maxReconnect) {
      logErrorCode("Net", ErrorCode.NET_CLOSED, "reconnect gave up");
      this.wantConnected = false;
      this.setState("closed");
      return;
    }
    this.reconnectAttempt += 1;
    this.setState("reconnecting");
    const delay = this.reconnectDelayMs * this.reconnectAttempt;
    GameLog.shared.info("Net", "reconnect in " + delay + "ms attempt " + this.reconnectAttempt);
    this.clearReconnect();
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect(this.url).catch(() => {
        this.onTransportClosed();
      });
    }, delay);
    this.dontBlock(this.reconnectTimer);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pumpHeartbeat();
    this.heartbeat = setInterval(() => this.pumpHeartbeat(), this.heartbeatMs);
    this.dontBlock(this.heartbeat);
  }

  /** 连上立刻一拍，然后按间隔。WS 上这一拍是空体 1004，不等到第一个间隔。 */
  private pumpHeartbeat(): void {
    if (this.state !== "connected") return;
    const beat: HeartbeatReq = { clientTime: Date.now() };
    this.transport.send(encodeRequest(Cmd.heartbeat, beat));
  }

  private stopHeartbeat(): void {
    if (this.heartbeat) {
      clearInterval(this.heartbeat);
      this.heartbeat = null;
    }
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private setState(next: NetState): void {
    if (this.state === next) return;
    const prev = this.state;
    this.state = next;
    GameLog.shared.info("Net", prev + " -> " + next);
    for (const handler of Array.from(this.stateHandlers)) handler(next);
  }

  /** Node 测试里定时器不挡住进程退出；浏览器没有 unref。 */
  private dontBlock(timer: ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>): void {
    const maybe = timer as { unref?: () => void };
    if (typeof maybe.unref === "function") maybe.unref();
  }
}
