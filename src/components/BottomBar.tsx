import { Link } from "react-router-dom"

interface BottomBarProps {
    mobile?: boolean
}

export default function BottomBar({ mobile = false }: BottomBarProps) {
    const route = (page: string) => mobile ? `/mobile/${page}` : `/${page}`

    return (
        <footer id="BottomBar">
            <div className="CenterLayout landing-footer-brand">
                <Link to={route("")} className="Bottombar-logo" style={{fontSize: '1.25rem'}}>The Bloom Project</Link>
                <p>An open-source project by FormalBlaze</p>
            </div>
            <a href="https://github.com/RandomGuy4114/Bloom" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="https://github.com/RandomGuy4114/Bloom/issues" target="_blank" rel="noopener noreferrer">Issues</a>
            <Link to={route("terms")}>Terms</Link>
            <Link to={route("privacy")}>Privacy</Link>
            <Link to={route("blog")}>Blog</Link>
            <Link to={route("roadmap")}>Roadmap</Link>
            <a href="https://github.com/RandomGuy4114/Bloom/issues/new" target="_blank" rel="noopener noreferrer">Contact Us</a>
            <Link to={route("credits")}>Credits</Link>
        </footer>
    )
}
