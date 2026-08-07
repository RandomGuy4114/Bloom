import Link from "next/link"
import { useRouter } from "next/navigation"

interface BottomBarProps {
    mobile?: boolean
}

export default function BottomBar({ mobile = false }: BottomBarProps) {
    const router = useRouter()
    const route = (page: string) => mobile ? `/mobile/${page}` : `/${page}`
    const preload = (page: string) => {
        router.prefetch(route(page))
    }

    return (
        <footer id="BottomBar">
            <div className="CenterLayout landing-footer-brand">
                <Link href={route("")} className="Bottombar-logo" style={{fontSize: '1.25rem'}}>The Bloom Project™</Link>
                <p>An open-source project by FormalBlaze</p>
            </div>
            <a href="https://github.com/RandomGuy4114/Bloom" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="https://github.com/RandomGuy4114/Bloom/issues" target="_blank" rel="noopener noreferrer">Issues</a>
            <Link href={route("terms")} onMouseEnter={() => preload("terms")} onFocus={() => preload("terms")}>Terms</Link>
            <Link href={route("privacy")} onMouseEnter={() => preload("privacy")} onFocus={() => preload("privacy")}>Privacy</Link>
            <Link href={route("blog")} onMouseEnter={() => preload("blog")} onFocus={() => preload("blog")}>Blog</Link>
            <Link href={route("roadmap")} onMouseEnter={() => preload("roadmap")} onFocus={() => preload("roadmap")}>Roadmap</Link>
            <a href="https://github.com/RandomGuy4114/Bloom/issues/new" target="_blank" rel="noopener noreferrer">Contact Us</a>
            <Link href={route("credits")} onMouseEnter={() => preload("credits")} onFocus={() => preload("credits")}>Credits</Link>
        </footer>
    )
}
