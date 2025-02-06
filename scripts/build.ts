import { build } from 'esbuild'
import pkg from '../package.json'

build({
  entryPoints: ['src/index.ts'],
  outdir: 'dist',
  platform: 'node',
  target: 'node22',
  format: 'esm',
  bundle: true,
  minify: true,
  external: Object.keys(pkg.dependencies),
})
