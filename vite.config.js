import { defineConfig } from 'vite';
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, resolve } from 'node:path';

// مسیر نسبی: روی ریشه‌ی دامنه و روی مسیر مخزن (مثل /bundle-6/) بدون تغییر کار می‌کند.
const BASE = './';

function listFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? listFiles(p) : [p];
  });
}

// بعد از Build، فهرست فایل‌های کش آفلاین و نسخه‌ی کش را داخل sw.js می‌نویسد.
function precacheServiceWorker() {
  let outDir;
  return {
    name: 'precache-service-worker',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const swPath = join(outDir, 'sw.js');
      const files = listFiles(outDir)
        .filter((f) => f !== swPath && !f.endsWith('.map'))
        .map((f) => relative(outDir, f).split('\\').join('/'))
        .sort();
      const hash = createHash('sha256');
      files.forEach((f) => hash.update(f).update(readFileSync(join(outDir, f))));
      const version = hash.digest('hex').slice(0, 12);
      const list = ['./', ...files].map((f) => `./${f === './' ? '' : f}`);
      const sw = readFileSync(swPath, 'utf8')
        .replace('__BUILD_VERSION__', version)
        .replace(/\/\*PRECACHE\*\/\[\]\/\*END\*\//, JSON.stringify(list));
      writeFileSync(swPath, sw);
    },
  };
}

export default defineConfig({
  base: BASE,
  plugins: [precacheServiceWorker()],
  build: { target: 'es2020', sourcemap: false },
});
