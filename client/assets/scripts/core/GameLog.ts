/** 级别从低到高。低于 minLevel 的行不进缓冲，也不镜像到控制台。 */
export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogLine {
  level: LogLevel;
  tag: string;
  message: string;
  time: number;
  /** 整行颜色。有值时浏览器控制台用一个 %c 涂满这一行。 */
  color?: string;
}

const RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

/**
 * 进程内日志。环形缓冲留最近若干条，给主城「日志」看。
 * mirrorConsole 为 true 时同步打到 console，前缀 [mxzg]。
 * 平常不上色。只有这一行自己带了颜色时，浏览器才用一个 %c 涂满整行。
 * 环形缓冲和 format() 仍是纯文本。
 * 场景切换不新建；Boot 的行进了 Main 还能看见。
 */
export class GameLog {
  static shared = new GameLog();

  capacity: number;
  mirrorConsole = true;
  minLevel: LogLevel = "debug";

  private buffer: LogLine[] = [];
  private listeners = new Set<(line: LogLine) => void>();

  constructor(capacity = 80) {
    this.capacity = capacity > 0 ? capacity : 1;
  }

  /** 来源记为 GameLog。传入颜色时整行用这个颜色，不传就和普通 info 一样不上色。 */
  static log(message: string, color?: string): void {
    GameLog.shared.log(message, color);
  }

  log(message: string, color?: string): void {
    this.write("info", "GameLog", message, color);
  }

  debug(tag: string, message: string, color?: string): void {
    this.write("debug", tag, message, color);
  }

  info(tag: string, message: string, color?: string): void {
    this.write("info", tag, message, color);
  }

  warn(tag: string, message: string, color?: string): void {
    this.write("warn", tag, message, color);
  }

  error(tag: string, message: string, color?: string): void {
    this.write("error", tag, message, color);
  }

  recent(limit?: number): LogLine[] {
    const n = limit === undefined ? this.buffer.length : Math.max(0, limit);
    if (n >= this.buffer.length) return this.buffer.slice();
    return this.buffer.slice(this.buffer.length - n);
  }

  subscribe(handler: (line: LogLine) => void): () => void {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  clear(): void {
    this.buffer.length = 0;
  }

  /** 控制台和日志面板用同一行格式。 */
  format(line: LogLine): string {
    return formatText(line);
  }

  /**
   * 正式界面打开完成。一行：打开界面 <类名> ui <预制或页面名> 耗时 <N>ms。
   * 这一行默认整行蓝色。调用方传入 color 时改用那个颜色。
   */
  openView(className: string, prefabName: string, options?: { ms?: number; tag?: string; color?: string }): void {
    const cls = className || "(none)";
    const name = prefabName || "(none)";
    const raw = options && typeof options.ms === "number" ? options.ms : 0;
    const ms = isFinite(raw) ? Math.max(0, Math.round(raw)) : 0;
    const tag = options && options.tag ? options.tag : "UI";
    const message = "打开界面 " + cls + " ui " + name + " 耗时 " + ms + "ms";
    const color = options && options.color && options.color.trim() ? options.color : OPEN_LINE_COLOR;
    this.info(tag, message, color);
  }

  private write(level: LogLevel, tag: string, message: string, color?: string): void {
    if (RANK[level] < RANK[this.minLevel]) return;
    const line: LogLine = { level, tag, message, time: Date.now() };
    if (color && color.trim()) line.color = color.trim();
    this.buffer.push(line);
    if (this.buffer.length > this.capacity) {
      this.buffer.splice(0, this.buffer.length - this.capacity);
    }
    if (this.mirrorConsole) mirror(this, line);
    for (const handler of Array.from(this.listeners)) {
      try {
        handler(line);
      } catch (err) {
        console.error("[mxzg][error][GameLog] listener", err);
      }
    }
  }
}

/** 只有「打开界面」成功行默认用这个蓝。其它日志不传颜色就不上色。 */
const OPEN_LINE_COLOR = "#4ea1ff";

/** 有 window 或 document 时，带颜色的行才吃 %c。Node 检查进程保持纯文本。 */
export function consoleUsesCss(host: object = globalThis): boolean {
  const box = host as { window?: unknown; document?: unknown };
  return box.window !== undefined || box.document !== undefined;
}

/** 浏览器里带颜色的一行。没颜色、或没有 CSS 环境时返回 null，调用方打纯文本。 */
export function consoleParts(line: LogLine, host: object = globalThis): { text: string; css: string[] } | null {
  if (!consoleUsesCss(host)) return null;
  if (!line.color || !line.color.trim()) return null;
  return {
    text: "%c" + formatText(line),
    css: [lineCss(line.color)],
  };
}

/** performance.now，没有就用 Date.now。打开界面耗时用这个，避免和日志墙上的时钟混在一起。 */
export function monoNow(): number {
  const perf = (globalThis as { performance?: { now?: () => number } }).performance;
  if (perf && typeof perf.now === "function") return perf.now();
  return Date.now();
}

function formatText(line: LogLine): string {
  return "[mxzg][" + line.level + "][" + line.tag + "] " + clock(line.time) + " " + line.message;
}

function lineCss(color: string): string {
  const raw = color.trim();
  if (raw.indexOf("color:") === 0) return raw;
  return "color:" + raw;
}

function mirror(log: GameLog, line: LogLine): void {
  const fn = line.level === "error" ? console.error : line.level === "warn" ? console.warn : console.log;
  const parts = consoleParts(line);
  if (!parts) {
    fn(log.format(line));
    return;
  }
  fn(parts.text, parts.css[0]);
}

function clock(time: number): string {
  const date = new Date(time);
  const pad = (n: number) => (n < 10 ? "0" : "") + n;
  return pad(date.getHours()) + ":" + pad(date.getMinutes()) + ":" + pad(date.getSeconds());
}
