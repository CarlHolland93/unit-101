import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const src=path.join(root,'src');
const qa=process.argv.includes('--qa');
const port=Number(process.env.PORT||8080);
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png'};
http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
    let body;
    let type='text/html';
    if(qa&&url.pathname==='/qa.html'){
      body=(await fs.readFile(path.join(src,'index.html'),'utf8')).replace('<script type="module" src="app.js"></script>','<script type="module">await import("./app.js"); await import("/__tests__/qa-cinematic.js");</script>');
    }else{
      const isTest=qa&&url.pathname.startsWith('/__tests__/');
      const base=isTest?path.join(root,'tests/browser'):src;
      const rel=isTest?url.pathname.slice('/__tests__/'.length):url.pathname==='/'?'index.html':url.pathname.slice(1);
      const file=path.resolve(base,decodeURIComponent(rel));
      if(!file.startsWith(base+path.sep)){res.writeHead(403);return res.end('Forbidden');}
      body=await fs.readFile(file);type=mime[path.extname(file)]||'application/octet-stream';
    }
    res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:body);
  }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Open http://127.0.0.1:${port}/${qa?'qa.html':''}`));
