/** 统一开发日志：保存有界历史，按职责层分类着色，并隔离控制台和订阅者的输出失败。 */
/** 级别从低到高。低于 minLevel 的行不进缓冲，也不镜像到控制台。 */
export type LogLevel = "debug" | "info" | "warn" | "error";
/** 日志职责层；来源标签单独描述具体类或模块。 */
export type LogLayer = "APP" | "MODULE" | "FRAMEWORK" | "PLATFORM" | "CONFIG" | "DEV";
/** 职责层统一色板，业务调用方不再填写颜色。 */
const LAYER_COLORS: Record<LogLayer, string> = {
    APP: "#B388FF", MODULE: "#66BB6A", FRAMEWORK: "#4ea1ff",
    PLATFORM: "#26C6DA", CONFIG: "#D4A72C", DEV: "#90A4AE",
};
export interface LogLine {
    /** 旧入口未显式分类时为空；新入口必须指定职责层。 */
    layer?: LogLayer;
    level: LogLevel;
    tag: string;
    message: string;
    time: number;
    /** 职责层前缀颜色；旧入口用于整行颜色。 */
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
 * 分类日志分别渲染职责前缀和级别；旧入口保留原有颜色行为。
 * 环形缓冲和 format() 仍是纯文本。
 * 场景切换不新建；Boot 的行进了 Main 还能看见。
 */
export class GameLog {
    /** 有 window 或 document 时，带颜色的行才吃 %c。Node 检查进程保持纯文本。 */
    public static consoleUsesCss(host: object = globalThis): boolean {
        const box = host as {
            window?: unknown;
            document?: unknown;
        };
        return box.window !== undefined || box.document !== undefined;
    }

    /** 返回浏览器分段颜色参数；分类日志区分职责色与级别色，纯文本环境返回null。 */
    public static consoleParts(line: LogLine, host: object = globalThis): {
        text: string;
        css: string[];
    } | null {
        if (!GameLog.consoleUsesCss(host)) {
            return null;
        }
        if (!line.color || !line.color.trim()) {
            return null;
        }
        return {
            text: line.layer ? "%c[mxzg][" + line.layer + "][" + line.tag + "]%c[" + line.level + "] " + GameLog.clock(line.time) + " " + line.message : "%c" + GameLog.formatText(line),
            css: line.layer ? [GameLog.lineCss(line.color), GameLog.lineCss(line.level === "error" ? "#EF5350" : line.level === "warn" ? "#FFB74D" : line.color)] : [GameLog.lineCss(line.color)],
        };
    }

    /** performance.now，没有就用 Date.now。打开界面耗时用这个，避免和日志墙上的时钟混在一起。 */
    public static monoNow(): number {
        const perf = (globalThis as {
            performance?: {
                now?: () => number;
            };
        }).performance;
        if (perf && typeof perf.now === "function") {
            return perf.now();
        }
        return Date.now();
    }

    /** 把已完成日志行格式化为纯文本，供控制台和面板共用。 */
    private static formatText(line: LogLine): string {
        return "[mxzg]" + (line.layer ? "[" + line.layer + "]" : "") + "[" + line.level + "][" + line.tag + "] " + GameLog.clock(line.time) + " " + line.message;
    }

    /** 将日志颜色规范为控制台CSS参数，不创建额外色板。 */
    private static lineCss(color: string): string {
        const raw = color.trim();
        if (raw.indexOf("color:") === 0) {
            return raw;
        }
        return "color:" + raw;
    }

    /** 按严重程度和环境输出日志；失败仍由日志提交边界隔离。 */
    private static mirror(log: GameLog, line: LogLine): void {
        const fn = line.level === "error" ? console.error : line.level === "warn" ? console.warn : console.log;
        const parts = GameLog.consoleParts(line);
        if (!parts) {
            fn(log.format(line));
            return;
        }
        fn(parts.text, ...parts.css);
    }

    /** 将日志墙钟毫秒格式化为本地时分秒，不用于耗时测量。 */
    private static clock(time: number): string {
        const date = new Date(time);
        const pad = (n: number) => (n < 10 ? "0" : "") + n;
        return pad(date.getHours()) + ":" + pad(date.getMinutes()) + ":" + pad(date.getSeconds());
    }
    static shared = new GameLog();
    capacity: number;
    mirrorConsole = true;
    minLevel: LogLevel = "debug";
    private buffer: LogLine[] = [];
    private listeners = new Set<(line: LogLine) => void>();
    /** 最近打印的配置告警键；最多256个，淘汰最早的键后可再次打印。 */
    private warningKeys = new Set<string>();
    /** 创建有界日志缓存；非法容量至少保留一条。 */
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

    /** 按职责层输出；颜色由核心统一决定，级别仍决定控制台通道。 */
    public classified(layer: LogLayer, level: LogLevel, source: string, message: string): void {
        this.write(level, source, message, LAYER_COLORS[layer], layer);
    }

    /** 对来源及配置键去重；有界缓存避免异常配置持续占用内存。 */
    public warnOnce(layer: LogLayer, source: string, code: string, message: string): void {
        const key = layer + ":" + source + ":" + code;
        if (this.warningKeys.has(key)) {
            return;
        }
        if (this.warningKeys.size >= 256) {
            this.warningKeys.delete(this.warningKeys.values().next().value!);
        }
        this.warningKeys.add(key);
        this.classified(layer, "warn", source, message);
    }
    recent(limit?: number): LogLine[] {
        const n = limit === undefined ? this.buffer.length : Math.max(0, limit);
        if (n >= this.buffer.length) {
            return this.buffer.slice();
        }
        return this.buffer.slice(this.buffer.length - n);
    }
    subscribe(handler: (line: LogLine) => void): () => void {
        this.listeners.add(handler);
        return () => {
            this.listeners.delete(handler);
        };
    }

    /** 清空历史与告警去重键，便于开始新一轮诊断。 */
    clear(): void {
        this.buffer.length = 0;
        this.warningKeys.clear();
    }

    /** 控制台和日志面板用同一行格式。 */
    format(line: LogLine): string {
        return GameLog.formatText(line);
    }

    /**
     * 正式界面打开完成。一行：打开界面 <类名> ui <预制或页面名> 耗时 <N>ms。
     * 归属框架层，默认蓝色；保留既有颜色参数供旧调用迁移。
     */
    openView(className: string, prefabName: string, options?: {
        ms?: number;
        tag?: string;
        color?: string;
    }): void {
        const cls = className || "(none)";
        const name = prefabName || "(none)";
        const raw = options && typeof options.ms === "number" ? options.ms : 0;
        const ms = isFinite(raw) ? Math.max(0, Math.round(raw)) : 0;
        const tag = options && options.tag ? options.tag : "UI";
        const message = "打开界面 " + cls + " ui " + name + " 耗时 " + ms + "ms";
        const color = options && options.color && options.color.trim() ? options.color : OPEN_LINE_COLOR;
        this.write("info", tag, message, color, "FRAMEWORK");
    }

    /** 提交日志到有界历史；输出和订阅失败均不改变调用方业务结果。 */
    private write(level: LogLevel, tag: string, message: string, color?: string, layer?: LogLayer): void {
        if (RANK[level] < RANK[this.minLevel]) {
            return;
        }
        const line: LogLine = { level, tag, message, time: Date.now(), layer };
        if (color && color.trim()) {
            line.color = color.trim();
        }
        this.buffer.push(line);
        if (this.buffer.length > this.capacity) {
            this.buffer.splice(0, this.buffer.length - this.capacity);
        }
        if (this.mirrorConsole) {
            try {
                GameLog.mirror(this, line);
            }
            catch {
                // 控制台不可用时仍保留历史并继续通知日志面板。
            }
        }
        for (const handler of Array.from(this.listeners)) {
            try {
                handler(line);
            }
            catch (err) {
                // 订阅方异常不得阻断业务或其他日志订阅者。
            }
        }
    }
}
/** 只有「打开界面」成功行默认用这个蓝。其它日志不传颜色就不上色。 */
const OPEN_LINE_COLOR = "#4ea1ff";
