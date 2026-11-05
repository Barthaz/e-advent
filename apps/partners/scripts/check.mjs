import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));
function files(dir) { return readdirSync(dir,{withFileTypes:true}).flatMap(f => f.isDirectory() ? (f.name === 'storage' ? [] : files(`${dir}/${f.name}`)) : [`${dir}/${f.name}`]); }
for (const file of ['public','private','scripts','tests'].flatMap(files).filter(f=>f.endsWith('.php'))) {
  const result=spawnSync(process.execPath,['scripts/php.mjs','-l',file],{encoding:'utf8'});
  if(result.status!==0){console.error(result.stdout,result.stderr);process.exit(1);}
}
for(const file of files('public/assets/js').filter(f=>/\.(js|mjs)$/.test(f))){const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(r.status!==0){console.error(r.stderr);process.exit(1);}}
console.log('Składnia PHP i JS: OK');
