/**
 * 登录与背包试点的会话传输：鉴权、恢复同步、心跳、退避重连和请求关联。
 * 应用持有此实例；不保存玩家资产，不自动重放业务请求，旧连接回包由连接代次隔离。
 */
import type { ReadProtocol } from "./Protocol";
import { Protocol } from "./Protocol";
import type { GameFrame } from "./GameProtocolCodecUtils";
import { GameProtocolCodecUtils, GAME_SOCKET_PROTOCOL } from "./GameProtocolCodecUtils";

export type SocketPort = Pick<WebSocket, "onopen" | "onmessage" | "onerror" | "onclose" | "send" | "close" | "readyState" | "binaryType" | "protocol">;
export class SocketFailure extends Error {
  /** 保存稳定原因；身份失败由账号层清理，网络中断不伪装成业务拒绝。 */
  constructor(readonly code: string, message = "网络连接中断，请稍后重试") { super(message); this.name = "SocketFailure"; }
  /** 判断是否必须回到登录页面，禁止自动抢回被替换的会话。 */
  get unauthorized(): boolean { return this.code === "UNAUTHENTICATED" || this.code === "SESSION_REPLACED"; }
}
interface Pending {
  name: string;
  resolve(value: GameFrame): void;
  reject(error: Error): void;
  timer: ReturnType<typeof setTimeout>;
}
export interface SocketOptions {
  create(url: string): SocketPort;
  validateSnapshot(value: unknown): void;
  /** 可选开发观察口：仅交付当前连接、已关联的服务端帧，观察异常不影响业务。 */
  onReceive?: (frame: Readonly<GameFrame>) => void;
  timeoutMs?: number;
  heartbeatMs?: number;
  retryDelay?: (attempt: number) => number;
}

/** 仅使用原生 WebSocket 能力；平台适配器由应用注入，测试可注入受控连接。 */
export class GameSocketClient {
  /** 自动重连完成后应用提交登录快照。 */
  onReady: (() => void) | null = null;
  /** 资产事件交给应用统一校验并提交。 */
  onState: ((frame: GameFrame) => void) | null = null;
  /** 当前连接最近的完整帧，供本次登录交付，不另建资产 Model。 */
  latestState: GameFrame | null = null;
  onDisconnected: ((message: string) => void) | null = null;
  onRejected: ((token: string, message: string) => void) | null = null;
  private socket: SocketPort | null = null;
  private token = "";
  private connectionId = "";
  private roleId = "";
  private generation = 0;
  private ready = false;
  /** 当前连接已接收的持久状态版本；旧版本不能覆盖最新初始化帧。 */
  private stateRevision = -1;
  private blocked: SocketFailure | null = null;
  private maintain = false;
  /** 应用是否在后台；后台保留凭证但停止连接与重试，重复生命周期事件无副作用。 */
  private suspended = false;
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
    if (this.suspended) return Promise.reject(new SocketFailure("NOT_READY", "应用在后台，等待恢复"));
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

  /** 本地身份交换也走二进制连接；先结束旧会话，失败不会恢复旧账号。 */
  async login(account: string, serverId: string): Promise<GameFrame> {
    if (this.suspended) throw new SocketFailure("NOT_READY", "应用在后台，等待恢复");
    this.disconnect(); const generation=++this.generation;
    await this.establish("",generation,{account,serverId});
    if(generation!==this.generation || !this.latestState) throw new SocketFailure("SESSION_CHANGED");
    return this.latestState;
  }
  /** 匿名选服使用短生命周期连接；返回后关闭，不接管玩家会话。 */
  catalog(): Promise<unknown> {
    const socket=this.options.create(this.url); socket.binaryType="arraybuffer"; const id=this.identifier();
    return new Promise((resolve,reject)=>{
      let done=false;
      const finish=(error: Error|null,value?:unknown):void=>{
        if(done)return;done=true;clearTimeout(timer);socket.onopen=socket.onmessage=socket.onerror=socket.onclose=null;
        try {socket.close();} catch {}
        if(error)reject(error);else resolve(value);
      };
      const timer=setTimeout(()=>finish(new SocketFailure("TIMEOUT")),this.options.timeoutMs||15000);
      socket.onopen=()=>{
        if(socket.protocol!==GAME_SOCKET_PROTOCOL){finish(new SocketFailure("INVALID_MESSAGE","服务端协议版本不匹配，请重启后端"));return;}
        try {socket.send(GameProtocolCodecUtils.encodeGameFrame({version:1,kind:"request",name:Protocol.SERVERS_LIST,id,body:{}}));}catch{finish(new SocketFailure("DISCONNECTED"));}
      };
      socket.onmessage=event=>{
        try {
          const frame=GameProtocolCodecUtils.decodeGameFrame(event.data);
          if(frame.version!==1 || frame.kind!=="response" || frame.name!==Protocol.SERVERS_LIST || frame.id!==id || frame.ok!==true || frame.error!==undefined) throw new SocketFailure("INVALID_MESSAGE");
          this.traceReceived(frame);finish(null,this.object(frame.body).items);
        }catch{finish(new SocketFailure("INVALID_MESSAGE"));}
      };
      socket.onerror=socket.onclose=()=>finish(new SocketFailure("DISCONNECTED"));
    });
  }

  /** 业务入口只检查当前会话就绪，不在断线期间排队扣费请求。 */
  assertReady(token: string): void {
    if (token === this.token && this.blocked) throw this.blocked;
    if (token !== this.token || !this.ready || this.socket?.readyState !== 1) throw new SocketFailure("NOT_READY", "网络正在恢复，请稍后重试");
  }

  /** 已有账号调用只需要数据体，复用完整信封入口；不另建第二条网络链。 */
  async request(token: string, name: ReadProtocol): Promise<unknown> {
    return (await this.requestFrame(token, name)).body;
  }

  /** 请求并返回已关联的真实信封，让模块路由使用服务端的 name，而不是在 Promise 回调里写死协议。 */
  async requestFrame(token: string, name: ReadProtocol): Promise<GameFrame> {
    this.assertReady(token);
    const generation = this.generation;
    const frame = await this.send(name, {});
    if (generation !== this.generation) throw new SocketFailure("SESSION_CHANGED");
    return frame;
  }

  /** 主线命令不自动重放；连接代次统一隔离，模块只保留业务幂等键。 */
  async chapter(token: string, name: typeof Protocol.CHAPTER_CHALLENGE | typeof Protocol.CHAPTER_CLAIM | typeof Protocol.CHAPTER_REPLAY | typeof Protocol.CHAPTER_IDLE_ENCOUNTER, body: unknown): Promise<GameFrame> {
    this.assertReady(token);
    const generation = this.generation;
    const frame = await this.send(name, body);
    if (generation !== this.generation) throw new SocketFailure("SESSION_CHANGED");
    return frame;
  }

  /** 当前阵容只读试战，不自动重放；连接切换由通信层拒绝旧结果。 */
  async previewBattle(token: string, mission: number): Promise<GameFrame> {
    this.assertReady(token);
    const generation = this.generation;
    const frame = await this.send(Protocol.BATTLE_PREVIEW, { mission });
    if (generation !== this.generation) throw new SocketFailure("SESSION_CHANGED");
    return frame;
  }

  /** GM 显式写请求，不自动重放；幂等键由 GM 模块保存，迟到回包按连接代次拒绝。 */
  async gmGrant(token:string, body:unknown):Promise<GameFrame> {
    this.assertReady(token);const generation=this.generation;
    const frame=await this.send(Protocol.GM_GRANT,body);
    if(generation!==this.generation)throw new SocketFailure("SESSION_CHANGED");
    return frame;
  }

  /** 主线保存不自动重放；业务模块保留原幂等键，换连接的迟到回执拒绝。 */
  async saveFormation(token: string, body: unknown): Promise<GameFrame> {
    this.assertReady(token);
    const generation = this.generation;
    const frame = await this.send(Protocol.FORMATION_SAVE, body);
    if (generation !== this.generation) throw new SocketFailure("SESSION_CHANGED");
    return frame;
  }

  /** 后台主动结束旧通道及计时器，保留已登录凭证；回前台只重做鉴权首包，不重放业务请求。 */
  setBackground(background: boolean): void {
    if (this.suspended === background) return;
    this.suspended = background;
    if (background) this.drop(new SocketFailure("SUSPENDED", "应用已暂停，返回后恢复同步"), false);
    else if (this.maintain && this.token && !this.blocked) void this.connect(this.token).catch(() => {});
  }

  /** 登出、换号或应用销毁时取消全部任务；迟到回包无法复活旧会话。 */
  disconnect(): void {
    this.maintain = false;
    this.token = "";
    this.roleId = "";
    this.latestState = null;
    this.stateRevision = -1;
    this.retries = 0;
    this.blocked = null;
    this.drop(new SocketFailure("SESSION_CHANGED", "会话已切换"), false);
  }

  /** 打开传输后先鉴权，再校验一致快照；此阶段不向任何 Model 写数据。 */
  private async establish(token: string, generation: number, login?: { account: string; serverId: string }): Promise<void> {
    try {
      const socket = this.options.create(this.url);
      this.socket = socket;
      socket.binaryType = "arraybuffer";
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => this.drop(new SocketFailure("TIMEOUT"), this.maintain), this.options.timeoutMs || 15000);
        this.rejectOpen = error => { clearTimeout(timer); reject(error); };
        socket.onopen = () => {
          if (generation !== this.generation) return;
          if (socket.protocol !== GAME_SOCKET_PROTOCOL) { this.drop(new SocketFailure("INVALID_MESSAGE", "服务端协议版本不匹配，请重启后端"), false); return; }
          clearTimeout(timer); this.rejectOpen = null; resolve();
        };
        socket.onmessage = event => { if (generation === this.generation) this.receive(event.data); };
        socket.onerror = socket.onclose = () => {
          if (generation === this.generation) this.drop(new SocketFailure("DISCONNECTED"), this.maintain);
        };
      });
      if (generation !== this.generation) throw new SocketFailure("SESSION_CHANGED");
      const frame = await this.send(login ? Protocol.SESSION_LOGIN : Protocol.SESSION_AUTHENTICATE, login ? { ...login, clientInstanceId: this.instanceId } : { accessToken: token, clientInstanceId: this.instanceId });
      const accepted = this.object(frame.body);
      if (generation !== this.generation) throw new SocketFailure("SESSION_CHANGED");
      if (typeof accepted.connectionId !== "string" || !accepted.connectionId || accepted.connectionId.length > 128
          || typeof accepted.roleId !== "string" || !accepted.roleId || accepted.roleId.length > 128
          || !Number.isSafeInteger(accepted.serverTimeMs) || Number(accepted.serverTimeMs) <= 0) throw new SocketFailure("INVALID_MESSAGE");
      this.connectionId = accepted.connectionId;
      if (this.roleId && this.roleId !== accepted.roleId) throw new SocketFailure("INVALID_MESSAGE");
      this.roleId = accepted.roleId;
      const snapshot = accepted.initial;
      if (login) {
        const session = this.object(accepted.session);
        if(typeof session.accessToken!=="string" || !/^[A-Za-z0-9_-]{43}$/.test(session.accessToken)) throw new SocketFailure("INVALID_MESSAGE");
        this.token=session.accessToken;
      }
      if (generation !== this.generation) throw new SocketFailure("SESSION_CHANGED");
      this.options.validateSnapshot(snapshot);
      if (this.object(this.object(snapshot).role).id !== this.roleId) throw new SocketFailure("INVALID_MESSAGE");
      if(!Number.isSafeInteger(this.object(snapshot).revision) || Number(this.object(snapshot).revision)<0) throw new SocketFailure("INVALID_MESSAGE");
      this.stateRevision=Number(this.object(snapshot).revision);
      this.latestState=frame;
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
  private send(name: string, body: unknown): Promise<GameFrame> {
    if (!this.socket || this.socket.readyState !== 1) return Promise.reject(new SocketFailure("DISCONNECTED"));
    if (this.pending.size >= 16) return Promise.reject(new SocketFailure("BUSY", "请求较多，请稍后重试"));
    const id = this.identifier();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.drop(new SocketFailure("TIMEOUT"), this.maintain), this.options.timeoutMs || 15000);
      this.pending.set(id, { name, resolve, reject, timer });
      try {
        this.socket!.send(GameProtocolCodecUtils.encodeGameFrame({ version: 1, kind: "request", name, id, body,
          ...(this.connectionId ? { connectionId: this.connectionId } : {}) }));
      } catch { this.drop(new SocketFailure("DISCONNECTED"), this.maintain); }
    });
  }

  /** 严格关联请求和连接标识；重复回包无副作用，顶号立即阻止自动重连。 */
  private receive(raw: unknown): void {
    try {
      const frame = GameProtocolCodecUtils.decodeGameFrame(raw);
      if (frame.version !== 1 || typeof frame.name !== "string") throw new SocketFailure("INVALID_MESSAGE");
      if (this.connectionId && frame.connectionId !== this.connectionId) throw new SocketFailure("INVALID_MESSAGE");
      if (frame.kind === "event" && frame.name === Protocol.STATE_CHANGED && this.connectionId && this.ready) {
        if(frame.id!==undefined || frame.ok!==undefined || frame.error!==undefined) throw new SocketFailure("INVALID_MESSAGE");
        this.options.validateSnapshot(frame.body);
        const revision=Number(this.object(frame.body).revision);
        if(!Number.isSafeInteger(this.object(frame.body).revision) || revision<0) throw new SocketFailure("INVALID_MESSAGE");
        if(this.object(this.object(frame.body).role).id!==this.roleId) throw new SocketFailure("INVALID_MESSAGE");
        this.traceReceived(frame);
        if(revision<=this.stateRevision)return;
        this.stateRevision=revision;this.latestState=frame;this.onState?.(frame);return;
      }
      if (frame.kind === "event" && frame.name === Protocol.SESSION_KICKED && this.connectionId) {
        this.traceReceived(frame);
        this.rejectSession(new SocketFailure("SESSION_REPLACED", "账号已在其他连接登录，请重新登录")); return;
      }
      if (frame.kind !== "response" || typeof frame.id !== "string" || typeof frame.ok !== "boolean") throw new SocketFailure("INVALID_MESSAGE");
      const pending = this.pending.get(frame.id);
      if (!pending) return;
      if (pending.name !== frame.name) throw new SocketFailure("INVALID_MESSAGE");
      if (frame.ok) {
        if (!("body" in frame) || frame.error !== undefined) throw new SocketFailure("INVALID_MESSAGE");
        if ((pending.name === Protocol.SESSION_AUTHENTICATE || pending.name === Protocol.SESSION_LOGIN) && this.object(frame.body).connectionId !== frame.connectionId) throw new SocketFailure("INVALID_MESSAGE");
        this.traceReceived(frame);
        this.pending.delete(frame.id); clearTimeout(pending.timer); pending.resolve(frame);
      } else {
        const error = this.object(frame.error);
        if (typeof error.code !== "string" || !/^[A-Z_]{3,64}$/.test(error.code) || frame.body !== null) throw new SocketFailure("INVALID_MESSAGE");
        const failure = new SocketFailure(error.code, error.code === "UNAUTHENTICATED" ? "登录已失效，请重新登录" : error.code === "SERVER_UNAVAILABLE" ? "服务器暂未开放，请重新选择" : error.code === "GM_DISABLED" ? "服务端开发GM未开启" : error.code === "CHAPTER_UNAVAILABLE" ? "主线条件不满足、阵容技能尚未支持或战报不可用，请检查阵容与进度" : error.code === "BATTLE_EMPTY" ? "请先保存非空主线阵容" : error.code === "BATTLE_UNSUPPORTED" ? "当前阵容包含尚未支持的技能或助战，请调整阵容" : error.code === "BATTLE_INVALID" ? "只读试战仅支持第一章前三关" : error.code === "UNKNOWN_MESSAGE" ? "服务端不支持此协议，请更新并重启后端" : "连接请求失败，请重试");
        this.traceReceived(frame);
        this.pending.delete(frame.id); clearTimeout(pending.timer); pending.reject(failure);
        if (failure.unauthorized) this.rejectSession(failure);
      }
    } catch (error) { this.drop(error instanceof SocketFailure ? error : new SocketFailure("INVALID_MESSAGE"), false); }
  }

  /** 日志观察不参与协议处理；诊断回调异常不能关闭正常连接或阻断 Model 更新。 */
  private traceReceived(frame: Readonly<GameFrame>): void {
    try { this.options.onReceive?.(frame); } catch { /* 开发日志失败不影响业务。 */ }
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
    if (retry && this.token && !this.suspended) {
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
        const value = this.object((await this.send(Protocol.SESSION_HEARTBEAT, {})).body);
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

  /** 只接受解码后的对象，不让数组/null 被当作合法消息或快照。 */
  private object(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new SocketFailure("INVALID_MESSAGE");
    return value as Record<string, unknown>;
  }

  /** 请求标识只用于关联，不是安全凭证或业务幂等键。 */
  private identifier(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, char => {
      const random = Math.floor(Math.random() * 16); return (char === "x" ? random : (random & 3) | 8).toString(16);
    });
  }
}
