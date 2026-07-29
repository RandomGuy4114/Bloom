// Dependencies
import { getCurrentUserOrRedirect, showCurrentUser, withLoadingOverlay } from "./main.js";
import { supabase } from "./supabase.js";
import { getLanguage, t } from "./i18n.js";

// Definitions
const usernameLabel = document.getElementById("username-label");
const nextmonthButton = document.getElementById("next");
const prevmonthButton = document.getElementById("prev");
const daysContainer = document.getElementById("daysContainer");

// Global State
const state = {
  currentDate: new Date(), // Defaults to today
  currentUser: null,       // Track the user globally so changeMonth can access it
  events: []               // Cache the fetched posts/events
};

// Functions

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
    const { data: posts, error: postsError } = await supabase
      .from("Posts")
      .select("id, title, body, created_at, post_type, img_link, img_links, location, community, date")
      .in("community", joinedCommunityIds)
      .order("created_at", { ascending: false })
      .eq("post_type", "event");

    if (postsError) {
      console.error("Error fetching posts:", postsError.message);
      return;
    }

    
    
    state.events = posts || [];
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

    const hasEvent = state.events.some(event => {
          if (!event.date) return false;
          
          // Split the YYYY-MM-DD string directly to avoid timezone conversion bugs
          const [eventYear, eventMonth, eventDay] = event.date.split('-').map(Number);
          
          return (
            eventDay === day &&
            (eventMonth - 1) === viewMonth && // JS months are 0-indexed (0 = Jan)
            eventYear === viewYear
        );
  });

    const activeClass = isToday ? "active" : "";
    const eventClass = hasEvent ? "has-event" : "";
    const combinedClasses = [activeClass, eventClass].filter(Boolean).join(" ");

    daysHTML.push(
      `<li class="${combinedClasses}" data-day="${day}">
        <span class="day-num">${day}</span>
        ${hasEvent ? '<span class="event-dot"></span>' : ''}
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

    console.log("Selected Date:", selectedDate.toLocaleDateString());

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
