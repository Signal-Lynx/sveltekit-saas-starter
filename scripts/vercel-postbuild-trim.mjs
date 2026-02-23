import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"

// Fail build if function exceeds this after trim (Vercel limit is ~250MB)
const MAX_FUNC_MB = 240

function exists(p) {
  try {
    fs.accessSync(p)
    return true
  } catch {
    return false
  }
}

function rmrf(p) {
  try {
    fs.rmSync(p, { recursive: true, force: true })
    return true
  } catch {
    return false
  }
}

function readText(p) {
  try {
    return fs.readFileSync(p, "utf8")
  } catch {
    return null
  }
}

function writeText(p, s) {
  try {
    fs.writeFileSync(p, s, "utf8")
    return true
  } catch {
    return false
  }
}

function findFunctionDirs(functionsRoot) {
  const out = []
  const stack = [functionsRoot]
  while (stack.length) {
    const cur = stack.pop()
    let ents = []
    try {
      ents = fs.readdirSync(cur, { withFileTypes: true })
    } catch {
      continue
    }
    for (const ent of ents) {
      if (!ent.isDirectory()) continue
      const full = path.join(cur, ent.name)
      if (ent.name.endsWith(".func")) out.push(full)
      else stack.push(full)
    }
  }
  return out
}

// --- Logging / Math Helpers ---

function dirSize(p) {
  let total = 0
  const stack = [p]
  while (stack.length) {
    const cur = stack.pop()
    let st
    try {
      st = fs.lstatSync(cur)
    } catch {
      continue
    }
    if (st.isDirectory()) {
      let ents = []
      try {
        ents = fs.readdirSync(cur, { withFileTypes: true })
      } catch {
        continue
      }
      for (const e of ents) stack.push(path.join(cur, e.name))
    } else {
      total += st.size
    }
  }
  return total
}

function bytesToMb(n) {
  return (n / (1024 * 1024)).toFixed(1) + "MB"
}

function mbToBytes(mb) {
  return mb * 1024 * 1024
}

// Reports largest top-level folders so you can SEE that 'uv' is the bloat
function reportLargestTopLevel(funcDir, topN = 15) {
  let ents = []
  try {
    ents = fs.readdirSync(funcDir, { withFileTypes: true })
  } catch {
    return
  }

  const sized = []
  for (const e of ents) {
    const full = path.join(funcDir, e.name)
    const size = dirSize(full)
    sized.push({ name: e.name, size })
  }

  sized.sort((a, b) => b.size - a.size)

  for (const item of sized.slice(0, topN)) {
    console.log(`  - ${item.name}: ${bytesToMb(item.size)}`)
  }
}

// --- Conservative Pruning ---

function pruneFunctionDir(funcDir) {
  let removed = 0

  // KILL LIST: Remove Vercel runtime layers that should not be in the bundle
  // We keep all node_modules - only removing environment/toolchain bloat

  // Exact directory names (relative to funcDir)
  const killExact = ["uv", "uv/python", "rust", ".rustup", ".cargo"]

  // Regex patterns (top-level only, skip node_modules)
  // NOTE: Keep node runtimes (node24/nodejs24/etc). Vercel uses them.
  const killRegex = [/^python/i]

  // Pass 1: Kill exact matches
  for (const rel of killExact) {
    const target = path.join(funcDir, rel)
    if (exists(target) && rmrf(target)) {
      console.log(`[postbuild-trim] killed: ${rel}`)
      removed++
    }
  }

  // Pass 2: Kill by regex (top-level only, skip node_modules)
  let ents = []
  try {
    ents = fs.readdirSync(funcDir, { withFileTypes: true })
  } catch {
    return removed
  }

  for (const e of ents) {
    if (!e.isDirectory()) continue
    if (e.name === "node_modules") continue // Safety: never touch node_modules

    if (killRegex.some((re) => re.test(e.name))) {
      const target = path.join(funcDir, e.name)
      if (exists(target) && rmrf(target)) {
        console.log(`[postbuild-trim] killed: ${e.name}`)
        removed++
      }
    }
  }

  return removed
}

// --- Tailwind 4 / SvelteKit stylesheet module patch ---
//
// Problem: SvelteKit emits stylesheet JS modules like:
//   return `...`
// Tailwind CSS contains escapes like \32 (for leading-digit class names) and \:
// In JS template literals, sequences like \32 (octal) or \: (invalid escape) can throw SyntaxError.
//
// Fix: rewrite the template literal to a safe JS expression using JSON.stringify() for literal
// chunks, preserving any ${...} interpolations by converting them to concatenation.
// This avoids invalid template-literal escape parsing entirely.

function _splitTemplateBodyPreserveInterpolations(body) {
  // Splits template literal body into [{t:"text",v:string},{t:"expr",v:string},...]
  // Only recognizes ${...} and preserves expression text verbatim.
  const parts = []
  let buf = ""

  for (let i = 0; i < body.length; i++) {
    const ch = body[i]

    // Treat "\${" as literal "${" (escaped), not an interpolation start.
    if (ch === "$" && body[i + 1] === "{" && body[i - 1] !== "\\") {
      // flush text
      parts.push({ t: "text", v: buf })
      buf = ""
      i += 2 // skip "${"

      const exprStart = i
      let depth = 1

      for (; i < body.length; i++) {
        const c = body[i]
        if (c === "{") depth++
        else if (c === "}") {
          depth--
          if (depth === 0) break
        }
      }

      if (depth !== 0) return null // unterminated ${...}

      const expr = body.slice(exprStart, i).trim()
      parts.push({ t: "expr", v: expr })
      // loop will i++ and continue
      continue
    }

    buf += ch
  }

  parts.push({ t: "text", v: buf })
  return parts
}

// Valid single-char JS escape sequences (after the backslash).
// Any backslash NOT followed by one of these is an illegal escape in strict ESM.
const VALID_JS_ESCAPES = new Set([
  "\\",
  '"',
  "'",
  "`",
  "n",
  "r",
  "t",
  "b",
  "f",
  "v",
  "0",
  "u",
  "x",
  "$",
  "\n",
  "\r",
])

function _fixIllegalEscapes(str) {
  // Double any backslash that is not part of a recognized JS escape sequence.
  // This makes the string safe to use as a JS string literal value.
  let out = ""
  for (let i = 0; i < str.length; i++) {
    const ch = str[i]
    if (ch === "\\") {
      const next = str[i + 1]
      if (next === undefined || !VALID_JS_ESCAPES.has(next)) {
        // Illegal escape: double the backslash so \32 becomes \\32 in source
        out += "\\\\"
      } else {
        out += ch
      }
    } else {
      out += ch
    }
  }
  return out
}

function _extractDoubleQuotedString(s, startQuoteIdx) {
  // Walk forward from the character AFTER the opening quote.
  // Return index of the closing quote, or -1 if unterminated.
  let i = startQuoteIdx + 1
  while (i < s.length) {
    const ch = s[i]
    if (ch === "\\") {
      i += 2 // skip escaped char (even if the escape itself is illegal — we just skip)
      continue
    }
    if (ch === '"') return i
    i++
  }
  return -1
}

function firstExisting(paths) {
  for (const p of paths) {
    if (p && exists(p)) return p
  }
  return null
}

function patchCssJsModuleFile(filePath) {
  const s = readText(filePath)
  if (s == null) return { changed: false, reason: "read-failed" }

  // Only handle the SvelteKit stylesheet-function modules that use return `...`
  const hasTemplateReturn =
    /export\s+default\s+function\s+css\([^)]*\)\s*\{[\s\S]*?return\s*`/m.test(s)
  if (!hasTemplateReturn)
    return { changed: false, reason: "no-return-template" }

  // If there are interpolations, bail - we'd need a smarter rewrite
  if (s.includes("${")) return { changed: false, reason: "has-interpolation" }

  // The file starts with a comment naming the CSS asset, e.g. "// app.DFX7M8Tw.css"
  const nameMatch = /^\/\/\s*(\S+\.css)\s*$/m.exec(s)
  if (!nameMatch) return { changed: false, reason: "no-css-name-comment" }

  const cssFileName = nameMatch[1]

  // .css.js lives in: .../server/stylesheets/
  // CSS asset lives in: .../server/_app/immutable/assets/
  const candidates = [
    // Most reliable on Vercel after adapter-vercel:
    path.join(
      process.cwd(),
      ".vercel",
      "output",
      "static",
      "_app",
      "immutable",
      "assets",
      cssFileName,
    ),

    // Local / pre-adapter fallback:
    path.join(
      process.cwd(),
      ".svelte-kit",
      "output",
      "client",
      "_app",
      "immutable",
      "assets",
      cssFileName,
    ),

    // Sometimes present:
    path.join(
      process.cwd(),
      ".svelte-kit",
      "output",
      "server",
      "_app",
      "immutable",
      "assets",
      cssFileName,
    ),

    // In-bundle guesses (if assets were copied into the func):
    path.join(
      path.dirname(filePath),
      "..",
      "_app",
      "immutable",
      "assets",
      cssFileName,
    ),
    path.join(
      path.dirname(filePath),
      "..",
      "..",
      "client",
      "_app",
      "immutable",
      "assets",
      cssFileName,
    ),
  ]

  const hit = firstExisting(candidates)
  if (!hit) {
    console.log(
      `[postbuild-trim] css-asset-not-found name=${cssFileName} candidates=${JSON.stringify(candidates)}`,
    )
    return { changed: false, reason: `css-file-not-found:${cssFileName}` }
  }

  console.log(`[postbuild-trim] css-asset-hit name=${cssFileName} path=${hit}`)

  const css = readText(hit)
  if (css == null)
    return { changed: false, reason: `css-file-read-failed:${cssFileName}` }

  // JSON.stringify on the CSS string value (not source text) is guaranteed valid JS.
  // Handles backticks, backslashes, \32, \:, quotes - everything.
  const cssLiteral = JSON.stringify(css)

  // Rebuild the module in a minimal, safe form
  const patched =
    `// ${cssFileName}\n` +
    `export default function css(assets, base) { return ${cssLiteral}; }\n`

  const ok = writeText(filePath, patched)
  return { changed: ok, reason: ok ? "patched-json" : "write-failed" }
}

function findFilesRecursive(rootDir, filterFn) {
  const out = []
  const stack = [rootDir]

  while (stack.length) {
    const cur = stack.pop()
    let ents = []
    try {
      ents = fs.readdirSync(cur, { withFileTypes: true })
    } catch {
      continue
    }

    for (const e of ents) {
      const full = path.join(cur, e.name)
      if (e.isDirectory()) stack.push(full)
      else if (e.isFile() && filterFn(full)) out.push(full)
    }
  }

  return out
}

function patchStylesheetModulesInsideFunc(funcDir) {
  // This is the exact subtree shown in your failure path.
  const serverRoot = path.join(
    funcDir,
    "vercel",
    "path0",
    ".svelte-kit",
    "output",
    "server",
  )
  if (!exists(serverRoot)) return { patched: 0, inspected: 0 }

  const targets = findFilesRecursive(serverRoot, (p) => p.endsWith(".css.js"))
  let patched = 0
  const reasons = {}

  for (const f of targets) {
    const s = readText(f)
    const snip = s ? JSON.stringify(s.slice(0, 120)) : "null"
    console.log(
      `[postbuild-trim] css-js-inspect file=${path.basename(f)} len=${s ? s.length : 0} head=${snip}`,
    )
    const res = patchCssJsModuleFile(f)
    console.log(
      `[postbuild-trim] css-js-patch file=${path.basename(f)} reason=${res.reason} changed=${res.changed}`,
    )
    reasons[res.reason] = (reasons[res.reason] || 0) + 1
    if (res.changed) patched++
  }

  if (patched !== targets.length) {
    console.log(
      `[postbuild-trim] stylesheet-patch reasons: ${JSON.stringify(reasons)}`,
    )
  }

  return { patched, inspected: targets.length }
}

// --- Syntax scan (fail fast with filename) ---

function syntaxScanBuiltServerModules(funcDir) {
  const serverRoot = path.join(
    funcDir,
    "vercel",
    "path0",
    ".svelte-kit",
    "output",
    "server",
  )
  if (!exists(serverRoot)) {
    return { ok: true, reason: "no-server-root" }
  }

  const jsModules = findFilesRecursive(serverRoot, (p) => p.endsWith(".js"))
  const nodeVer = process.version

  console.log(
    `[postbuild-trim] syntax-scan: Node=${nodeVer} checking ${jsModules.length} built server modules`,
  )

  for (const f of jsModules) {
    // Node ESM parsing check. "--check" validates syntax without executing.
    const r = spawnSync(process.execPath, ["--check", f], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    })

    if (r.status !== 0) {
      const stderr = r.stderr || ""
      const idx = stderr.lastIndexOf("SyntaxError")
      const msg =
        idx >= 0
          ? stderr.slice(Math.max(0, idx - 100), idx + 3000)
          : stderr.slice(-3000)
      console.error("[postbuild-trim] syntax-scan FAILED")
      console.error(`  file: ${f}`)
      console.error("  stderr-extract:", msg.trim() || "(no stderr)")
      return { ok: false, file: f, stderr }
    }
  }

  return { ok: true }
}

function main() {
  const ts = new Date().toISOString()
  console.log(`[postbuild-trim] start: ${ts}`)

  const functionsRoot = path.join(
    process.cwd(),
    ".vercel",
    "output",
    "functions",
  )
  if (!exists(functionsRoot)) {
    console.log("[postbuild-trim] no .vercel/output/functions found (skipping)")
    return
  }

  const funcDirs = findFunctionDirs(functionsRoot)
  let totalRemoved = 0
  let buildFailed = false

  for (const dir of funcDirs) {
    const before = dirSize(dir)
    console.log(
      `[postbuild-trim] ${path.basename(dir)} BEFORE trim: ${bytesToMb(before)}`,
    )

    reportLargestTopLevel(dir)

    const removedCount = pruneFunctionDir(dir)
    totalRemoved += removedCount

    const after = dirSize(dir)
    console.log(
      `[postbuild-trim] ${path.basename(dir)} AFTER trim: ${bytesToMb(after)}`,
    )

    // Tailwind/SvelteKit stylesheet escape patch (INSIDE THE FUNC BUNDLE)
    const { patched, inspected } = patchStylesheetModulesInsideFunc(dir)
    console.log(
      `[postbuild-trim] stylesheet-patch: inspected=${inspected} patched=${patched}`,
    )

    // Safety check: Fail build if still oversized
    if (after > mbToBytes(MAX_FUNC_MB)) {
      console.error(
        `[postbuild-trim] ERROR: ${path.basename(dir)} is ${bytesToMb(after)}, ` +
          `exceeds ${MAX_FUNC_MB}MB limit. Build must fail.`,
      )
      buildFailed = true
    }

    // Now syntax scan (after patch), so we fail with the exact filename if anything is still unparseable
    const scan = syntaxScanBuiltServerModules(dir)
    if (!scan.ok) buildFailed = true
  }

  console.log(
    `[postbuild-trim] scanned=${funcDirs.length} removed_targets=${totalRemoved}`,
  )
  console.log(`[postbuild-trim] done.`)

  if (buildFailed) {
    console.error(
      `[postbuild-trim] BUILD FAILED: one or more functions failed validation.`,
    )
    process.exit(1)
  }
}

main()
