/**
 * 当前游戏会话共用的服务器时钟，由连接层用已接纳的回包校准。
 * 两次校准之间按客户端经过的时间推算，连接失效后等待下次鉴权。
 */
export class ServerClock {
    /** 本次应用的时钟，业务通过它读取服务器当前时间。 */
    public static readonly instance = new ServerClock();

    /** 最近一次服务器毫秒及其本地计时锚点，连接失效时清空。 */
    private sample: { serverTimeMs: number; receivedAtMs: number } | null = null;

    /** 没有单调计时器的平台累积前台帧时间，单位毫秒。 */
    private frameElapsedMs = 0;

    /** @param elapsedMs 本地单调计时器，单位毫秒，测试可以注入。null 表示使用帧时间。 */
    public constructor(
        private readonly elapsedMs: (() => number) | null =
            typeof performance !== "undefined" && typeof performance.now === "function" ? () => performance.now() : null,
    ) {
    }

    /** 记录当前已校验的回包时间，单位为 Unix 毫秒。 */
    public synchronize(serverTimeMs: number): void {
        this.sample = { serverTimeMs, receivedAtMs: this.elapsedMs?.() ?? this.frameElapsedMs };
    }

    /** 撤销当前连接的时间基准，业务暂停使用旧时间。 */
    public invalidate(): void {
        this.sample = null;
    }

    /** 仅在使用帧计时的平台推进时间，seconds 为引擎本帧经过的秒数。 */
    public advance(seconds: number): void {
        if (!this.elapsedMs && Number.isFinite(seconds) && seconds > 0) {
            this.frameElapsedMs += seconds * 1000;
        }
    }

    /** 返回估算的服务器当前 Unix 秒，等待有效回包校准时返回 null。 */
    public nowSeconds(): number | null {
        const sample = this.sample;
        if (!sample) {
            return null;
        }
        const elapsed = (this.elapsedMs?.() ?? this.frameElapsedMs) - sample.receivedAtMs;
        return Math.floor((sample.serverTimeMs + Math.max(0, elapsed)) / 1000);
    }
}
