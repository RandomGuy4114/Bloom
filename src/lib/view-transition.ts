import { flushSync } from "react-dom"

interface Router {
    push: (href: string) => void
}

export function navigateWithViewTransition(router: Router, href: string) {
    if (typeof document === "undefined" || !document.startViewTransition) {
        router.push(href)
        return
    }

    document.startViewTransition(() => {
        flushSync(() => {
            router.push(href)
        })
    })
}
