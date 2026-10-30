import type { HttpAdapter } from "./JsonClient";

/** Creator's XHR entry point; native and WeChat builds still require platform smoke tests. */
export function createXhrAdapter(timeoutMs = 10000): HttpAdapter {
  return (request) => new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(request.method, request.url, true);
    xhr.timeout = timeoutMs;
    for (const name of Object.keys(request.headers)) xhr.setRequestHeader(name, request.headers[name]);
    xhr.onload = () => {
      let data: unknown = null;
      try { data = xhr.responseText ? JSON.parse(xhr.responseText) : null; }
      catch { reject(new Error("服务器返回了无效的 JSON")); return; }
      resolve({ status: xhr.status, data });
    };
    xhr.onerror = () => reject(new Error("网络连接失败，请检查后端地址与跨域设置"));
    xhr.ontimeout = () => reject(new Error("请求超时，请重试"));
    xhr.onabort = () => reject(new Error("请求已取消"));
    xhr.send(request.body);
  });
}
