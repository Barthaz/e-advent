import { cpSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const target=resolve('dist/soa');
if(existsSync(target))rmSync(target,{recursive:true});
mkdirSync(target,{recursive:true});
for(const dir of ['public','database','docs'])cpSync(dir,join(target,dir),{recursive:true});
mkdirSync(join(target,'private/storage'),{recursive:true});
for(const file of ['config.php','config.example.php','bootstrap.php','tasks.php','calendar.php','auth.php','db.php','statistics.php','views']){
  cpSync(join('private',file),join(target,'private',file),{recursive:true});
}
cpSync('README.md',join(target,'README.md'));
mkdirSync(join(target,'scripts'),{recursive:true});
for(const file of ['set-password.php','preflight.php'])cpSync(join('scripts',file),join(target,'scripts',file));
console.log('Gotowe: dist/soa. Document root: dist/soa/public. Sekrety, demo-access i logi nie weszły do paczki.');
