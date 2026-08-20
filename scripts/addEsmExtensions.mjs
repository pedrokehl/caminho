/**
 * Node's ESM loader requires fully-specified relative imports (`./from.js`, not `./from`),
 * but the TypeScript compiler never rewrites import specifiers. This script appends the
 * `.js` extension to every relative import/export in the compiled ESM output, so the
 * source files can stay extensionless.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const targetDir = process.argv[2] ?? 'dist/esm'

const RELATIVE_SPECIFIER = /(from\s+['"])(\.\.?\/[^'"]+?)(['"])/g

function addExtension(match, prefix, specifier, suffix) {
  return specifier.endsWith('.js') ? match : `${prefix}${specifier}.js${suffix}`
}

function processFile(filePath) {
  const source = readFileSync(filePath, 'utf8')
  const updated = source.replace(RELATIVE_SPECIFIER, addExtension)
  if (updated !== source) {
    writeFileSync(filePath, updated)
  }
}

function walk(dirPath) {
  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = join(dirPath, entry.name)
    if (entry.isDirectory()) {
      walk(fullPath)
    } else if (entry.name.endsWith('.js')) {
      processFile(fullPath)
    }
  }
}

walk(targetDir)
