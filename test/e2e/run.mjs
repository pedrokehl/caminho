/**
 * End-to-end packaging test.
 *
 * Builds the package, packs it with `npm pack` (which applies the `files` allowlist),
 * installs the tarball into a scratch project, and then consumes it exactly like a user:
 * - require('caminho') from a CommonJS consumer
 * - import 'caminho' from an ESM consumer
 * - tsc type resolution under nodenext for both an .mts and a .cts consumer
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const e2eDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(e2eDir, '..', '..')

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: ['ignore', 'inherit', 'inherit'], ...options })
  if (result.status !== 0) {
    console.error(`\nE2E FAILED at: ${command} ${args.join(' ')}`)
    process.exit(result.status ?? 1)
  }
  return result
}

function packTarball(destination) {
  const result = spawnSync('npm', ['pack', '--pack-destination', destination], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  if (result.status !== 0) {
    console.error('\nE2E FAILED at: npm pack')
    process.exit(result.status ?? 1)
  }
  const tarballName = result.stdout.toString().trim().split('\n').pop()
  return path.join(destination, tarballName)
}

function setupScratchProject(tmpDir, tarballPath) {
  const scratchDir = path.join(tmpDir, 'app')
  const nodeModules = path.join(scratchDir, 'node_modules')
  fs.mkdirSync(nodeModules, { recursive: true })

  run('tar', ['xzf', tarballPath, '-C', tmpDir])
  fs.renameSync(path.join(tmpDir, 'package'), path.join(nodeModules, 'caminho'))

  // the package's only runtime dependencies, reused from the repo instead of hitting the registry
  for (const dependency of ['rxjs', 'tslib']) {
    fs.symlinkSync(path.join(repoRoot, 'node_modules', dependency), path.join(nodeModules, dependency), 'dir')
  }

  for (const consumer of ['consumer.cjs', 'consumer.mjs']) {
    fs.copyFileSync(path.join(e2eDir, consumer), path.join(scratchDir, consumer))
  }
  // the same typed consumer must compile as an ES module and as a CommonJS module
  for (const extension of ['mts', 'cts']) {
    fs.copyFileSync(path.join(e2eDir, 'consumer-types.ts'), path.join(scratchDir, `consumer-types.${extension}`))
  }
  return scratchDir
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'caminho-e2e-'))
try {
  console.log('e2e: building')
  run('npm', ['run', 'build'], { cwd: repoRoot })

  console.log('e2e: packing')
  const tarballPath = packTarball(tmpDir)
  const scratchDir = setupScratchProject(tmpDir, tarballPath)

  console.log('e2e: running CJS consumer')
  run('node', ['consumer.cjs'], { cwd: scratchDir })

  console.log('e2e: running ESM consumer')
  run('node', ['consumer.mjs'], { cwd: scratchDir })

  console.log('e2e: type-checking nodenext consumers (.mts and .cts)')
  const tscBin = path.join(repoRoot, 'node_modules', '.bin', 'tsc')
  run(tscBin, [
    '--noEmit', '--strict', '--skipLibCheck',
    '--module', 'nodenext', '--moduleResolution', 'nodenext',
    'consumer-types.mts', 'consumer-types.cts',
  ], { cwd: scratchDir })

  console.log('e2e: OK')
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true })
}
