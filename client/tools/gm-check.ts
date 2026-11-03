/** GM 请求边界：重复点击、未知结果重试、请求回执和 Protobuf 载荷。 */
import {GmController} from "../assets/scripts/features/gm/GmController";
import {encodeGameFrame,decodeGameFrame} from "../assets/scripts/platform/GameProtocolCodec";
function assert(ok:unknown,text:string):asserts ok{if(!ok)throw new Error(text);}
async function main(){
 let bodies:any[]=[];let failed=true;
 const gm=new GmController(async()=>({enabled:true}),async body=>{bodies.push(body);if(failed)throw new Error("timeout");return body;});
 assert(await gm.enabled(),"真实开关");
 await gm.grant("role","hero",10101001,1).catch(()=>{});
 await gm.grant("role","item",900101,1).then(()=>{throw new Error("不应换参数重发");},()=>{});
 failed=false;await gm.grant("role","hero",10101001,1);assert(bodies.length===2&&bodies[0].requestId===bodies[1].requestId,"结果未知必须复用请求ID");
 await gm.grant("role","hero",10101001,1);assert(bodies[2].requestId!==bodies[1].requestId,"成功后新操作使用新ID");
 for(const kind of ["request","response"]){const body=bodies[0];const frame=decodeGameFrame(encodeGameFrame({version:1,kind,name:"gm.grant",id:"test",ok:kind==="response"?true:undefined,body}));assert(JSON.stringify(frame.body)===JSON.stringify(body),"GM Protobuf互通");}
 console.log("PASS GM safe retry and Protobuf");
}main().catch(e=>{console.error(e);process.exitCode=1;});
