#!/usr/bin/env node

/*
  Translation updater CLI

  Usage examples:
  - Copy value of a key from en to all languages (dry run):
    node scripts/update-translations.js --key 5chan_description --from en --dry

  - Set a specific value for all languages (including en):
    node scripts/update-translations.js --key no_global_rules_info --value "Your value" --include-en --write

  - Use a mapping file with per-language values (JSON object of { langCode: value, ... }):
    node scripts/update-translations.js --key my_key --map ./path/to/map.json --write

  - Delete a key from all languages (dry run):
    node scripts/update-translations.js --key obsolete_key --delete --dry

  - Delete a key from all languages (actually delete):
    node scripts/update-translations.js --key obsolete_key --delete --write

  Flags:
    --key <name>                 Required. The translation key to update/delete.
    --delete                     Delete the key from all languages instead of updating.
    --from <lang>                Source language to read value from if --value/--map are not provided (default: en).
    --value <string>             Literal value to set for targets (use with caution, no auto-translate).
    --map <file>                 JSON file mapping of { langCode: string } to set per language.
    --only <langs>               Comma-separated list of language codes to update (e.g. "es,fr,it").
    --exclude <langs>            Comma-separated list of language codes to skip.
    --include-en                 Include the source language (e.g. en) in updates.
    --dry|--dry-run              Show changes but do not write files (default).
    --write                      Actually write the files.
*/

import fs from 'fs/promises'
import path from 'path'

function parseArgs(argv) {
  const out = { flags: new Set() }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const next = i + 1 < argv.length ? argv[i + 1] : undefined
    if (arg.startsWith('--')) {
      if (['--dry', '--dry-run', '--write', '--include-en', '--delete'].includes(arg)) {
        out.flags.add(arg)
        continue
      }
      const key = arg
      let value
      if (next && !next.startsWith('--')) {
        value = next
        i++
      }
      out[key] = value ?? ''
    }
  }
  return out
}

function usage(exitCode = 1, msg) {
  if (msg) console.error(msg)
  console.error(
    'Usage: node scripts/update-translations.js --key <name> [--delete] [--from <lang>] [--value <string> | --map <file>] [--only <langs>] [--exclude <langs>] [--include-en] [--dry|--write]'
  )
  process.exit(exitCode)
}

async function fileExists(p) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

function parseCsv(val) {
  if (!val) return new Set()
  return new Set(
    val
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  )
}

async function loadJson(filePath) {
  const text = await fs.readFile(filePath, 'utf8')
  try {
    return JSON.parse(text)
  } catch (err) {
    throw new Error(`Failed to parse JSON: ${filePath}: ${err.message}`)
  }
}

async function writeJson(filePath, data) {
  const json = JSON.stringify(data, null, 2) + '\n'
  await fs.writeFile(filePath, json, 'utf8')
}

async function handleDelete(key, translationsRoot, only, exclude, dryRun, write) {
  const dirents = await fs.readdir(translationsRoot, { withFileTypes: true })
  const langs = dirents.filter((d) => d.isDirectory()).map((d) => d.name)

  const planned = []

  for (const lang of langs) {
    if (only.size && !only.has(lang)) continue
    if (exclude.size && exclude.has(lang)) continue

    const filePath = path.join(translationsRoot, lang, 'default.json')
    if (!(await fileExists(filePath))) continue

    const json = await loadJson(filePath)

    if (!Object.prototype.hasOwnProperty.call(json, key)) {
      // Key does not exist in this language, skip
      continue
    }

    const prevVal = json[key]
    planned.push({ lang, filePath, prevVal, json })
  }

  if (!planned.length) {
    console.log('No changes planned.')
    return
  }

  for (const change of planned) {
    const { lang, filePath, prevVal } = change
    const prevPreview = typeof prevVal === 'undefined' ? '<missing>' : String(prevVal).substring(0, 60)
    console.log(`[${lang}] ${key}:`)
    console.log(`  - deleted: ${prevPreview}${String(prevVal).length > 60 ? '...' : ''}`)
    if (!dryRun) {
      delete change.json[key]
      await writeJson(filePath, change.json)
    }
  }

  if (dryRun) {
    console.log(`\nDry run complete. ${planned.length} file(s) would change. Re-run with --write to apply.`)
  } else if (write) {
    console.log(`\nWrote ${planned.length} file(s).`)
  }
}

async function handleUpdate(key, translationsRoot, fromLang, includeEn, only, exclude, literalValue, mapFile, map, dryRun, write) {
  let sourceValue = undefined
  if (!literalValue && !map) {
    // default to --from
    const srcPath = path.join(translationsRoot, fromLang, 'default.json')
    if (!(await fileExists(srcPath))) usage(1, `Source file not found for --from ${fromLang}: ${srcPath}`)
    const srcJson = await loadJson(srcPath)
    sourceValue = srcJson[key]
    if (typeof sourceValue === 'undefined') usage(1, `Key "${key}" not found in source language ${fromLang}`)
  }

  const dirents = await fs.readdir(translationsRoot, { withFileTypes: true })
  const langs = dirents.filter((d) => d.isDirectory()).map((d) => d.name)

  const planned = []

  for (const lang of langs) {
    if (!includeEn && lang === fromLang) continue
    if (only.size && !only.has(lang)) continue
    if (exclude.size && exclude.has(lang)) continue

    const filePath = path.join(translationsRoot, lang, 'default.json')
    if (!(await fileExists(filePath))) continue

    const json = await loadJson(filePath)

    let nextVal
    if (map && Object.prototype.hasOwnProperty.call(map, lang)) {
      nextVal = map[lang]
    } else if (typeof literalValue !== 'undefined') {
      nextVal = literalValue
    } else {
      nextVal = sourceValue
    }

    if (typeof nextVal === 'undefined') {
      // No value for this lang in the chosen mode; skip
      continue
    }

    const prevVal = json[key]
    if (prevVal === nextVal) continue

    planned.push({ lang, filePath, prevVal, nextVal, json })
  }

  if (!planned.length) {
    console.log('No changes planned.')
    return
  }

  for (const change of planned) {
    const { lang, filePath, prevVal, nextVal } = change
    const prevPreview = typeof prevVal === 'undefined' ? '<missing>' : String(prevVal).substring(0, 60)
    const nextPreview = String(nextVal).substring(0, 60)
    console.log(`[${lang}] ${key}:`)
    console.log(`  - from: ${prevPreview}${String(prevVal).length > 60 ? '...' : ''}`)
    console.log(`  + to  : ${nextPreview}${String(nextVal).length > 60 ? '...' : ''}`)
    if (!dryRun) {
      change.json[key] = nextVal
      await writeJson(filePath, change.json)
    }
  }

  if (dryRun) {
    console.log(`\nDry run complete. ${planned.length} file(s) would change. Re-run with --write to apply.`)
  } else if (write) {
    console.log(`\nWrote ${planned.length} file(s).`)
  }
}

async function main() {
  const argv = process.argv.slice(2)
  const args = parseArgs(argv)

  const key = args['--key']
  if (!key) usage(1, 'Missing required --key')

  const translationsRoot = path.join(process.cwd(), 'public', 'translations')
  if (!(await fileExists(translationsRoot))) {
    usage(1, `Translations directory not found: ${translationsRoot}`)
  }

  const isDelete = args.flags.has('--delete')
  const fromLang = args['--from'] || 'en'
  const includeEn = args.flags.has('--include-en')
  const dryRun = args.flags.has('--dry') || args.flags.has('--dry-run') || !args.flags.has('--write')
  const write = args.flags.has('--write')
  const only = parseCsv(args['--only'])
  const exclude = parseCsv(args['--exclude'])

  if (isDelete) {
    // Delete mode
    await handleDelete(key, translationsRoot, only, exclude, dryRun, write)
  } else {
    // Update mode
    let literalValue = args['--value']
    let mapFile = args['--map']
    let map = undefined

    if (mapFile) {
      const absMap = path.isAbsolute(mapFile) ? mapFile : path.join(process.cwd(), mapFile)
      if (!(await fileExists(absMap))) usage(1, `--map not found: ${absMap}`)
      map = await loadJson(absMap)
      if (typeof map !== 'object' || map === null) usage(1, '--map must be a JSON object of { lang: value }')
    }

    await handleUpdate(key, translationsRoot, fromLang, includeEn, only, exclude, literalValue, mapFile, map, dryRun, write)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})



