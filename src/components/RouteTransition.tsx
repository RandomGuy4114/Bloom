import { useLayoutEffect } from "react"
import { useLocation } from "react-router-dom"

export default function RouteTransition() {
    const { pathname } = useLocation()

    useLayoutEffect(() => {
        const root = document.documentElement
        root.classList.remove("route-enter")
        void root.offsetWidth
        root.classList.add("route-enter")

        const timer = window.setTimeout(() => {
            root.classList.remove("route-enter")
        }, 200)

        return () => window.clearTimeout(timer)
    }, [pathname])

    return null
}
