/** 启动器黑盒回归：只建随机端口合成服务，不连接数据库或启动第二个 Maven。 */
const http=require('node:http'),crypto=require('node:crypto'),{spawn}=require('node:child_process'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..');
/** 合成占用端口与新版/旧版握手，确认启动器只探测 WS，不停止其他服务。 */
async function probe(protocol){
 const requests=[],sockets=new Set(),server=http.createServer((req,res)=>{requests.push(req.url);res.writeHead(404);res.end();});
 server.on('connection',socket=>{sockets.add(socket);socket.on('error',()=>{});socket.on('close',()=>sockets.delete(socket));});
 server.on('upgrade',(req,socket)=>{
  requests.push(req.url);
  if(protocol===null){socket.end('HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n');return;}
  const accept=crypto.createHash('sha1').update(req.headers['sec-websocket-key']+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n'+(protocol?'Sec-WebSocket-Protocol: '+protocol+'\r\n':'')+'\r\n');
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try {
  const port=server.address().port;
  const child=spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(root,'backend/dev.ps1'),'-Action','run'],{cwd:root,env:{...process.env,MXZG_PORT:String(port)},windowsHide:true});
  let output='';child.stdout.on('data',v=>output+=v);child.stderr.on('data',v=>output+=v);
  const timer=setTimeout(()=>child.kill(),12000);const code=await new Promise(resolve=>child.on('close',resolve));clearTimeout(timer);
  assert.deepEqual(requests,['/api/v1/game/socket']);assert(!output.includes('Scanning for projects'));assert(server.listening);
  if(protocol==='mxzg.protobuf.v2'){assert.equal(code,0,output);assert(output.includes('[READY]'));}else assert.notEqual(code,0,output);
 }finally{for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));}
}
(async()=>{for(const protocol of [null,'','mxzg.protobuf.v1','mxzg.protobuf.v2'])await probe(protocol);console.log('PASS launcher: rejects HTTP/missing/old protocol; reuses v2; no game HTTP probes or extra backend');})().catch(error=>{console.error(error);process.exitCode=1;});
