import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const sitesRoot = resolve(projectRoot, "src/sites")
const appRoot = resolve(projectRoot, "app")
const srcRoot = resolve(projectRoot, "src")

const overrides = {
    "public/landing.tsx": "/",
    "auth/login.tsx": "/login",
    "auth/register.tsx": "/register",
    "auth/callback.tsx": "/callback",
}

async function tsxFiles(dir) {
    const out = []
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name)
        if (entry.isDirectory()) out.push(...await tsxFiles(path))
        else if (entry.name.endsWith(".tsx")) out.push(path)
    }
    return out
}

function routeSegmentsFromPath(routePath) {
    return routePath.split("/").filter(Boolean)
}

function targetFile(routePath) {
    const segments = routeSegmentsFromPath(routePath)
    return segments.length === 0
        ? resolve(appRoot, "page.tsx")
        : resolve(appRoot, ...segments, "page.tsx")
}

function toAliasImport(specifier, fromDir) {
    if (!specifier.startsWith(".")) return specifier
    const absolute = resolve(fromDir, specifier)
    const withoutExt = absolute.replace(/\.tsx?$/, "")
    const relativeToSrc = relative(srcRoot, withoutExt).split("\\").join("/")
    return `@/${relativeToSrc}`
}

function rewriteImports(source, fromDir) {
    return source.replace(
        /((?:from|import)\s+["'])(\.[^"']*)(["'])/g,
        (_match, prefix, specifier, suffix) => `${prefix}${toAliasImport(specifier, fromDir)}${suffix}`,
    )
}

const files = await tsxFiles(sitesRoot)
const routeMap = []

for (const file of files) {
    const relPath = relative(sitesRoot, file).split("\\").join("/")
    const source = await readFile(file, "utf8")

    let routePath = overrides[relPath]
    if (routePath === undefined) {
        const match = source.match(/export const pagePath = "([^"]+)"/)
        if (!match) {
            console.warn(`Skipping ${relPath}: no pagePath found`)
            continue
        }
        routePath = match[1]
    }

    const fromDir = dirname(file)
    let transformed = rewriteImports(source, fromDir)
    transformed = transformed.replace(/^export default function (\w+)/m, "export default function Page")
    if (!transformed.startsWith('"use client"')) {
        transformed = `"use client"\n\n${transformed}`
    }

    const outFile = targetFile(routePath)
    await mkdir(dirname(outFile), { recursive: true })
    await writeFile(outFile, transformed)
    routeMap.push({ file: relPath, routePath, outFile: relative(projectRoot, outFile) })
}

await writeFile(
    resolve(projectRoot, "scripts/.migration-report.json"),
    JSON.stringify(routeMap, null, 2),
)

console.log(`Migrated ${routeMap.length} pages.`)
