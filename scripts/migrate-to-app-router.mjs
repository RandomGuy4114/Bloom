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

// Routes with a hand-written page.tsx (server data-fetching) — the codemod
// still regenerates their page-client.tsx from src/sites, but never touches
// page.tsx itself.
const dynamicRoutes = new Set([
    "/pages/communities/community/",
    "/pages/communities/sub-community/",
])

const siteUrl = "https://www.trybloom.org"

const seoMetadata = {
    "/": {
        title: "The Bloom Project™ — Making local connections easier",
        description: "Bloom helps you discover local communities, events, and businesses near you, and makes it easy to connect with the people around you.",
    },
    "/login": {
        title: "Login",
        description: "Log in to Bloom to connect with local communities, events, and businesses near you.",
    },
    "/register": {
        title: "Register",
        description: "Create a Bloom account to start connecting with local communities, events, and businesses near you.",
    },
    "/pages/legal/community-guidelines/": {
        title: "Community Guidelines",
        description: "Read The Bloom Project's community guidelines.",
    },
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

    let seo = seoMetadata[routePath]
    if (!seo) {
        const metadataBlock = source.match(/const pageMetadata = \{([\s\S]*?)\n\}/)?.[1] ?? ""
        const titleMatch = metadataBlock.match(/["']?title["']?\s*:\s*"([^"]*)"/)
        if (titleMatch) {
            seo = {
                title: titleMatch[1],
                description: "Bloom helps you discover local communities, events, and businesses near you, and makes it easy to connect with the people around you.",
            }
        }
    }
    const outFile = targetFile(routePath)
    await mkdir(dirname(outFile), { recursive: true })
    const isDynamic = dynamicRoutes.has(routePath)

    if (isDynamic) {
        transformed = transformed.replace(/^export default function (\w+)/m, "export default function PageClient")
        if (!transformed.startsWith('"use client"')) {
            transformed = `"use client"\n\n${transformed}`
        }
        const clientFile = resolve(dirname(outFile), "page-client.tsx")
        await writeFile(clientFile, transformed)
        routeMap.push({ file: relPath, routePath, outFile: relative(projectRoot, clientFile), note: "page.tsx hand-maintained" })
        continue
    }

    if (seo) {
        transformed = transformed.replace(/^export default function (\w+)/m, "export default function PageClient")
        if (!transformed.startsWith('"use client"')) {
            transformed = `"use client"\n\n${transformed}`
        }
        const clientFile = resolve(dirname(outFile), "page-client.tsx")
        await writeFile(clientFile, transformed)

        const normalizedPath = routePath === "/" ? "/" : `/${routeSegmentsFromPath(routePath).join("/")}/`
        const canonical = `${siteUrl}${normalizedPath}`
        const serverWrapper = `import type { Metadata } from "next"
import PageClient from "./page-client"

export const metadata: Metadata = {
    title: ${JSON.stringify(seo.title)},
    description: ${JSON.stringify(seo.description)},
    alternates: { canonical: ${JSON.stringify(canonical)} },
    openGraph: {
        title: ${JSON.stringify(seo.title)},
        description: ${JSON.stringify(seo.description)},
        url: ${JSON.stringify(canonical)},
    },
    twitter: {
        title: ${JSON.stringify(seo.title)},
        description: ${JSON.stringify(seo.description)},
    },
}

export default function Page() {
    return <PageClient />
}
`
        await writeFile(outFile, serverWrapper)
    } else {
        transformed = transformed.replace(/^export default function (\w+)/m, "export default function Page")
        if (!transformed.startsWith('"use client"')) {
            transformed = `"use client"\n\n${transformed}`
        }
        await writeFile(outFile, transformed)
    }

    routeMap.push({ file: relPath, routePath, outFile: relative(projectRoot, outFile) })
}

await writeFile(
    resolve(projectRoot, "scripts/.migration-report.json"),
    JSON.stringify(routeMap, null, 2),
)

console.log(`Migrated ${routeMap.length} pages.`)
