import AppNavigation from "../../components/AppNavigation"
import PageLifecycle from "../../components/PageLifecycle"

export const pagePath = "/pages/app/calendar/"

const pageMetadata = {
    "bodyClass": "app-page",
    "language": "en",
    "links": [
        "../../../css/styles.css"
    ],
    "pagePath": "/pages/app/calendar/",
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

export default function PagesAppCalendarPage() {
    return (
        <PageLifecycle {...pageMetadata}>
            <>
    <AppNavigation />
    <main className="main-layout calendar-layout" aria-label="Calendar">
        <div className="CalendarContainer" id="calendar-container">
            <div className="month" id="monthYearContainer">
                <div className="calendar-toolbar-nav">
                    <button id="prev" className="calendar-nav-button" type="button" aria-label="Previous month">&#10094;</button>
                    <button id="next" className="calendar-nav-button" type="button" aria-label="Next month">&#10095;</button>
                </div>
                <h2 id="monthYear" className="calendar-title" aria-live="polite"></h2>
                <div className="calendar-toolbar-actions">
                    <button type="button" className="calendar-view-button is-active" aria-pressed="true">Month</button>
                </div>
            </div>
            <ul className="weekdays" id="weekdaysContainer">
            </ul>
            <ul className="days" id="daysContainer">

            </ul>
        </div>
        <aside className="calendar-sidebar">
            <div className="calendar-sidebar-section">
                <h3>Upcoming</h3>
                <ul id="calendarUpcomingList" className="calendar-upcoming-list"></ul>
            </div>
            <div className="calendar-sidebar-section">
                <h3>Legend</h3>
                <ul id="calendarLegendList" className="calendar-legend-list"></ul>
            </div>
        </aside>
    </main>
    <div id="eventDetailsContainer">

    </div>

            </>
        </PageLifecycle>
    )
}
