import type { NextConfig } from "next"
import { aliasRewrites } from "./src/routeAliases"

const nextConfig: NextConfig = {
    trailingSlash: true,
    async rewrites() {
        return aliasRewrites
    },
}

export default nextConfig
