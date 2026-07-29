import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises"
import { basename, dirname, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const legacyRoot = resolve(projectRoot, "legacy")
const outputRoot = resolve(projectRoot, "src/sites")
const previousOutputRoot = resolve(projectRoot, "src/generated-pages")
const voidElements = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"])
const paragraphClosingElements = new Set(["address", "article", "aside", "blockquote", "div", "dl", "fieldset", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr", "main", "nav", "ol", "p", "pre", "section", "table", "ul"])
const booleanAttributes = new Set(["allowFullScreen", "async", "autoFocus", "autoPlay", "checked", "controls", "default", "defer", "disabled", "formNoValidate", "hidden", "loop", "multiple", "muted", "noValidate", "open", "playsInline", "readOnly", "required", "reversed", "selected"])
const numericAttributes = new Set(["cols", "maxLength", "minLength", "rows", "size", "span", "start", "tabIndex"])
const attributeNames = new Map([
    ["accept-charset", "acceptCharset"],
    ["autocapitalize", "autoCapitalize"],
    ["autocomplete", "autoComplete"],
    ["autofocus", "autoFocus"],
    ["cellpadding", "cellPadding"],
    ["cellspacing", "cellSpacing"],
    ["charset", "charSet"],
    ["class", "className"],
    ["colspan", "colSpan"],
    ["contenteditable", "contentEditable"],
    ["crossorigin", "crossOrigin"],
    ["datetime", "dateTime"],
    ["enctype", "encType"],
    ["fetchpriority", "fetchPriority"],
    ["for", "htmlFor"],
    ["formaction", "formAction"],
    ["formenctype", "formEncType"],
    ["formmethod", "formMethod"],
    ["formnovalidate", "formNoValidate"],
    ["formtarget", "formTarget"],
    ["frameborder", "frameBorder"],
    ["maxlength", "maxLength"],
    ["minlength", "minLength"],
    ["novalidate", "noValidate"],
    ["playsinline", "playsInline"],
    ["readonly", "readOnly"],
    ["referrerpolicy", "referrerPolicy"],
    ["rowspan", "rowSpan"],
    ["spellcheck", "spellCheck"],
    ["srcset", "srcSet"],
    ["tabindex", "tabIndex"],
    ["usemap", "useMap"],
])

function attribute(tag, name) {
    return tag.match(new RegExp(`${name}=["']([^"']*)["']`, "i"))?.[1] ?? ""
}

function componentName(routePath) {
    const words = routePath.split(/[^A-Za-z0-9]+/).filter(Boolean)
    return `${words.map((word) => word[0].toUpperCase() + word.slice(1)).join("")}Page` || "RootPage"
}

function camelCaseStyle(property) {
    const trimmed = property.trim()
    if (trimmed.startsWith("--")) return trimmed
    return trimmed.replace(/^-ms-/, "ms-").replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
}

function jsxStyle(value) {
    const declarations = value.split(";").map((item) => item.trim()).filter(Boolean)
    const entries = declarations.map((declaration) => {
        const colon = declaration.indexOf(":")
        if (colon < 0) return null
        const property = camelCaseStyle(declaration.slice(0, colon))
        const styleValue = declaration.slice(colon + 1).trim()
        return `${JSON.stringify(property)}: ${JSON.stringify(styleValue)}`
    }).filter(Boolean)
    return `{{ ${entries.join(", ")} } as CSSProperties}`
}

function parseAttributes(source) {
    const attributes = []
    const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g
    for (const match of source.matchAll(pattern)) {
        attributes.push({ name: match[1], value: match[2] ?? match[3] ?? match[4] })
    }
    return attributes
}

function jsxAttribute({ name, value }, elementName) {
    const lowerName = name.toLowerCase()

    if (lowerName === "style" && value !== undefined) return `style=${jsxStyle(value)}`

    if (lowerName === "onclick" && value !== undefined) {
        const destination = value.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/i)?.[1]
        if (destination) return `onClick={() => { window.location.href = ${JSON.stringify(destination)} }}`
        return ""
    }

    const reactName = lowerName.startsWith("data-") || lowerName.startsWith("aria-")
        ? lowerName
        : attributeNames.get(lowerName) ?? name

    if (value === undefined) return booleanAttributes.has(reactName) ? reactName : `${reactName}={true}`
    if (booleanAttributes.has(reactName) && value.toLowerCase() === lowerName) return reactName
    if (elementName === "select" && lowerName === "label") return `{...{ label: ${JSON.stringify(value)} }}`
    if (numericAttributes.has(reactName) && /^-?\d+(?:\.\d+)?$/.test(value)) return `${reactName}={${value}}`
    return `${reactName}=${JSON.stringify(value)}`
}

function convertTag(tag) {
    if (/^<!/.test(tag)) return ""
    const closing = tag.match(/^<\s*\/\s*([A-Za-z0-9-]+)\s*>$/)
    if (closing) return `</${closing[1].toLowerCase()}>`

    const opening = tag.match(/^<\s*([A-Za-z0-9-]+)([\s\S]*?)\/?\s*>$/)
    if (!opening) return tag

    const name = opening[1].toLowerCase()
    const attributes = parseAttributes(opening[2]).map((item) => jsxAttribute(item, name)).filter(Boolean)
    const suffix = attributes.length ? ` ${attributes.join(" ")}` : ""
    return voidElements.has(name) || /\/\s*>$/.test(tag)
        ? `<${name}${suffix} />`
        : `<${name}${suffix}>`
}

function convertBodyToJsx(body) {
    const cleaned = body
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    const stack = []
    let output = ""
    let cursor = 0

    for (const match of cleaned.matchAll(/<[^>]+>/g)) {
        output += cleaned.slice(cursor, match.index)
        cursor = match.index + match[0].length

        const closing = match[0].match(/^<\s*\/\s*([A-Za-z0-9-]+)\s*>$/)
        if (closing) {
            const name = closing[1].toLowerCase()
            const matchingIndex = stack.lastIndexOf(name)
            if (matchingIndex < 0) continue
            while (stack.length > matchingIndex) output += `</${stack.pop()}>`
            continue
        }

        const opening = match[0].match(/^<\s*([A-Za-z0-9-]+)/)
        if (!opening) continue
        const name = opening[1].toLowerCase()

        if (stack.at(-1) === "p" && paragraphClosingElements.has(name)) {
            output += "</p>"
            stack.pop()
        }
        if ((name === "li" || name === "option") && stack.at(-1) === name) {
            output += `</${stack.pop()}>`
        }

        output += convertTag(match[0])
        if (!voidElements.has(name) && !/\/\s*>$/.test(match[0])) stack.push(name)
    }

    output += cleaned.slice(cursor)
    while (stack.length) output += `</${stack.pop()}>`
    return output
}

function parseDocument(html) {
    const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? ""
    const bodyTag = html.match(/<body\b[^>]*>/i)?.[0] ?? "<body>"
    const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? ""
    const htmlTag = html.match(/<html\b[^>]*>/i)?.[0] ?? "<html>"
    const refreshTag = head.match(/<meta\b[^>]*http-equiv=["']refresh["'][^>]*>/i)?.[0]
    const refreshContent = refreshTag ? attribute(refreshTag, "content") : ""

    return {
        bodyClass: attribute(bodyTag, "class"),
        jsx: convertBodyToJsx(body),
        language: attribute(htmlTag, "lang") || "en",
        links: [...head.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi)]
            .map((match) => attribute(match[0], "href"))
            .filter(Boolean),
        redirect: refreshContent.match(/url\s*=\s*(.+)$/i)?.[1]?.trim() ?? null,
        scripts: [...html.matchAll(/<script\b([^>]*)\bsrc=["']([^"']+)["']([^>]*)><\/script>/gi)]
            .map((match) => ({
                source: match[2],
                type: attribute(`<script ${match[1]} ${match[3]}>`, "type") || "text/javascript",
            })),
        styles: [...head.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((match) => match[1]),
        title: head.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() || "Bloom",
    }
}

async function htmlFiles(directory) {
    const results = []
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name)
        if (entry.isDirectory()) results.push(...await htmlFiles(path))
        else if (entry.name === "index.html") results.push(path)
    }
    return results
}

async function generatePage(sourceFile, sourceRoot, routeRoot, outputGroup) {
    const sourceRelative = relative(sourceRoot, sourceFile).split(sep).join("/")
    const routeRelative = sourceRelative.replace(/index\.html$/, "")
    const routePath = `${routeRoot}${routeRelative}`.replace(/\/+/g, "/")
    const routeParts = sourceRelative.replace(/(?:^|\/)index\.html$/, "").split("/").filter(Boolean)
    if (outputGroup === "mobile" && routeParts[0] === "pages") routeParts.shift()

    let category = routeParts.shift() || "public"
    let pageName = routeParts.join("-") || "index"

    if (outputGroup === "desktop" && (category === "landing" || category === "credits")) {
        pageName = category === "landing" ? "legacy-landing" : "credits"
        category = "public"
    } else if (outputGroup === "desktop" && category === "auth" && (pageName === "login" || pageName === "register")) {
        pageName = `legacy-${pageName}`
    } else if (outputGroup === "mobile" && (category === "landing" || category === "credits")) {
        pageName = category
        category = "public"
    }

    const categoryRoot = outputGroup === "mobile" ? join(outputRoot, "mobile", category) : join(outputRoot, category)
    const outputFile = join(categoryRoot, `${pageName}.tsx`)
    const page = parseDocument(await readFile(sourceFile, "utf8"))
    const name = componentName(routePath)
    let jsx = page.jsx
    const sharedImports = []
    const appNavigationPattern = /<div className="topbar">[\s\S]*?<div className="sidebar">[\s\S]*?Buy Bloom Supporter<\/button>\s*<\/div>/
    const appNavigationAsidePattern = /<div className="topbar">[\s\S]*?<aside className="sidebar">[\s\S]*?Buy Bloom Supporter<\/button>\s*<\/aside>/
    const appTopbarPattern = /<div className="topbar">[\s\S]*?<div className="topbar-actions" aria-label="Mobile navigation"><\/div>\s*<\/div>/
    const businessNavigationPattern = /<header className="topbar">[\s\S]*?<aside className="sidebar"[\s\S]*?<\/aside>/
    const bottomBarPattern = /<footer id="BottomBar">[\s\S]*?<\/footer>/

    if (businessNavigationPattern.test(jsx)) {
        jsx = jsx.replace(businessNavigationPattern, "<BusinessNavigation />")
        sharedImports.push("BusinessNavigation")
    } else if (appNavigationAsidePattern.test(jsx)) {
        const showTopbarActions = !routePath.endsWith("/connect/")
        jsx = jsx.replace(
            appNavigationAsidePattern,
            `<AppNavigation sidebarAsAside versionAsSpan${showTopbarActions ? "" : " showTopbarActions={false}"} />`,
        )
        sharedImports.push("AppNavigation")
    } else if (appNavigationPattern.test(jsx)) {
        const mobile = routePath.startsWith("/mobile/")
        const compactMobileHome = routePath === "/mobile/pages/app/home/"
        const usernameLabel = routePath.includes("/communities/") ? "Communities" : ""
        const props = [
            mobile ? "mobile" : "",
            compactMobileHome ? "compactMobileHome" : "",
            usernameLabel ? `usernameLabel=${JSON.stringify(usernameLabel)}` : "",
        ].filter(Boolean).join(" ")
        jsx = jsx.replace(appNavigationPattern, `<AppNavigation${props ? ` ${props}` : ""} />`)
        sharedImports.push("AppNavigation")
    } else if (routePath.endsWith("/app/create-post/") && appTopbarPattern.test(jsx)) {
        jsx = jsx.replace(appTopbarPattern, "<AppNavigation showSidebar={false} showTopbarActions={false} versionAsSpan />")
        sharedImports.push("AppNavigation")
    }

    if (bottomBarPattern.test(jsx)) {
        jsx = jsx.replace(bottomBarPattern, `<BottomBar${routePath.startsWith("/mobile/") ? " mobile" : ""} />`)
        sharedImports.push("BottomBar")
    }
    const metadata = JSON.stringify({
        bodyClass: page.bodyClass,
        language: page.language,
        links: page.links,
        pagePath: routePath,
        redirect: page.redirect,
        scripts: page.scripts,
        styles: page.styles,
        title: page.title,
    }, null, 4)

    const componentPath = (component) => JSON.stringify(relative(dirname(outputFile), resolve(projectRoot, `src/components/${component}`)).split(sep).join("/").replace(/^(?!\.)/, "./"))
    const styleImport = jsx.includes(" as CSSProperties") ? `import type { CSSProperties } from "react"\n` : ""
    const navigationImports = sharedImports.map((component) => `import ${component} from ${componentPath(component)}\n`).join("")
    const source = `${styleImport}${navigationImports}import PageLifecycle from ${componentPath("PageLifecycle")}\n\nexport const pagePath = ${JSON.stringify(routePath)}\n\nconst pageMetadata = ${metadata}\n\nexport default function ${name}() {\n    return (\n        <PageLifecycle {...pageMetadata}>\n            <>${jsx}\n            </>\n        </PageLifecycle>\n    )\n}\n`

    await mkdir(dirname(outputFile), { recursive: true })
    await writeFile(outputFile, source)
}

await rm(previousOutputRoot, { recursive: true, force: true })

const desktopRoot = resolve(legacyRoot, "pages")
const mobileRoot = resolve(legacyRoot, "mobile")
const desktopFiles = await htmlFiles(desktopRoot)
const mobileFiles = await htmlFiles(mobileRoot)

await Promise.all([
    ...desktopFiles.map((file) => generatePage(file, desktopRoot, "/pages/", "desktop")),
    ...mobileFiles.map((file) => generatePage(file, mobileRoot, "/mobile/", "mobile")),
])
