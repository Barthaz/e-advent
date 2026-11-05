import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const local = fileURLToPath(new URL('../.runtime/php/php.exe', import.meta.url));
const command = process.env.PHP_BIN || (existsSync(local) ? local : 'php');
const child = spawn(command, process.argv.slice(2), { stdio: 'inherit', cwd: fileURLToPath(new URL('..', import.meta.url)) });
child.on('error', () => { console.error('Zainstaluj PHP 8.2+ albo ustaw PHP_BIN na ścieżkę interpretera.'); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
