import { build } from 'esbuild'
import { writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
const target = resolve(process.argv[2] || 'operations-preview.html')
const result = await build({ entryPoints: ['scripts/operations-preview.jsx'], bundle: true, write: false, outfile: 'preview.js', minify: true, platform: 'browser', format: 'iife', define: { 'process.env.NODE_ENV': '"production"' } })
const js = result.outputFiles.find(f => f.path.endsWith('.js')).text.replace(/<\/script/gi, '<\\/script')
const css = result.outputFiles.find(f => f.path.endsWith('.css'))?.text || ''
await mkdir(dirname(target), { recursive: true })
await writeFile(target, `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Park Street | معاينة متابعة التشغيل</title><style>body{background:#060d1a;margin:0;padding:24px;color:#eee}#root{max-width:1400px;margin:auto}${css}</style></head><body><div id="root"></div><script>${js}</script></body></html>`)
console.log(target)
