import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { build } from "vite"

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const distDir = resolve(projectRoot, "dist")
const ssrOutDir = resolve(projectRoot, "dist-ssr")
const siteUrl = "https://www.trybloom.org"

const routes = [
    {
        url: "/",
        title: "The Bloom Project™ — Making local connections easier",
        description: "Bloom helps you discover local communities, events, and businesses near you, and makes it easy to connect with the people around you.",
        outFile: "index.html",
    },
    {
        url: "/login/",
        title: "Bloom - Login",
        description: "Log in to Bloom to connect with local communities, events, and businesses near you.",
        outFile: "login/index.html",
    },
    {
        url: "/register/",
        title: "Bloom - Register",
        description: "Create a Bloom account to start connecting with local communities, events, and businesses near you.",
        outFile: "register/index.html",
    },
    {
        url: "/pages/legal/community-guidelines/",
        title: "Bloom - Community Guidelines",
        description: "Read The Bloom Project's community guidelines.",
        outFile: "pages/legal/community-guidelines/index.html",
    },
]

await build({
    root: projectRoot,
    logLevel: "warn",
    build: {
        ssr: "src/entry-server.tsx",
        outDir: "dist-ssr",
        emptyOutDir: true,
    },
})

const { render } = await import(resolve(ssrOutDir, "entry-server.js"))

const template = await readFile(resolve(distDir, "index.html"), "utf8")

for (const route of routes) {
    const appHtml = render(route.url)
    const canonical = `${siteUrl}${route.url}`

    const page = template
        .replace(/<title>[\s\S]*?<\/title>/, `<title>${route.title}</title>`)
        .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${route.description}" />`)
        .replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${canonical}" />`)
        .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${route.title}" />`)
        .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${route.description}" />`)
        .replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${canonical}" />`)
        .replace(/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${route.title}" />`)
        .replace(/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${route.description}" />`)
        .replace(/<div id="root">[\s\S]*?<\/div>\s*(?=<noscript>)/, `<div id="root" data-prerendered="true">${appHtml}</div>\n    `)

    const outPath = resolve(distDir, route.outFile)
    await mkdir(dirname(outPath), { recursive: true })
    await writeFile(outPath, page)
}

await rm(ssrOutDir, { recursive: true, force: true })
