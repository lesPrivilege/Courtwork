// Synthetic browser recovery fixture only. The upstream commits the first
// assignment; this proxy discards its response without changing Host state.
import http from 'node:http';
const target=new URL(process.env.CW_SPARK_UPSTREAM||'http://127.0.0.1:54329');let lost=false;
const proxy=http.createServer((req,res)=>{
 const drop=!lost&&req.method==='POST'&&req.url==='/api/v5/subagents';if(drop)lost=true;
 const upstream=http.request(new URL(req.url,target),{method:req.method,headers:{...req.headers,host:target.host,...(req.headers.origin?{origin:target.origin}:{})}},reply=>{
  if(drop){reply.resume();reply.on('end',()=>{console.log('Dropped one committed assignment receipt');res.writeHead(502,{'content-type':'application/json'});res.end(JSON.stringify({error:{message:'Synthetic upstream receipt lost.'}}));});return;}
  res.writeHead(reply.statusCode,reply.headers);reply.pipe(res);
 });
 upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end();});req.pipe(upstream);
});
proxy.listen(Number(process.env.CW_SPARK_PROXY_PORT||54330),'127.0.0.1',()=>console.log('Synthetic response-loss proxy ready'));
process.on('SIGTERM',()=>proxy.close(()=>process.exit(0)));
