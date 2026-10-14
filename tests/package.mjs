import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const html=fs.readFileSync(new URL('../dist/unit-101-walkthrough.html',import.meta.url),'utf8');
const model=JSON.parse(html.match(/<script type="application\/json" id="model-data">([\s\S]*?)<\/script>/)[1]);
const textures=JSON.parse(html.match(/<script type="application\/json" id="texture-data">([\s\S]*?)<\/script>/)[1]);
assert.ok(model.bounds&&model.paths.length>0);
assert.ok(!('report' in model),'Source diagnostics must not be distributed');
assert.ok(model.inserts.every(i=>!i.name.startsWith('2305_DWG LINKS')),'Empty source-link identifiers must not be distributed');
assert.equal(Object.keys(textures).length,18);
assert.ok(Object.values(textures).every(v=>v.startsWith('data:image/jpeg;base64,')));
assert.ok(html.includes('data-view="plan"'));
assert.ok(html.includes('id="full-credits"')&&html.includes('Copyright © 2010-2025 three.js authors'),'Third-party license must be readable in the offline viewer');
assert.ok(!html.includes('href="credits.txt"')&&!html.includes('href="./index.html"'),'Offline viewer must not link to missing local pages');
assert.ok(!/<(?:script|link|img)\b[^>]*(?:src|href)="(?:https?:|\.\/|assets\/)/.test(html),'Assets must be embedded in the offline file');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'unit-101-check-'));
try{
  const file=path.join(tmp,'bundle.mjs');
  fs.writeFileSync(file,html.match(/<script type="module">([\s\S]*?)<\/script>/)[1]);
  execFileSync(process.execPath,['--check',file]);
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
console.log('Offline bundle syntax, embedded model/textures and floor-plan startup checks pass.');
