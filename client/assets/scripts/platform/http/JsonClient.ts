export interface JsonRequest {
  method: "GET" | "POST" | "PUT";
  url: string;
  headers: Record<string, string>;
  body?: string;
}
export interface JsonResponse { status: number; data: unknown; }
export type HttpAdapter = (request: JsonRequest) => Promise<JsonResponse>;

export class HttpFailure extends Error {
  constructor(readonly status: number, message: string) { super(message); this.name = "HttpFailure"; }
}

/** No global browser lookup here; the application supplies the platform adapter. */
export class JsonClient {
  constructor(private readonly baseUrl: string, private readonly adapter: HttpAdapter) {
    if (!/^https?:\/\/[^\s?#]+$/.test(baseUrl)) throw new Error("Invalid API address");
  }

  async request(path: string, body?: unknown, token?: string, method?: JsonRequest["method"]): Promise<unknown> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = "Bearer " + token;
    const response = await this.adapter({ method: method || (body === undefined ? "GET" : "POST"),
      url: this.baseUrl.replace(/\/$/, "") + path, headers,
      body: body === undefined ? undefined : JSON.stringify(body) });
    if (response.status < 200 || response.status >= 300) {
      throw new HttpFailure(response.status, response.status === 401 ? "登录已失效，请重新登录" : "请求失败（" + response.status + "）");
    }
    return response.data;
  }
}
