/** 强类型二进制契约回归：初始化、资产推送、日志脱敏、错误载荷及无 Node 浏览器环境。 */
import {strict as assert} from "node:assert";
import {createRequire} from "node:module";
import {runInNewContext} from "node:vm";
import { GameProtocolCodecUtils, GAME_FRAME_LIMIT } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { Protocol } from "../assets/scripts/platform/Protocol";
import {ProtocolRouter} from "../assets/scripts/platform/ProtocolRouter";
import { GameProtocolLogUtils } from "../assets/scripts/platform/GameProtocolLogUtils";
import {mxzg} from "../assets/scripts/platform/GameProtocol.generated";
const state={revision:2,role:{id:"role",nickname:"测试😀",level:1,gold:0,diamonds:0,serverId:"local-1"},heroes:[],heroRoster:{capacity:325,buySpaceTimes:1},inventory:[{itemId:900101,quantity:4}]};
/** 协议帧往返必须保持结构和整数，不截取 Buffer 池其他字节。 */
function roundTrip(frame:any){const bytes=GameProtocolCodecUtils.encodeGameFrame(frame);assert(bytes instanceof ArrayBuffer);assert.deepEqual(GameProtocolCodecUtils.decodeGameFrame(bytes),frame);}
function main(){
 for(const locked of [true,false]) roundTrip({version:1,kind:"event",name:Protocol.STATE_CHANGED,body:{...state,heroes:[{id:"hero",templateId:1,level:1,star:1,locked,deployed:true,stage:0,baseStats:{hp:120,atk:30,def:10,spd:100}}]}});
 const instance="9223372036854775807";
 roundTrip({version:1,kind:"event",name:Protocol.STATE_CHANGED,connectionId:"conn",body:{...state,
 inventory:[{itemId:900102,quantity:2,instanceId:instance}],
 timedInventory:{serverTimeSeconds:100,items:[{instanceId:instance,itemId:123,activeAtSeconds:50,expiresAtSeconds:200},{instanceId:"other-instance",itemId:123,activeAtSeconds:60,expiresAtSeconds:300}]}}});

 roundTrip({version:1,kind:"request",name:Protocol.SESSION_LOGIN,id:"req",body:{account:"test",serverId:"local-1",clientInstanceId:"instance"}});
 roundTrip({version:1,kind:"request",name:Protocol.SESSION_AUTHENTICATE,id:"req",body:{accessToken:"a".repeat(43),clientInstanceId:"instance"}});
 for(const name of [Protocol.SESSION_HEARTBEAT,Protocol.SERVERS_LIST])roundTrip({version:1,kind:"request",name,id:"req",body:{}});
 const accepted={version:1,kind:"response",name:Protocol.SESSION_LOGIN,id:"req",ok:true,body:{connectionId:"conn",roleId:"role",serverTimeMs:1,initial:state,session:{accessToken:"a".repeat(43),expiresAt:"2099-01-01T00:00:00Z"}}};roundTrip(accepted);
 const change={version:1,kind:"event",name:Protocol.STATE_CHANGED,connectionId:"conn",body:state};roundTrip(change);
 roundTrip({version:1,kind:"response",name:Protocol.SERVERS_LIST,id:"req",ok:true,body:{items:[]}});
 roundTrip({version:1,kind:"response",name:Protocol.SESSION_HEARTBEAT,id:"req",ok:false,body:null,error:{code:"BUSY",message:"BUSY",retryable:true}});
 for(const value of ["text",new Uint8Array(GAME_FRAME_LIMIT+1),new Uint8Array([10,127])])assert.throws(()=>GameProtocolCodecUtils.decodeGameFrame(value));
 assert.throws(()=>GameProtocolCodecUtils.encodeGameFrame({...change,body:{...state,revision:2**53}}));
 const Frame=(mxzg as any).game.Frame;
 assert.throws(()=>GameProtocolCodecUtils.decodeGameFrame(Frame.encode({version:1,kind:"event",name:Protocol.STATE_CHANGED,empty:{}}).finish()));
 const unsafe=Frame.encode(Frame.fromObject({version:1,kind:"event",name:Protocol.STATE_CHANGED,snapshot:{...state,revision:"9007199254740993"}})).finish();assert.throws(()=>GameProtocolCodecUtils.decodeGameFrame(unsafe));
 assert.throws(()=>GameProtocolCodecUtils.decodeGameFrame(Frame.encode({version:1,kind:"response",name:Protocol.SESSION_LOGIN,ok:true,accepted:{connectionId:"c",roleId:"r",serverTimeMs:1}}).finish()));
 const log=GameProtocolLogUtils.formatServerFrame(accepted);assert(log.includes("物品种类数：1")&&log.includes('"quantity": 4')&&log.includes("role"));assert(!log.includes("a".repeat(43)));assert.equal((accepted.body.session as any).accessToken,"a".repeat(43));
 assert.equal(GameProtocolLogUtils.formatServerFrame({version:1,kind:"response",name:Protocol.SESSION_HEARTBEAT,body:{serverTimeMs:1}}),"");
 const router=new ProtocolRouter(),handled:any[]=[];const receiver={onNotify:(name:any,data:any)=>handled.push({name,data})},stop=router.register(receiver,[Protocol.STATE_CHANGED]);router.dispatch(receiver,change);assert.equal(handled[0].name,Protocol.STATE_CHANGED);assert.throws(()=>router.dispatch(receiver,accepted));stop();assert.throws(()=>router.dispatch(receiver,change));
 const {buildSync}=createRequire(process.cwd()+"/client/package.json")("esbuild");const browser=buildSync({entryPoints:["client/assets/scripts/platform/GameProtocolCodecUtils.ts"],bundle:true,platform:"browser",format:"iife",globalName:"Codec",write:false,target:"es2017"}).outputFiles[0].text;
 const sandbox:any={};runInNewContext(browser,sandbox);const codec=sandbox.Codec.GameProtocolCodecUtils;const value=codec.decodeGameFrame(codec.encodeGameFrame(change));assert.equal(value.body.role.nickname,"测试😀");assert.equal(value.body.role.gold,0);
 assert.throws(()=>GameProtocolCodecUtils.decodeGameFrame(new Uint8Array(GAME_FRAME_LIMIT+1)));
 assert.throws(()=>GameProtocolCodecUtils.encodeGameFrame({version:1,kind:"request",name:"session.login",body:{account:"x".repeat(GAME_FRAME_LIMIT+1),serverId:"local-1"}}));
 assert(GAME_FRAME_LIMIT===262144);console.log("PASS PB login/init/state contracts, required fields, safe integers, routing, readable redacted logs, browser runtime");
}
main();
