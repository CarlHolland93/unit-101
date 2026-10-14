import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const src=path.join(root,'src');
const modelData=JSON.parse(fs.readFileSync(path.join(src,'assets/model.json'),'utf8'));
if('report' in modelData||modelData.inserts.some(i=>i.name.startsWith('2305_DWG LINKS'))){
  throw new Error('Use the public sample model without source diagnostics or empty drawing-link metadata.');
}
let app=fs.readFileSync(path.join(src,'app.js'),'utf8');
app=app.replace(/const data=await fetch[^\n]+/,`const data=JSON.parse(document.getElementById('model-data').textContent);\nglobalThis.WALKTHROUGH_TEXTURES=JSON.parse(document.getElementById('texture-data').textContent);`);
const bundle=await build({stdin:{contents:app,resolveDir:src,sourcefile:'app.js',loader:'js'},bundle:true,write:false,format:'esm',minify:true,alias:{three:path.join(src,'assets/three.module.js')}});
const textures={};
for(const name of fs.readdirSync(path.join(src,'assets/textures')).filter(n=>n.endsWith('.jpg'))){
  textures['./assets/textures/'+name]='data:image/jpeg;base64,'+fs.readFileSync(path.join(src,'assets/textures',name)).toString('base64');
}
let html=fs.readFileSync(path.join(src,'index.html'),'utf8');
html=html.replace(/<link rel="stylesheet" href="style.css">/,()=>`<style>${fs.readFileSync(path.join(src,'style.css'),'utf8')}</style>`).replace(/<script type="importmap">.*?<\/script>/,'');
html=html.replaceAll('assets/source-plan.svg','data:image/svg+xml;base64,'+fs.readFileSync(path.join(src,'assets/source-plan.svg')).toString('base64'));
const model=JSON.stringify(modelData).replaceAll('<','\\u003c');
html=html.replace('<script type="module" src="app.js"></script>',()=>`<script type="application/json" id="model-data">${model}</script><script type="application/json" id="texture-data">${JSON.stringify(textures)}</script><script type="module">${bundle.outputFiles[0].text.replaceAll('</script','<\\/script')}</script>`);
fs.mkdirSync(path.join(root,'dist'),{recursive:true});
fs.writeFileSync(path.join(root,'dist/unit-101-walkthrough.html'),html);
console.log(`Built dist/unit-101-walkthrough.html (${Buffer.byteLength(html).toLocaleString()} bytes, ${Object.keys(textures).length} embedded texture maps).`);
