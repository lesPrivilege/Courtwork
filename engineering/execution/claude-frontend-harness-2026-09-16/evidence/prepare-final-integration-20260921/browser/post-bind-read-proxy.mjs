import http from 'node:http';import fs from 'node:fs/promises';
let target=null, dropped=false;
http.createServer(async(req,res)=>{
 const chunks=[];for await(const c of req)chunks.push(c);const body=Buffer.concat(chunks);const headers={...req.headers,host:'127.0.0.1:8924'};delete headers['content-length'];if(headers.origin)headers.origin='http://127.0.0.1:8924';
 if(req.method==='GET' && req.url===target && !dropped){dropped=true;await fs.appendFile('/tmp/cw-prepare-final-astra-evidence/post-bind-commands.jsonl',JSON.stringify({method:req.method,path:req.url,status:500,injectedCode:'internal_error',afterBindCommit:true})+'\n');res.writeHead(500,{'content-type':'application/json'});res.end(JSON.stringify({error:{code:'internal_error',message:'synthetic read-back failure after committed bind'}}));return;}
 const response=await fetch('http://127.0.0.1:8924'+req.url,{method:req.method,headers,body:body.length?body:undefined});const bytes=Buffer.from(await response.arrayBuffer());
 if(req.method==='PUT' && req.url.endsWith('/repository-binding')){const data=JSON.parse(body);if(data.operation==='bind'&&response.ok)target=req.url.replace('/repository-binding','');await fs.appendFile('/tmp/cw-prepare-final-astra-evidence/post-bind-commands.jsonl',JSON.stringify({method:req.method,path:req.url,body:data,status:response.status})+'\n');}
 const out={};response.headers.forEach((v,k)=>{if(!['content-length','content-encoding','transfer-encoding'].includes(k))out[k]=v;});res.writeHead(response.status,out);res.end(bytes);
}).listen(8926,'127.0.0.1',()=>console.log('post-bind read fault proxy8926 →8924'));
