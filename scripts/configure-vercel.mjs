// Values enter through hidden stdin and go directly to the Vercel CLI's stdin.
// This helper never writes values to files or command-line arguments.
import { spawn } from 'node:child_process';

if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.setEncoding('utf8');
process.stdin.resume();
console.log('Ready for environment JSON on hidden stdin.');
const input = await new Promise((resolve, reject) => {
  let buffer = '';
  process.stdin.on('data', chunk => {
    buffer += chunk;
    if (buffer.includes('\u0003')) reject(new Error('Cancelled'));
    const end = buffer.search(/[\r\n]/);
    if (end !== -1) resolve(buffer.slice(0, end));
  });
});
if (process.stdin.isTTY) process.stdin.setRawMode(false);
process.stdin.pause();
try {
  const entries = JSON.parse(input);
  for (const { name, value } of entries) {
    if (!/^[A-Z][A-Z0-9_]+$/.test(name) || typeof value !== 'string' || !value || /[\r\n\0]/.test(value)) throw new Error('Invalid environment input');
    const visibility = name.startsWith('NEXT_PUBLIC_') ? '--no-sensitive' : '--sensitive';
    const command = `npx.cmd --yes vercel@65.11.0 env add ${name} --environment production,preview ${visibility} --yes --force --no-color`;
    const child = spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', command], { cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    let diagnostics = '';
    child.stdout.resume(); child.stderr.on('data', chunk => { diagnostics += chunk.toString(); });
    child.stdin.end(value);
    const exit = await new Promise((resolve, reject) => { child.on('error', reject); child.on('close', resolve); });
    if (exit !== 0) {
      console.error(diagnostics.replaceAll(value, '[hidden]').slice(-1200));
      throw new Error(`Could not configure ${name}`);
    }
    console.log(`Configured ${name}`);
  }
} catch { console.error('Environment configuration failed; no values were logged.'); process.exitCode = 1; }
