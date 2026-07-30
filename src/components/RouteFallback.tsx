export default function RouteFallback() {
    return (
        <main className="route-fallback" aria-label="Loading page" aria-busy="true">
            <div className="route-skeleton route-skeleton--title" />
            <div className="route-skeleton route-skeleton--card" />
            <div className="route-skeleton route-skeleton--card" />
        </main>
    )
}
