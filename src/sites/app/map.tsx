import AppNavigation from "../../components/AppNavigation"
import PageLifecycle from "../../components/PageLifecycle"

export const pagePath = "/pages/app/map/"

const pageMetadata = {
    "bodyClass": "app-page map-page",
    "language": "en",
    "links": [
        "../../../css/styles.css",
        "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    ],
    "pagePath": "/pages/app/map/",
    "redirect": null,
    "scripts": [
        {
            "source": "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
            "type": "text/javascript"
        },
        {
            "source": "../../../js/i18n.js",
            "type": "module"
        },
        {
            "source": "../../../js/map.js",
            "type": "module"
        }
    ],
    "styles": [],
    "title": "Bloom - Map"
}

export default function PagesAppMapPage() {
    return (
        <PageLifecycle {...pageMetadata}>
            <>
    <AppNavigation />
    <div className="main-layout">
         <div id="map"></div>
         <div id="event-list" className="event-list"></div>
    </div>

    
    

            </>
        </PageLifecycle>
    )
}
