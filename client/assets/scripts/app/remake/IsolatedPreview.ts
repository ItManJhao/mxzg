/** Creator 显式隔离测试连接：校验本批运行身份后才允许登录，并独立命名会话存储，不覆盖日常配置。 */
import { PREVIEW } from "cc/env";
import { JsonClient } from "../../platform/http/JsonClient";
import type { HttpAdapter } from "../../platform/http/JsonClient";
interface Storage {getItem(key:string):string|null;setItem(key:string,value:string):void;removeItem(key:string):void;}

/** 无显式参数保持原行为；有任一测试参数则必须全部通过，失败绝不回退到玩家后端。 */
export async function isolatedPreview(defaultUrl:string,adapter:HttpAdapter,storage:Storage):Promise<{http:JsonClient;storage:Storage}> {
    const query=typeof location!=="undefined"?new URLSearchParams(location.search):new URLSearchParams();
    const url=query.get("mxzgTestApi"),run=query.get("mxzgTestRun");
    if(url===null && run===null)return {http:new JsonClient(defaultUrl,adapter),storage};
    if(!PREVIEW || typeof location==="undefined" || !["localhost","127.0.0.1"].includes(location.hostname) ||
        !url || !/^http:\/\/127\.0\.0\.1:\d{4,5}$/.test(url) || !run || !/^[a-f0-9]{32}$/.test(run))throw new Error("隔离预览参数无效，已停止连接");
    const port=Number(url.substring(url.lastIndexOf(":")+1));
    if(port<1024 || port>65535 || port===18080 || port===3306)throw new Error("隔离预览拒绝保留端口");
    const http=new JsonClient(url,adapter);
    const identity=await http.request("/api/v1/test-identity") as {kind?:unknown;run?:unknown};
    if(identity?.kind!=="mxzg-owned-mysql-it" || identity.run!==run)throw new Error("隔离预览实例身份不匹配，已停止连接");
    const prefix="mxzg.it."+run+".";
    return {http,storage:{getItem:key=>storage.getItem(prefix+key),setItem:(key,value)=>storage.setItem(prefix+key,value),removeItem:key=>storage.removeItem(prefix+key)}};
}
