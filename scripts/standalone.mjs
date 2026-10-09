import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
let html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
// Embed the verified Vite image assets for installation-free file:// play.
function inlineArtwork(js){
 for(const file of fs.readdirSync(path.join(root,'dist/assets'))){
  if(!file.endsWith('.webp'))continue;
  const data='data:image/webp;base64,'+fs.readFileSync(path.join(root,'dist/assets',file)).toString('base64');
  const relative=JSON.stringify('./assets/'+file),urlArgument=JSON.stringify(file);
  if(!js.includes(relative)&&!js.includes(urlArgument))throw new Error(`Build image has no embeddable reference: ${file}`);
  // Relative-base builds emit new URL("filename", import.meta.url). Data URLs
  // also work there, as well as in builds with direct asset path strings.
  js=js.replaceAll(relative,JSON.stringify(data)).replaceAll(urlArgument,JSON.stringify(data));
 }
 if(/["'][^"'\s]+\.webp["']/.test(js))throw new Error('Unembedded artwork in standalone build.');
 return js;
}
html=html.replace(/<script[^>]*src="([^"]+)"[^>]*><\/script>/g,(_,src)=>`<script type="module">${inlineArtwork(fs.readFileSync(path.join(root,'dist',src),'utf8')).replace(/<\/script/gi,'<\\/script')}</script>`);
html=html.replace(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g,(_,src)=>`<style>${fs.readFileSync(path.join(root,'dist',src),'utf8')}</style>`);
html=html.replace(/href="\.\/favicon.svg"/g,`href="data:image/svg+xml,${encodeURIComponent(fs.readFileSync(path.join(root,'public/favicon.svg'),'utf8').replace(/\r\n/g,'\n'))}"`);
if(Buffer.byteLength(html)>8*1024*1024)throw new Error('Standalone game exceeds the 8MB artwork budget.');
fs.writeFileSync(path.join(root,'..','Bedroom AGI.html'),html);
fs.mkdirSync(path.join(root,'docs'),{recursive:true});
fs.writeFileSync(path.join(root,'docs/index.html'),html);
fs.writeFileSync(path.join(root,'docs/.nojekyll'),'');
console.log('Standalone game written: ../Bedroom AGI.html and docs/index.html');
