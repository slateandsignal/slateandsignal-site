// Repeatable privacy and classification checks. No requests or real analytics events are sent.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'assets/site-analytics.js'),'utf8');
const storage=(map=new Map())=>({getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)});
function run(url,{local=storage(),session=storage()}={}){
  const scripts=[],listeners={};const window={location:new URL(url)};
  const document={referrer:'',head:{appendChild:e=>scripts.push(e.src)},createElement:()=>({}),addEventListener:(n,f)=>listeners[n]=f};
  vm.runInNewContext(source,{window,document,localStorage:local,sessionStorage:session,URL,URLSearchParams,Date});
  return {window,scripts,listeners,local,session};
}
const site='https://slateandsignal.studio';
assert.equal(run('http://localhost:8874/').scripts.length,0);
const internal=run(site+'/?analytics=off');assert.equal(internal.scripts.length,0);
assert.equal(run(site+'/report/',internal).scripts.length,0);
assert.ok(run(site+'/?analytics=on',internal).scripts.some(x=>x.includes('googletagmanager')));
assert.equal(run(site+'/?audience=test').scripts.length,0);
assert.equal(run(site+'/?email=private@example.com').scripts.length,0);
for(const prefix of ['p','r','cc','profiles','my-report','review']){
  const privateVisit=run(site+'/'+prefix+'/private-client/');assert.equal(privateVisit.scripts.length,0);
  const follow=run(site+'/report/',privateVisit);
  assert.equal(follow.window.dataLayer[1][2].traffic_cohort,'client');
  assert.ok(!follow.scripts.some(x=>x.includes('metricool')));
  assert.ok(!JSON.stringify(follow.window.dataLayer).includes('private-client'));
}
const invited=run(site+'/?audience=invited');assert.equal(invited.window.dataLayer[1][2].traffic_cohort,'invited');
assert.ok(!invited.scripts.some(x=>x.includes('metricool')));
const visitor=run(site+'/?utm_source=pinterest&utm_medium=organic_social&utm_campaign=brand_basics&utm_content=pin_01');
assert.equal(visitor.window.dataLayer[1][2].traffic_cohort,'unclassified');
assert.ok(visitor.window.dataLayer[1][2].page_location.includes('utm_source=pinterest'));
assert.equal(visitor.scripts.filter(x=>x.includes('googletagmanager')).length,1);
visitor.window.ssTrack('quiz_result_shown','content_style');
assert.equal(visitor.window.dataLayer[2][1],'quiz_result_shown');
visitor.window.ssTrack('purchase','report');assert.equal(visitor.window.dataLayer.length,3);
visitor.listeners.click({target:{closest:()=>({href:'https://buy.stripe.com/example'})}});
const checkout=run(site+'/report/');checkout.listeners.click({target:{closest:()=>({href:'https://buy.stripe.com/example'})}});
assert.equal(checkout.window.dataLayer[2][1],'checkout_click');
assert.equal(checkout.window.dataLayer[2][2].service,'report');
const walk=dir=>fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]):[];
for(const prefix of ['p','r','cc','profiles','my-report','review','friend'])for(const file of walk(path.join(root,prefix)).filter(x=>x.endsWith('.html'))){
  const html=fs.readFileSync(file,'utf8');
  assert.ok(!/googletagmanager\.com\/gtag\/|tracker\.metricool\.com\//.test(html),'Legacy private tracker: '+path.relative(root,file));
}
const urls=[...fs.readFileSync(path.join(root,'sitemap.xml'),'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
for(const url of urls){const u=new URL(url);let file=path.join(root,u.pathname);if(!path.extname(file))file=path.join(file,'index.html');
  const html=fs.readFileSync(file,'utf8');
  assert.equal((html.match(/src=["']\/assets\/site-analytics\.js["']/g)||[]).length,1,'Shared tracker coverage: '+u.pathname);
  assert.ok(!/googletagmanager\.com\/gtag\/|tracker\.metricool\.com\//.test(html),'Duplicate inline tracker: '+u.pathname);
}
console.log('PASS: owner opt-out, test exclusion, private-page exclusion, client/invited labels, campaign metadata, event allowlist, private legacy scan, and '+urls.length+' public sitemap pages. No external events sent.');
