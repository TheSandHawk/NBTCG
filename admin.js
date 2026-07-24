const ADMIN_USERNAME = "Administrator";
const ADMIN_PASSWORD_HASH =
  "a76c9ba2c1a1828cf1f3f93199896b7da99cd936f713e54c31ddec60964d92f5";
const AUTHENTICATION_KEY = "northbound-admin-authenticated";
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

const loginView = document.querySelector("#admin-login");
const adminApp = document.querySelector("#admin-app");
const loginForm = document.querySelector("#admin-login-form");
const usernameInput = document.querySelector("#username");
const passwordInput = document.querySelector("#password");
const loginError = document.querySelector("#login-error");
const logoutButton = document.querySelector("#admin-logout");
const navigationLinks = document.querySelectorAll(".admin-navigation a");
const adminSections = document.querySelectorAll(".admin-section");

// Event management elements
const createEventForm = document.querySelector("#create-event-form");
const adminEventsContainer = document.querySelector("#admin-events-container");

const hashValue = async (value) => {
  const encodedValue = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encodedValue);

  return Array.from(new Uint8Array(hashBuffer), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
};

const getEvents = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_EVENTS));
    return DEFAULT_EVENTS;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    return DEFAULT_EVENTS;
  }
};

const saveEvents = (events) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
};

const renderAdminEventsList = () => {
  if (!adminEventsContainer) return;
  const events = getEvents();

  if (events.length === 0) {
    adminEventsContainer.innerHTML = `
      <div class="admin-empty-events">
        <p>No events currently scheduled. Use the form on the left to add one.</p>
      </div>
    `;
    return;
  }

  // Sort by date chronologically
  const sorted = [...events].sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));

  adminEventsContainer.innerHTML = sorted
    .map(
      (evt) => `
      <div class="admin-event-item" data-id="${evt.id}">
        <div class="admin-event-info">
          <span class="admin-event-category category-${evt.category.toLowerCase().replace(/\s+/g, '-')}">${evt.category}</span>
          <strong class="admin-event-title">${evt.title}</strong>
          <p class="admin-event-meta">📅 ${evt.date} at ${evt.time} • 📍 ${evt.location || "TBA"}</p>
        </div>
        <button class="button button-small button-danger delete-event-btn" data-id="${evt.id}" type="button">Delete</button>
      </div>
    `
    )
    .join("");

  // Attach delete button click handlers
  adminEventsContainer.querySelectorAll(".delete-event-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const eventId = btn.getAttribute("data-id");
      if (confirm("Are you sure you want to delete this event?")) {
        const updatedEvents = getEvents().filter((e) => e.id !== eventId);
        saveEvents(updatedEvents);
        renderAdminEventsList();
      }
    });
  });
};

const showAdmin = () => {
  loginView.hidden = true;
  adminApp.hidden = false;
  document.title = "Administration | Northbound TCG";
  renderAdminEventsList();
};

const showLogin = () => {
  adminApp.hidden = true;
  loginView.hidden = false;
  loginForm.reset();
  loginError.hidden = true;
  document.title = "Admin sign in | Northbound TCG";
  usernameInput.focus();
};

if (sessionStorage.getItem(AUTHENTICATION_KEY) === "true") {
  showAdmin();
} else {
  showLogin();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const passwordHash = await hashValue(passwordInput.value);
  const credentialsAreValid =
    usernameInput.value === ADMIN_USERNAME &&
    passwordHash === ADMIN_PASSWORD_HASH;

  if (!credentialsAreValid) {
    loginError.hidden = false;
    passwordInput.value = "";
    passwordInput.focus();
    return;
  }

  sessionStorage.setItem(AUTHENTICATION_KEY, "true");
  showAdmin();
});

logoutButton.addEventListener("click", () => {
  sessionStorage.removeItem(AUTHENTICATION_KEY);
  showLogin();
});

// Admin Navigation Tab switching
navigationLinks.forEach((navigationLink) => {
  navigationLink.addEventListener("click", (e) => {
    const targetHash = navigationLink.getAttribute("href");

    navigationLinks.forEach((link) => {
      link.classList.remove("is-active");
      link.removeAttribute("aria-current");
    });

    navigationLink.classList.add("is-active");
    navigationLink.setAttribute("aria-current", "page");

    // Hide all sections, show target section
    if (targetHash && targetHash.startsWith("#")) {
      const targetId = targetHash.substring(1);
      adminSections.forEach((section) => {
        if (section.id === targetId) {
          section.hidden = false;
        } else {
          section.hidden = true;
        }
      });
    }
  });
});

// Event Creation Form Handler
if (createEventForm) {
  createEventForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const formData = new FormData(createEventForm);
    const newEvent = {
      id: `evt-${Date.now()}`,
      title: formData.get("title").toString().trim(),
      date: formData.get("date").toString(),
      time: formData.get("time").toString(),
      category: formData.get("category").toString(),
      format: formData.get("format").toString().trim(),
      location: formData.get("location").toString().trim(),
      description: formData.get("description").toString().trim()
    };

    const currentEvents = getEvents();
    currentEvents.push(newEvent);
    saveEvents(currentEvents);

    createEventForm.reset();
    renderAdminEventsList();
    alert("Event created successfully!");
  });
}
