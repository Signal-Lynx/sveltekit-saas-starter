import fs from "node:fs"
import path from "node:path"

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

// --- The Meat: Conservative Pruning ---

function pruneFunctionDir(funcDir) {
  let removed = 0

  // KILL LIST: Remove Vercel runtime layers that should not be in the bundle
  // We keep all node_modules - only removing environment/toolchain bloat

  // 1. Exact directory names
  const killExact = ["uv", "uv/python", "rust", ".rustup", ".cargo"]

  // 2. Regex patterns (node24, nodejs24, etc.)
  const killRegex = [/^node\d+$/i, /^python/i]

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

    // Log what is taking up space before we delete it
    reportLargestTopLevel(dir)

    const removedCount = pruneFunctionDir(dir)
    totalRemoved += removedCount

    const after = dirSize(dir)
    console.log(
      `[postbuild-trim] ${path.basename(dir)} AFTER trim: ${bytesToMb(after)}`,
    )

    // Safety check: Fail build if still oversized
    if (after > mbToBytes(MAX_FUNC_MB)) {
      console.error(
        `[postbuild-trim] ERROR: ${path.basename(dir)} is ${bytesToMb(after)}, ` +
          `exceeds ${MAX_FUNC_MB}MB limit. Build must fail.`,
      )
      buildFailed = true
    }
  }

  console.log(
    `[postbuild-trim] scanned=${funcDirs.length} removed_targets=${totalRemoved}`,
  )
  console.log(`[postbuild-trim] done.`)

  if (buildFailed) {
    console.error(
      `[postbuild-trim] BUILD FAILED: One or more functions exceed size limit.`,
    )
    process.exit(1)
  }
}

main()
