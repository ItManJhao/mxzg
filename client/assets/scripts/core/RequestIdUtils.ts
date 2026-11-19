/** 生成服务端业务请求使用的 UUID。请求编号只标识本次操作。 */
export class RequestIdUtils {
    /** 通过静态方法生成编号。 */
    private constructor() {
    }

    /** 使用平台随机源生成一次请求的 UUID。 */
    public static create(): string {
        if (typeof crypto === "undefined" || typeof crypto.getRandomValues !== "function") {
            throw new Error("当前平台缺少生成请求编号所需的安全随机源");
        }
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = Array.from(bytes, value => value.toString(16).padStart(2, "0")).join("");
        return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
    }
}
