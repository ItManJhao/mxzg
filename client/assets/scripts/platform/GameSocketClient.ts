/**
 * 登录与背包试点的会话传输：鉴权、恢复同步、心跳、退避重连和请求关联。
 * 应用持有此实例；不保存玩家资产，不自动重放业务请求，旧连接回包由连接代次隔离。
 */
export type SocketPort = Pick<WebSocket, "onopen" | "onmessage" | "onerror" | "onclose" | "send" | "close" | "readyState">;
export class SocketFailure extends Error {
  /** 保存稳定原因；身份失败由账号层清理，网络中断不伪装成业务拒绝。 */
  constructor(readonly code: string, message = "网络连接中断，请稍后重试") { super(message); this.name = "SocketFailure"; }
  /** 判断是否必须回到登录页面，禁止自动抢回被替换的会话。 */
  get unauthorized(): boolean { return this.code === "UNAUTHENTICATED" || this.code === "SESSION_REPLACED"; }
}
interface Pending {
  name: string;
  resolve(value: unknown): void;
  reject(error: Error): void;
  timer: ReturnType<typeof setTimeout>;
}
export interface SocketOptions {
  create(url: string): SocketPort;
  validateSnapshot(value: unknown): void;
  timeoutMs?: number;
  heartbeatMs?: number;
  retryDelay?: (attempt: number) => number;
}

/** 仅使用原生 WebSocket 能力；平台适配器由应用注入，测试可注入受控连接。 */
export class GameSocketClient {
  onReady: (() => void) | null = null;
  onDisconnected: ((message: string) => void) | null = null;
  onRejected: ((token: string, message: string) => void) | null = null;
  private socket: SocketPort | null = null;
  private token = "";
  private connectionId = "";
  private roleId = "";
  private generation = 0;
  private ready = false;
  private blocked: SocketFailure | null = null;
  private maintain = false;
  private retries = 0;
  private connecting: Promise<void> | null = null;
  private rejectOpen: ((error: Error) => void) | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly pending = new Map<string, Pending>();
  private readonly instanceId = this.identifier();

  /** 验证地址，禁止令牌出现在 URL；明文连接仅允许回环开发地址。 */
  constructor(private readonly url: string, private readonly options: SocketOptions) {
    if (!/^wss:\/\/[^\s?#@]+$/.test(url) && !/^ws:\/\/(?:127\.0\.0\.1|localhost):\d+\/[^\s?#@]+$/.test(url)) {
      throw new Error("长连接地址无效");
    }
  }

  /** 登录/恢复时等待鉴权及快照校验；相同会话共享连接任务，不回退 HTTP。 */
  connect(token: string): Promise<void> {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return Promise.reject(new SocketFailure("UNAUTHENTICATED", "登录凭证无效"));
    if (token !== this.token) { this.disconnect(); this.token = token; }
    if (this.ready) return Promise.resolve();
    if (this.connecting) return this.connecting;
    this.blocked = null;
    if (this.retryTimer !== null) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    const generation = ++this.generation;
    const task = this.establish(token, generation);
    this.connecting = task;
    void task.then(() => { if (this.connecting === task) this.connecting = null; }, () => { if (this.connecting === task) this.connecting = null; });
    return task;
  }

  /** 业务入口只检查当前会话就绪，不在断线期间排队扣费请求。 */
  assertReady(token: string): void {
    if (token === this.token && this.blocked) throw this.blocked;
    if (token !== this.token || !this.ready || this.socket?.readyState !== 1) throw new SocketFailure("NOT_READY", "网络正在恢复，请稍后重试");
  }

  /** 首批只允许恢复、背包和心跳读取；绝不接收任意写请求或自动重放。 */
  async request(token: string, name: "session.sync" | "inventory.list" | "session.heartbeat"): Promise<unknown> {
    this.assertReady(token);
    const generation = this.generation;
    const value = await this.send(name, {});
    if (generation !== this.generation) throw new SocketFailure("SESSION_CHANGED");
    if (name === "session.sync") {
      try {
        this.options.validateSnapshot(value);
        if (this.object(this.object(value).role).id !== this.roleId) throw new SocketFailure("INVALID_MESSAGE");
      } catch {
        const error = new SocketFailure("INVALID_MESSAGE"); this.drop(error, false); throw error;
      }
    }
    return value;
  }

  /** 登出、换号或应用销毁时取消全部任务；迟到回包无法复活旧会话。 */
  disconnect(): void {
    this.maintain = false;
    this.token = "";
    this.roleId = "";
    this.retries = 0;
    this.blocked = null;
    this.drop(new SocketFailure("SESSION_CHANGED", "会话已切换"), false);
  }

  /** 打开传输后先鉴权，再校验一致快照；此阶段不向任何 Model 写数据。 */
  private async establish(token: string, generation: number): Promise<void> {
    try {
      const socket = this.options.create(this.url);
      this.socket = socket;
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => this.drop(new SocketFailure("TIMEOUT"), this.maintain), this.options.timeoutMs || 15000);
        this.rejectOpen = error => { clearTimeout(timer); reject(error); };
        socket.onopen = () => {
          if (generation !== this.generation) return;
          clearTimeout(timer); this.rejectOpen = null; resolve();
        };
        socket.onmessage = event => { if (generation === this.generation) this.receive(event.data); };
        socket.onerror = socket.onclose = () => {
          if (generation === this.generation) this.drop(new SocketFailure("DISCONNECTED"), this.maintain);
        };
      });
      const accepted = this.object(await this.send("session.authenticate", { accessToken: token, clientInstanceId: this.instanceId }));
      if (generation !== this.generation) throw new SocketFailure("SESSION_CHANGED");
      if (typeof accepted.connectionId !== "string" || !accepted.connectionId || accepted.connectionId.length > 128
          || typeof accepted.roleId !== "string" || !accepted.roleId || accepted.roleId.length > 128
          || !Number.isSafeInteger(accepted.serverTimeMs) || Number(accepted.serverTimeMs) <= 0) throw new SocketFailure("INVALID_MESSAGE");
      this.connectionId = accepted.connectionId;
      if (this.roleId && this.roleId !== accepted.roleId) throw new SocketFailure("INVALID_MESSAGE");
      this.roleId = accepted.roleId;
      const snapshot = await this.send("session.sync", {});
      if (generation !== this.generation) throw new SocketFailure("SESSION_CHANGED");
      this.options.validateSnapshot(snapshot);
      if (this.object(this.object(snapshot).role).id !== this.roleId) throw new SocketFailure("INVALID_MESSAGE");
      this.ready = true; this.maintain = true; this.retries = 0;
      this.scheduleHeartbeat();
      this.onReady?.();
    } catch (error) {
      const failure = error instanceof SocketFailure ? error : new SocketFailure("INVALID_MESSAGE", "连接或会话数据无效");
      if (generation === this.generation) {
        if (failure.unauthorized) this.rejectSession(failure);
        else this.drop(failure, this.maintain && failure.code !== "INVALID_MESSAGE");
      }
      throw failure;
    }
  }

  /** 有界请求表保存一次网络往返；超时结束连接，所有未决读取由模块决定是否重新查询。 */
  private send(name: string, body: unknown): Promise<unknown> {
    if (!this.socket || this.socket.readyState !== 1) return Promise.reject(new SocketFailure("DISCONNECTED"));
    if (this.pending.size >= 16) return Promise.reject(new SocketFailure("BUSY", "请求较多，请稍后重试"));
    const id = this.identifier();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.drop(new SocketFailure("TIMEOUT"), this.maintain), this.options.timeoutMs || 15000);
      this.pending.set(id, { name, resolve, reject, timer });
      try {
        this.socket!.send(JSON.stringify({ version: 1, kind: "request", name, id, body,
          ...(this.connectionId ? { connectionId: this.connectionId } : {}) }));
      } catch { this.drop(new SocketFailure("DISCONNECTED"), this.maintain); }
    });
  }

  /** 严格关联请求和连接标识；重复回包无副作用，顶号立即阻止自动重连。 */
  private receive(raw: unknown): void {
    try {
      if (typeof raw !== "string" || raw.length > 65536 || this.byteLength(raw) > 65536) throw new SocketFailure("INVALID_MESSAGE");
      const frame = this.object(JSON.parse(raw));
      if (frame.version !== 1 || typeof frame.name !== "string") throw new SocketFailure("INVALID_MESSAGE");
      if (this.connectionId && frame.connectionId !== this.connectionId) throw new SocketFailure("INVALID_MESSAGE");
      if (frame.kind === "event" && frame.name === "session.kicked" && this.connectionId) {
        this.rejectSession(new SocketFailure("SESSION_REPLACED", "账号已在其他连接登录，请重新登录")); return;
      }
      if (frame.kind !== "response" || typeof frame.id !== "string" || typeof frame.ok !== "boolean") throw new SocketFailure("INVALID_MESSAGE");
      const pending = this.pending.get(frame.id);
      if (!pending) return;
      if (pending.name !== frame.name) throw new SocketFailure("INVALID_MESSAGE");
      if (frame.ok) {
        if (!("body" in frame) || frame.error !== undefined) throw new SocketFailure("INVALID_MESSAGE");
        if (pending.name === "session.authenticate" && this.object(frame.body).connectionId !== frame.connectionId) throw new SocketFailure("INVALID_MESSAGE");
        this.pending.delete(frame.id); clearTimeout(pending.timer); pending.resolve(frame.body);
      } else {
        const error = this.object(frame.error);
        if (typeof error.code !== "string" || !/^[A-Z_]{3,64}$/.test(error.code) || frame.body !== null) throw new SocketFailure("INVALID_MESSAGE");
        const failure = new SocketFailure(error.code, error.code === "UNAUTHENTICATED" ? "登录已失效，请重新登录" : "连接请求失败，请重试");
        this.pending.delete(frame.id); clearTimeout(pending.timer); pending.reject(failure);
        if (failure.unauthorized) this.rejectSession(failure);
      }
    } catch (error) { this.drop(error instanceof SocketFailure ? error : new SocketFailure("INVALID_MESSAGE"), false); }
  }

  /** 仅当前凭证失效时通知账号层；先停止重连，避免回登录后后台抢占会话。 */
  private rejectSession(error: SocketFailure): void {
    const token = this.token;
    this.maintain = false;
    this.drop(error, false);
    this.onRejected?.(token, error.message);
  }

  /** 清理连接、定时器及待响应请求；旧事件先解绑再关闭，重试只重建鉴权/同步。 */
  private drop(error: Error, retry: boolean): void {
    this.generation++;
    const wasReady = this.ready;
    this.ready = false; this.connectionId = ""; this.connecting = null;
    if (!retry && error instanceof SocketFailure && error.code === "INVALID_MESSAGE") {
      this.blocked = new SocketFailure("INVALID_MESSAGE", "连接数据异常，请返回登录后重试");
    }
    if (this.retryTimer !== null) clearTimeout(this.retryTimer);
    if (this.heartbeatTimer !== null) clearTimeout(this.heartbeatTimer);
    this.retryTimer = this.heartbeatTimer = null;
    const socket = this.socket; this.socket = null;
    if (socket) { socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null; try { socket.close(); } catch { /* 通道已失效。 */ } }
    const rejectOpen = this.rejectOpen; this.rejectOpen = null; rejectOpen?.(error);
    for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(error); }
    this.pending.clear();
    if (retry && this.token) {
      const token = this.token;
      const attempt = this.retries++;
      const delay = this.options.retryDelay?.(attempt) ?? Math.min(15000, 1000 * Math.pow(2, attempt) * (0.8 + Math.random() * 0.4));
      this.retryTimer = setTimeout(() => { this.retryTimer = null; if (this.token === token) void this.connect(token).catch(() => {}); }, delay);
    }
    if (wasReady) this.onDisconnected?.(retry ? "网络已断开，正在重新连接…" : this.blocked?.message || error.message);
  }

  /** 心跳串行等待回应，失败由统一连接清理处理，不产生重复定时器。 */
  private scheduleHeartbeat(): void {
    this.heartbeatTimer = setTimeout(async () => {
      this.heartbeatTimer = null;
      const generation = this.generation;
      try {
        const value = this.object(await this.send("session.heartbeat", {}));
        if (!Number.isSafeInteger(value.serverTimeMs) || Number(value.serverTimeMs) <= 0) throw new SocketFailure("INVALID_MESSAGE");
        if (generation === this.generation && this.ready) this.scheduleHeartbeat();
      } catch (error) {
        if (generation === this.generation) {
          if (error instanceof SocketFailure && error.code === "BUSY" && this.ready) this.scheduleHeartbeat();
          else this.drop(error instanceof Error ? error : new SocketFailure("DISCONNECTED"), false);
        }
      }
    }, this.options.heartbeatMs || 20000);
  }

  /** 只接受 JSON 对象，不让数组/null 被当作合法消息或快照。 */
  private object(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new SocketFailure("INVALID_MESSAGE");
    return value as Record<string, unknown>;
  }

  /** 计算 UTF-8 大小，避免依赖部分原生平台缺少的 TextEncoder。 */
  private byteLength(value: string): number {
    let bytes = 0;
    for (const char of value) { const code = char.codePointAt(0)!; bytes += code < 128 ? 1 : code < 2048 ? 2 : code < 65536 ? 3 : 4; }
    return bytes;
  }

  /** 请求标识只用于关联，不是安全凭证或业务幂等键。 */
  private identifier(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, char => {
      const random = Math.floor(Math.random() * 16); return (char === "x" ? random : (random & 3) | 8).toString(16);
    });
  }
}
