import { access, cp, mkdir, rm } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const legacyRoot = resolve(projectRoot, "legacy")

async function replaceDirectory(source, destination) {
    await rm(destination, { recursive: true, force: true })
    await mkdir(dirname(destination), { recursive: true })
    await cp(source, destination, { recursive: true, force: true })
}

async function replaceDirectoryIfPresent(source, destination, fallback) {
    let selectedSource = source
    try {
        await access(selectedSource)
    } catch {
        if (!fallback) return
        selectedSource = fallback
        await access(selectedSource)
    }
    await replaceDirectory(selectedSource, destination)
}

await Promise.all([
    replaceDirectoryIfPresent(resolve(legacyRoot, "js"), resolve(projectRoot, "public/js")),
    replaceDirectoryIfPresent(resolve(legacyRoot, "css"), resolve(projectRoot, "public/css")),
    replaceDirectoryIfPresent(
        resolve(legacyRoot, "Assets"),
        resolve(projectRoot, "public/Assets"),
        resolve(projectRoot, "src/Assets"),
    ),
    replaceDirectoryIfPresent(resolve(legacyRoot, "mobile/js"), resolve(projectRoot, "public/mobile/js")),
    replaceDirectoryIfPresent(resolve(legacyRoot, "mobile/css"), resolve(projectRoot, "public/mobile/css")),
    replaceDirectoryIfPresent(
        resolve(legacyRoot, "mobile/Assets"),
        resolve(projectRoot, "public/mobile/Assets"),
        resolve(projectRoot, "src/Assets"),
    ),
])
