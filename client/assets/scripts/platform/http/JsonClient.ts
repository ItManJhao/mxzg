/** 应用注入的 JSON 传输边界；统一 HTTP 状态，保留后端稳定错误码供具体功能映射文案。 */
export interface JsonRequest {
  method: "GET" | "POST" | "PUT";
  url: string;
  headers: Record<string, string>;
  body?: string;
}
export interface JsonResponse { status: number; data: unknown; }
export type HttpAdapter = (request: JsonRequest) => Promise<JsonResponse>;

export class HttpFailure extends Error {
  /** 保存安全的状态和稳定业务错误码，不向 UI 暴露任意服务器正文。 */
  constructor(readonly status: number, message: string, readonly code = "") { super(message); this.name = "HttpFailure"; }
}

/** No global browser lookup here; the application supplies the platform adapter. */
export class JsonClient {
  constructor(private readonly baseUrl: string, private readonly adapter: HttpAdapter) {
    if (!/^https?:\/\/[^\s?#]+$/.test(baseUrl)) throw new Error("Invalid API address");
  }

  /** 返回实际连接地址，长连接沿用隔离预览选定的实例，不能误连默认玩家后端。 */
  get baseAddress(): string { return this.baseUrl; }

  /** 发出一次明确请求；错误正文仅提取全大写业务码，其他错误保留原有通用说明。 */
  async request(path: string, body?: unknown, token?: string, method?: JsonRequest["method"]): Promise<unknown> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = "Bearer " + token;
    const response = await this.adapter({ method: method || (body === undefined ? "GET" : "POST"),
      url: this.baseUrl.replace(/\/$/, "") + path, headers,
      body: body === undefined ? undefined : JSON.stringify(body) });
    if (response.status < 200 || response.status >= 300) {
      const detail=response.data && typeof response.data==="object" ? (response.data as Record<string,unknown>).detail : undefined;
      const code=typeof detail==="string" && /^[A-Z_]{3,64}$/.test(detail)?detail:"";
      throw new HttpFailure(response.status, response.status === 401 ? "登录已失效，请重新登录" : "请求失败（" + response.status + "）",code);
    }
    return response.data;
  }
}
