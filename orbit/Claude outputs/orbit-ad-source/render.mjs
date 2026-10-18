import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
const RATE = +(process.env.RATE || 48), DUR = +(process.env.DUR || 30), N = RATE * DUR;
const start = +(process.env.START || 0), end = +(process.env.END || N);
const out = process.env.OUT || `frames_${RATE}.mkv`;
const browser = await chromium.launch({ args: ['--font-render-hinting=none','--disable-lcd-text'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('PAGEERROR', e.message));
await page.goto('file:///home/claude/orbit-ad/'+(process.env.FILM||'film.html')+'');
await page.evaluate(() => window.ready);
// lossless intermediate (FFV1) so the final encode happens once
const ff = spawn('ffmpeg', ['-y','-loglevel','error','-f','image2pipe','-framerate',String(RATE),'-c:v','png','-i','-','-c:v','ffv1','-level','3','-pix_fmt','yuv444p',out], { stdio: ['pipe','inherit','inherit'] });
const t0 = Date.now();
for (let i = start; i < end; i++) {
  const t = i / RATE;
  await page.evaluate(t => window.render(t), t);
  const buf = await page.screenshot({ type: 'png' });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (i % 120 === 0) console.log(`frame ${i}/${end} ${((Date.now()-t0)/1000).toFixed(0)}s`);
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await browser.close();
console.log('done', ((Date.now()-t0)/1000).toFixed(0)+'s');
