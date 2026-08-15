// Dependencies
import { getCommunityNameFromID, getCurrentUserOrRedirect, showCurrentUser, withLoadingOverlay } from "./main.js?v=msuu9c6w";
import { supabase } from "./supabase.js?v=msuu9c6w";
import { getLanguage, t } from "./i18n.js?v=msuu9c6w";

// Definitions
const usernameLabel = document.getElementById("username-label");
const nextmonthButton = document.getElementById("next");
const prevmonthButton = document.getElementById("prev");
const daysContainer = document.getElementById("daysContainer");
const upcomingList = document.getElementById("calendarUpcomingList");
const legendList = document.getElementById("calendarLegendList");
const hasRichCalendarUI = Boolean(upcomingList && legendList);

const CALENDAR_PALETTE = ["#7c5cff", "#3b82c4", "#c98a2e", "#4f9d69", "#c65f8a", "#4aa3a2"];
const communityColors = new Map();

function colorForCommunity(communityID) {
  if (!communityID) return CALENDAR_PALETTE[0];
  if (!communityColors.has(communityID)) {
    let hash = 0;
    for (const char of String(communityID)) {
      hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    }
    communityColors.set(communityID, CALENDAR_PALETTE[hash % CALENDAR_PALETTE.length]);
  }
  return communityColors.get(communityID);
}

// Global State
const state = {
  currentDate: new Date(), // Defaults to today
  currentUser: null,       // Track the user globally so changeMonth can access it
  events: [],              // Cache the fetched posts/events
  communityNames: new Map(), // communityID -> name, populated per render
};

// Functions

function eventDateParts(event) {
  if (!event.date) return null;
  const [year, month, day] = event.date.split("-").map(Number);
  return { year, month: month - 1, day };
}

async function loadCommunityNames() {
  const uniqueIds = [...new Set(state.events.map((event) => event.community).filter(Boolean))];
  const entries = await Promise.all(uniqueIds.map(async (id) => [id, await getCommunityNameFromID(id)]));
  state.communityNames = new Map(entries);
}

function renderLegend() {
  if (!legendList) return;

  const uniqueIds = [...new Set(state.events.map((event) => event.community).filter(Boolean))];
  if (uniqueIds.length === 0) {
    legendList.innerHTML = `<li class="calendar-legend-empty">${t("No communities yet.")}</li>`;
    return;
  }

  legendList.innerHTML = uniqueIds.map((id) => `
    <li class="calendar-legend-item">
      <span class="calendar-legend-swatch" style="background-color:${colorForCommunity(id)}"></span>
      <span data-i18n-ignore="true">${escapeHTML(state.communityNames.get(id) || t("Unknown community"))}</span>
    </li>
  `).join("");
}

function renderUpcoming() {
  if (!upcomingList) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const locale = getLanguage() === "es" ? "es" : "en";
  const monthFormatter = new Intl.DateTimeFormat(locale, { month: "short" });

  const upcomingEvents = state.events
    .map((event) => ({ event, parts: eventDateParts(event) }))
    .filter(({ parts }) => parts && new Date(parts.year, parts.month, parts.day) >= today)
    .sort((a, b) => new Date(a.parts.year, a.parts.month, a.parts.day) - new Date(b.parts.year, b.parts.month, b.parts.day))
    .slice(0, 3);

  if (upcomingEvents.length === 0) {
    upcomingList.innerHTML = `<li class="calendar-upcoming-empty">${t("No upcoming events.")}</li>`;
    return;
  }

  upcomingList.innerHTML = upcomingEvents.map(({ event, parts }) => `
    <li class="calendar-upcoming-item">
      <span class="calendar-upcoming-date">
        ${monthFormatter.format(new Date(parts.year, parts.month, parts.day)).toUpperCase()}
        <strong>${parts.day}</strong>
      </span>
      <span class="calendar-upcoming-body">
        <p class="calendar-upcoming-title" data-i18n-ignore="true">${escapeHTML(event.title || t("Untitled event"))}</p>
        <p class="calendar-upcoming-meta" data-i18n-ignore="true">${escapeHTML(state.communityNames.get(event.community) || "")}</p>
      </span>
    </li>
  `).join("");
}

async function renderCalendar(User) {
  const { error, data: joinedCommunities } = await supabase
    .from("Communities")
    .select("id")
    .eq("user_id", User.id);

  if (error) {
    console.error("Error fetching joined communities:", error.message);
    return;
  }

  const joinedCommunityIds = joinedCommunities.map(c => c.id);

  if (joinedCommunityIds.length === 0) {
    state.events = [];
  } else {
    const { data: unorderedPosts, error: postsError } = await supabase
      .rpc("get_visible_posts", { community_ids: joinedCommunityIds, post_types: ["event"] });
    const posts = (unorderedPosts ?? []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (postsError) {
      console.error("Error fetching posts:", postsError.message);
      return;
    }

    state.events = posts || [];
  }

  if (hasRichCalendarUI) {
    await loadCommunityNames();
    renderLegend();
    renderUpcoming();
  }

  const monthYear = document.getElementById("monthYear");
  const weekdaysContainer = document.getElementById("weekdaysContainer");

  const viewYear = state.currentDate.getFullYear();
  const viewMonth = state.currentDate.getMonth();
  const today = new Date();
  const locale = getLanguage() === "es" ? "es" : "en";

  monthYear.textContent = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(new Date(viewYear, viewMonth, 1));

  const weekdayFormatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    weekdayFormatter.format(new Date(2024, 0, 7 + index))
  );
  weekdaysContainer.innerHTML = weekdays.map(day => `<li>${day}</li>`).join("");

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();

  const daysHTML = [];

  for (let i = 0; i < firstDayOfMonth; i++) {
    daysHTML.push(`<li class="empty"></li>`);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const isToday =
      day === today.getDate() &&
      viewMonth === today.getMonth() &&
      viewYear === today.getFullYear();

    const dayEvents = state.events.filter(event => {
      const parts = eventDateParts(event);
      return parts && parts.day === day && parts.month === viewMonth && parts.year === viewYear;
    });

    const activeClass = isToday ? "active" : "";
    const eventClass = dayEvents.length > 0 ? "has-event" : "";
    const combinedClasses = [activeClass, eventClass].filter(Boolean).join(" ");

    const pillsHTML = hasRichCalendarUI
      ? dayEvents.slice(0, 2).map(event => `
          <span class="calendar-day-pill" style="background-color:${colorForCommunity(event.community)}" data-i18n-ignore="true">${escapeHTML(event.title || t("Event"))}</span>
        `).join("")
      : (dayEvents.length > 0 ? '<span class="event-dot"></span>' : "");

    daysHTML.push(
      `<li class="${combinedClasses}" data-day="${day}">
        <span class="day-num">${day}</span>
        ${pillsHTML}
       </li>`
    );
  }

  daysContainer.innerHTML = daysHTML.join("");

  displayEventsForDate(today);
}

function changeMonth(offset) {
  const currentMonth = state.currentDate.getMonth();
  state.currentDate.setMonth(currentMonth + offset);

  if (state.currentUser) {
    renderCalendar(state.currentUser);
  }
}

function displayEventsForDate(date) {
  const targetYear = date.getFullYear();
  const targetMonth = date.getMonth();
  const targetDay = date.getDate();

  const dailyEvents = state.events.filter(event => {
    if (!event.date) return false;

    const [eventYear, eventMonth, eventDay] = event.date.split('-').map(Number);

    return (
      eventDay === targetDay &&
      (eventMonth - 1) === targetMonth &&
      eventYear === targetYear
    );
});

  const eventDetailsContainer = document.getElementById("eventDetailsContainer");
  if (!eventDetailsContainer) return;

  if (dailyEvents.length === 0) {
    eventDetailsContainer.innerHTML = `<p class="no-events">${t("No events scheduled for this day.")}</p>`;
    return;
  }

  eventDetailsContainer.innerHTML = dailyEvents.map(event => `
    <div class="event-card">
      <h4>${escapeHTML(event.title)}</h4>
      <p class="event-location">📍 ${escapeHTML(event.location || t("No Location Listed"))}</p>
      <p class="event-body">${escapeHTML(event.body || "")}</p>
    </div>
  `).join("");
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g,
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// Listeners
nextmonthButton.addEventListener("click", () => changeMonth(1));
prevmonthButton.addEventListener("click", () => changeMonth(-1));

daysContainer.addEventListener("click", (event) => {
  const target = event.target.closest("li");

  if (target && !target.classList.contains("empty")) {
    const clickedDay = parseInt(target.getAttribute("data-day"), 10);
    const viewYear = state.currentDate.getFullYear();
    const viewMonth = state.currentDate.getMonth();

    const selectedDate = new Date(viewYear, viewMonth, clickedDay);

    const allDays = daysContainer.querySelectorAll("li");
    allDays.forEach(day => day.classList.remove("active"));
    target.classList.add("active");

    displayEventsForDate(selectedDate);
  }
});

window.addEventListener("bloom:languagechange", () => {
  if (state.currentUser) renderCalendar(state.currentUser);
});

// Initialization
await withLoadingOverlay(async () => {
  const currentUser = await getCurrentUserOrRedirect();
  if (!currentUser) return;

  state.currentUser = currentUser;
  await showCurrentUser(currentUser, usernameLabel);

  // Initial draw
  await renderCalendar(currentUser);
}, "Loading calendar...");
