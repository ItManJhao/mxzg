import { ErrorCode, logErrorCode } from "../core/errors";
import { parseMockFixture, MockFixture } from "./MockFixture";
import { encodeRequest } from "./protocol/codec";
import { Cmd } from "./protocol/cmds";
import { HeartbeatResp } from "./protocol/types";
import { ITransport, NetHandler, NetMessage } from "./NetTypes";

export interface ReplayTransportOptions {
  latencyMs?: number;
}

/**
 * 按录包顺序回放。心跳不占步数。
 * cmd 与下一步不一致时不前进，方便调用方重试。
 * 默认预览仍用 MockTransport；要回放时自己 new，并传入 parse 过的 fixture。
 */
export class ReplayTransport implements ITransport {
  readonly fixture: MockFixture;
  private latencyMs: number;
  private opened = false;
  private cursor = 0;
  private messageHandler: NetHandler | null = null;
  private closeHandler: (() => void) | null = null;

  constructor(fixture: MockFixture, options?: ReplayTransportOptions) {
    this.fixture = parseMockFixture(fixture);
    this.latencyMs = options?.latencyMs ?? 30;
  }

  /** 已经播放掉的步数。 */
  played(): number {
    return this.cursor;
  }

  connect(_url: string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.opened = true;
        resolve();
      }, this.latencyMs);
    });
  }

  send(msg: NetMessage): void {
    if (!this.opened) {
      logErrorCode("Replay", ErrorCode.NET_CLOSED, "drop " + msg.cmd);
      return;
    }
    setTimeout(() => this.reply(msg), this.latencyMs);
  }

  close(): void {
    if (!this.opened) return;
    this.opened = false;
    const handler = this.closeHandler;
    if (handler) handler();
  }

  onMessage(handler: NetHandler): void {
    this.messageHandler = handler;
  }

  onClose(handler: () => void): void {
    this.closeHandler = handler;
  }

  private reply(msg: NetMessage): void {
    if (!this.opened) return;
    if (msg.cmd === Cmd.heartbeat) {
      const data: HeartbeatResp = { serverTime: Date.now() };
      this.emit(encodeRequest(Cmd.heartbeat, data));
      return;
    }
    const step = this.fixture.steps[this.cursor];
    if (!step) {
      this.emit(encodeRequest(msg.cmd, { ok: false, code: ErrorCode.REPLAY_ENDED, error: "replay ended" }));
      return;
    }
    if (step.cmd !== msg.cmd) {
      this.emit(encodeRequest(msg.cmd, { ok: false, code: ErrorCode.REPLAY_MISMATCH, error: "replay expected " + step.cmd }));
      return;
    }
    this.cursor += 1;
    this.emit(encodeRequest(step.cmd, step.data));
  }

  private emit(msg: NetMessage): void {
    if (this.messageHandler) this.messageHandler(msg);
  }
}
