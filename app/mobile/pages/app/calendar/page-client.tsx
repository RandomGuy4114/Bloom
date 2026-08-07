"use client"

import AppNavigation from "@/components/AppNavigation"
import PageLifecycle from "@/components/PageLifecycle"

export const pagePath = "/mobile/pages/app/calendar/"

const pageMetadata = {
    "bodyClass": "app-page",
    "language": "en",
    "links": [
        "../../../css/styles.css",
        "https://cdn.jsdelivr.net/npm/remixicon@4.9.0/fonts/remixicon.css"
    ],
    "pagePath": "/mobile/pages/app/calendar/",
    "redirect": null,
    "scripts": [
        {
            "source": "../../../js/i18n.js",
            "type": "module"
        },
        {
            "source": "../../../js/calendar.js",
            "type": "module"
        }
    ],
    "styles": [],
    "title": "Bloom - Calendar"
}

export default function PageClient() {
    return (
        <PageLifecycle {...pageMetadata}>
            <>
    <AppNavigation mobile />
    <main className="main-layout" aria-label="Calendar">
        <div className="CalendarContainer" id="calendar-container">
            <div className="month" id="monthYearContainer">
                <ul>
                    <button id="prev" type="button" aria-label="Previous month">&#10094;</button>
                    <button id="next" type="button" aria-label="Next month">&#10095;</button>
                    <li id="monthYear" aria-live="polite"></li>
                </ul>
            </div>
            <ul className="weekdays" id="weekdaysContainer">
            </ul>
            <ul className="days" id="daysContainer">
                
            </ul>
        </div>
        <div id="eventDetailsContainer">
        
        </div>
    </main>

            </>
        </PageLifecycle>
    )
}
