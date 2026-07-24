const STORAGE_KEY = "nbtcg_events";

const DEFAULT_EVENTS = [
  {
    id: "evt-1",
    title: "Riftbound Summer League - Day 3",
    date: "2026-07-28",
    time: "18:00",
    location: "Local Game Store - Table 4",
    category: "Tournament",
    format: "Riftbound Constructed",
    description: "Official local summer league matchday. Bring your 60-card main deck and sideboard! Top 4 players receive promotional foil cards."
  },
  {
    id: "evt-2",
    title: "Weekly Deck Building & Strategy Night",
    date: "2026-08-05",
    time: "19:00",
    location: "Northbound Community Hub",
    category: "Deck Building",
    format: "All Formats",
    description: "Brainstorming and testing new Legend archetypes and combo synergies with team members. Card trade table available."
  },
  {
    id: "evt-3",
    title: "Casual Saturday Riftbound Gathering",
    date: "2026-08-15",
    time: "14:00",
    location: "Northbound Lounge",
    category: "Casual",
    format: "Freeplay",
    description: "Relaxed games, deck testing without tournament pressure, and introduction rounds for new players."
  },
  {
    id: "evt-4",
    title: "Regional Riftbound Qualifier",
    date: "2026-08-29",
    time: "11:00",
    location: "City Esports Center",
    category: "Community",
    format: "Competitive Standard",
    description: "Competitive tournament round with prizes, trophies, and qualification points for regional finals."
  }
];

let currentDate = new Date(); // Tracks the currently displayed month
let activeCategory = "all";

export const getEvents = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_EVENTS));
    return DEFAULT_EVENTS;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error("Failed to parse events from storage:", e);
    return DEFAULT_EVENTS;
  }
};

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Initialize UI
const currentYearElement = document.querySelector("#currentYear");
const menuToggle = document.querySelector(".menu-toggle");
const mainNavigation = document.querySelector("#main-navigation");
const calendarGrid = document.querySelector("#calendar-grid");
const calendarMonthTitle = document.querySelector("#calendar-month-title");
const prevMonthBtn = document.querySelector("#prev-month-btn");
const nextMonthBtn = document.querySelector("#next-month-btn");
const todayBtn = document.querySelector("#today-btn");
const eventsListContainer = document.querySelector("#events-list-container");
const eventsCountBadge = document.querySelector("#events-count-badge");
const filterPills = document.querySelectorAll(".filter-pill");

// Modal Elements
const eventModal = document.querySelector("#event-modal");
const modalTitle = document.querySelector("#modal-title");
const modalCategory = document.querySelector("#modal-category");
const modalDate = document.querySelector("#modal-date");
const modalLocation = document.querySelector("#modal-location");
const modalFormat = document.querySelector("#modal-format");
const modalDescriptionText = document.querySelector("#modal-description-text");
const modalCloseBtn = document.querySelector("#modal-close-btn");
const modalDismissBtn = document.querySelector("#modal-dismiss-btn");

if (currentYearElement) {
  currentYearElement.textContent = new Date().getFullYear().toString();
}

// Mobile Nav Toggle
if (menuToggle && mainNavigation) {
  menuToggle.addEventListener("click", () => {
    const isOpen = mainNavigation.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", isOpen.toString());
    menuToggle.textContent = isOpen ? "Close" : "Menu";
    document.body.classList.toggle("menu-open", isOpen);
  });
}

// Filter handling
filterPills.forEach((pill) => {
  pill.addEventListener("click", () => {
    filterPills.forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    activeCategory = pill.getAttribute("data-category") || "all";
    renderUI();
  });
});

// Month navigation
if (prevMonthBtn) {
  prevMonthBtn.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderUI();
  });
}

if (nextMonthBtn) {
  nextMonthBtn.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderUI();
  });
}

if (todayBtn) {
  todayBtn.addEventListener("click", () => {
    currentDate = new Date();
    renderUI();
  });
}

// Modal closing
const closeModal = () => {
  if (eventModal) {
    if (typeof eventModal.close === "function") {
      eventModal.close();
    } else {
      eventModal.removeAttribute("open");
    }
  }
};

if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeModal);
if (modalDismissBtn) modalDismissBtn.addEventListener("click", closeModal);
if (eventModal) {
  eventModal.addEventListener("click", (e) => {
    if (e.target === eventModal) closeModal();
  });
}

const openModal = (eventObj) => {
  if (!eventModal) return;
  modalTitle.textContent = eventObj.title;
  modalCategory.textContent = eventObj.category;
  modalCategory.className = `event-category-tag category-${eventObj.category.toLowerCase().replace(/\s+/g, '-')}`;
  modalDate.textContent = `${eventObj.date} at ${eventObj.time}`;
  modalLocation.textContent = eventObj.location || "TBA";
  modalFormat.textContent = eventObj.format || "General";
  modalDescriptionText.textContent = eventObj.description || "No description provided.";
  
  if (typeof eventModal.showModal === "function") {
    eventModal.showModal();
  } else {
    eventModal.setAttribute("open", "true");
  }
};

const renderUI = () => {
  const events = getEvents();
  renderCalendarGrid(events);
  renderEventsList(events);
};

const renderCalendarGrid = (events) => {
  if (!calendarGrid || !calendarMonthTitle) return;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  calendarMonthTitle.textContent = `${monthNames[month]} ${year}`;
  calendarGrid.innerHTML = "";

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Day of week index (0 = Sun, 1 = Mon ... adjust to Mon = 0)
  let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startingDayOfWeek === -1) startingDayOfWeek = 6; // Sunday is index 6 in Mon-Sun grid

  const totalDays = lastDayOfMonth.getDate();
  const todayStr = new Date().toISOString().split("T")[0];

  // Previous month padding days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    const cell = document.createElement("div");
    cell.className = "calendar-day day-padding";
    cell.innerHTML = `<span class="day-number">${dayNum}</span>`;
    calendarGrid.appendChild(cell);
  }

  // Days of current month
  for (let day = 1; day <= totalDays; day++) {
    const formattedMonth = String(month + 1).padStart(2, "0");
    const formattedDay = String(day).padStart(2, "0");
    const dateStr = `${year}-${formattedMonth}-${formattedDay}`;

    const cell = document.createElement("div");
    const isToday = dateStr === todayStr;
    cell.className = `calendar-day ${isToday ? "today" : ""}`;
    cell.innerHTML = `<span class="day-number">${day}</span>`;

    // Filter events for this date
    const dayEvents = events.filter((e) => {
      const matchCategory = activeCategory === "all" || e.category === activeCategory;
      return e.date === dateStr && matchCategory;
    });

    if (dayEvents.length > 0) {
      const eventsContainer = document.createElement("div");
      eventsContainer.className = "day-events-container";

      dayEvents.forEach((evt) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = `event-chip category-${evt.category.toLowerCase().replace(/\s+/g, '-')}`;
        chip.title = `${evt.title} (${evt.time})`;
        chip.innerHTML = `<span class="chip-time">${evt.time}</span> <span class="chip-title">${evt.title}</span>`;
        chip.addEventListener("click", (e) => {
          e.stopPropagation();
          openModal(evt);
        });
        eventsContainer.appendChild(chip);
      });

      cell.appendChild(eventsContainer);
    }

    calendarGrid.appendChild(cell);
  }

  // Next month padding days to complete the grid (up to 35 or 42 cells total)
  const totalCellsSoFar = startingDayOfWeek + totalDays;
  const remainingCells = (totalCellsSoFar % 7 === 0) ? 0 : 7 - (totalCellsSoFar % 7);
  for (let i = 1; i <= remainingCells; i++) {
    const cell = document.createElement("div");
    cell.className = "calendar-day day-padding";
    cell.innerHTML = `<span class="day-number">${i}</span>`;
    calendarGrid.appendChild(cell);
  }
};

const renderEventsList = (events) => {
  if (!eventsListContainer || !eventsCountBadge) return;

  const filtered = events
    .filter((evt) => activeCategory === "all" || evt.category === activeCategory)
    .sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));

  eventsCountBadge.textContent = `${filtered.length} event${filtered.length === 1 ? "" : "s"}`;
  eventsListContainer.innerHTML = "";

  if (filtered.length === 0) {
    eventsListContainer.innerHTML = `
      <div class="empty-state">
        <p>No upcoming events found for this category.</p>
      </div>
    `;
    return;
  }

  filtered.forEach((evt) => {
    const card = document.createElement("article");
    card.className = "card event-card";

    // Format date string for display e.g. "Jul 28, 2026"
    const eventDateObj = new Date(evt.date + "T00:00:00");
    const dateFormatted = eventDateObj.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    });

    card.innerHTML = `
      <div class="event-card-header">
        <span class="event-category-tag category-${evt.category.toLowerCase().replace(/\s+/g, '-')}">${evt.category}</span>
        <span class="event-date-badge">${dateFormatted} • ${evt.time}</span>
      </div>
      <h3>${evt.title}</h3>
      <p class="event-meta-line">📍 ${evt.location || "TBA"} • ⚔️ ${evt.format || "General"}</p>
      <p class="event-desc">${evt.description || ""}</p>
      <button class="button button-small button-outline event-details-btn" type="button">View Details</button>
    `;

    const detailsBtn = card.querySelector(".event-details-btn");
    detailsBtn.addEventListener("click", () => openModal(evt));

    eventsListContainer.appendChild(card);
  });
};

// Initial render on page load
renderUI();
