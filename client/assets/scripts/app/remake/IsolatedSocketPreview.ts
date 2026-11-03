/** 独立预览的目标与存储隔离：随机实例身份核验通过前不登录，不允许测试参数回退到日常服。
 * HTTP 仅访问测试 classpath 的实例身份探针，游戏选服/身份/资产全部使用 WS+Protobuf。
 */
import { PREVIEW } from "cc/env";
/** 启动只需要这三个存储操作；测试会话采用独立 run 前缀。 */
interface PreviewStorage {getItem(key:string):string|null;setItem(key:string,value:string):void;removeItem(key:string):void;}
/** 核验旧工具输出的测试地址，复用它的随机端口；无参数时保留日常连接。 */
export async function isolatedSocketPreview(socketUrl:string,storage:PreviewStorage):Promise<{socketUrl:string;storage:PreviewStorage}> {
 const href=typeof location!=="undefined"?location.href:"";
 const query=href?new URL(href).searchParams:null;
 if(!query?.has("mxzgTestApi") && !query?.has("mxzgTestRun"))return {socketUrl,storage};
 if(!PREVIEW || !/^http:\/\/(localhost|127\.0\.0\.1):7456\//.test(href))throw new Error("测试目标只允许本机 Creator 预览");
 const target=query?.get("mxzgTestApi")||"",run=query?.get("mxzgTestRun")||"";
 if(!/^http:\/\/127\.0\.0\.1:\d{4,5}$/.test(target) || !/^[a-f0-9-]{32,36}$/.test(run))throw new Error("独立预览参数不完整或无效，禁止连接日常服");
 const port=Number(new URL(target).port);
 if([18080,18081,3306].includes(port) || port>65535)throw new Error("测试预览不能连接日常端口");
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),15000);
 let response:Response;
 try {response=await fetch(target+"/api/v1/test-identity",{signal:abort.signal});}
 finally {clearTimeout(timer);}
 if(!response.ok)throw new Error("独立测试后端不可用，禁止回退日常服");
 const identity=await response.json();
 if(!["mxzg-owned-socket-it","mxzg-owned-mysql-it"].includes(identity.kind) || identity.run!==run)throw new Error("测试实例身份不匹配，禁止登录");
 const prefix="mxzg.test."+run+".";
 return {socketUrl:target.replace(/^http/,"ws")+"/api/v1/game/socket",storage:{
  getItem:key=>storage.getItem(prefix+key),setItem:(key,value)=>storage.setItem(prefix+key,value),removeItem:key=>storage.removeItem(prefix+key),
 }};
}
