import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const base=process.env.SOA_TEST_URL||'http://127.0.0.1:5180';
const demoAccess=new URL('../private/storage/demo-access.txt',import.meta.url);
test('calendar serves only server-unlocked content and no cache',async()=>{
 const response=await fetch(`${base}/api/calendar.php?day=24&date=2026-12-24`);assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);
 const data=await response.json();assert.equal(Object.keys(data.tasks).length,data.state.available);
 for(const day of Object.keys(data.tasks))assert.ok(Number(day)<=data.state.available);
 if(data.state.available<24){const locked=await fetch(`${base}/dzien.php?day=24`);assert.equal(locked.status,404);assert.doesNotMatch(await locked.text(),/Zabierz tę chwilę ze sobą/);}
});
test('stats and exports cannot be read without authentication',async()=>{
 for(const path of ['/statystyki/','/statystyki/eksport']){const r=await fetch(base+path,{redirect:'manual'});assert.equal(r.status,303);assert.equal(r.headers.get('location'),'/statystyki/logowanie');}
});
test('private source and arbitrary analytics calls are rejected',async()=>{
 for(const path of ['/private/tasks.php','/private/config.local.php','/database/schema.sql'])assert.equal((await fetch(base+path)).status,404);
 assert.equal((await fetch(`${base}/api/track.php`)).status,405);
 assert.equal((await fetch(`${base}/api/track.php`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,403);
});
test('refusing analytics does not set a cookie for a new visitor',async()=>{
 const r=await fetch(`${base}/api/consent.php`,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({grant:false})});
 assert.equal(r.status,200);assert.equal(r.headers.getSetCookie().length,0);assert.deepEqual(await r.json(),{revoked:true});
});
test('authenticated report, filter, CSV and logout', {skip:base!=='http://127.0.0.1:5180'||!existsSync(demoAccess)}, async()=>{
 const password=readFileSync(demoAccess,'utf8').match(/Hasło: (.+)/)[1];
 let cookie='';
 async function request(path,options={}){
  const r=await fetch(base+path,{...options,redirect:'manual',headers:{Cookie:cookie,...options.headers}});
  const set=r.headers.getSetCookie(); if(set.length)cookie=set.map(c=>c.split(';')[0]).join('; ');
  return r;
 }
 let r=await request('/statystyki/logowanie');let html=await r.text();
 const token=html.match(/name="csrf" value="([^"]+)"/)[1];
 r=await request('/statystyki/logowanie',{method:'POST',headers:{Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({csrf:token,password})});assert.equal(r.status,303);
 r=await request('/statystyki/?from=2026-12-01&to=2026-12-10');assert.equal(r.status,200);html=await r.text();assert.match(html,/Dane demonstracyjne/);
 const logoutToken=html.match(/name="csrf" value="([^"]+)"/)[1];
 r=await request('/statystyki/eksport?from=2026-12-01&to=2026-12-10');assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/text\/csv/);assert.match(await r.text(),/DEMONSTRACYJNE/);
 r=await request('/statystyki/?from=2026-12-25&to=2026-12-01');assert.equal(r.status,400);
 r=await request('/api/logout.php',{method:'POST',headers:{Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({csrf:logoutToken})});assert.equal(r.status,303);
 r=await request('/statystyki/eksport');assert.equal(r.status,303);
});
test('public routes preserve old bookmarks, dates and report filters', async () => {
 for (const [oldPath, cleanPath] of [
  ['/index.php','/'], ['/polityka-prywatnosci.php','/prywatnosc'],
  ['/deklaracja-dostepnosci.php','/dostepnosc'], ['/dzien.php?day=7','/dzien/7'],
  ['/statystyki/login.php','/statystyki/logowanie'],
  ['/statystyki/export.php?from=2026-12-01&to=2026-12-10','/statystyki/eksport?from=2026-12-01&to=2026-12-10']
 ]) {
  const response=await fetch(base+oldPath,{redirect:'manual'});
  assert.equal(response.status,308,oldPath);
  assert.equal(new URL(response.headers.get('location'),base).href,new URL(cleanPath,base).href);
 }
 for (const path of ['/prywatnosc','/dostepnosc','/statystyki/logowanie']) assert.equal((await fetch(base+path)).status,200,path);
 const calendar=await (await fetch(base+'/api/calendar.php')).json();
 for (const day of [1,24]) {
  const result=await fetch(base+'/dzien/'+day+'?day=2');
  assert.equal(result.status,calendar.tasks[day]?200:404);
  if(calendar.tasks[day])assert.ok((await result.text()).includes(calendar.tasks[day].title));
 }
 for (const path of ['/dzien/25','/brak-strony']) assert.equal((await fetch(base+path)).status,404,path);
});
