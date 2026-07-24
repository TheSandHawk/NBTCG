const loginView = document.querySelector("#admin-login");
const adminApp = document.querySelector("#admin-app");
const loginForm = document.querySelector("#admin-login-form");
const usernameInput = document.querySelector("#username");
const passwordInput = document.querySelector("#password");
const loginError = document.querySelector("#login-error");
const logoutButton = document.querySelector("#admin-logout");
const navigationLinks = document.querySelectorAll(".admin-navigation a");
const adminSections = document.querySelectorAll(".admin-section");
const createEventForm = document.querySelector("#create-event-form");
const adminEventsContainer = document.querySelector("#admin-events-container");

const request = async (url, options = {}) => {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const responseText = await response.text();
  let data = {};
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch (_) {
    data = {};
  }
  if (!response.ok) {
    throw new Error(data.error || `Server returned HTTP ${response.status}.`);
  }
  return data;
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

const renderAdminEventsList = async () => {
  if (!adminEventsContainer) return;
  try {
    const events = await request("/api/events");
    if (!events.length) {
      adminEventsContainer.innerHTML = "<div class=\"admin-empty-events\"><p>No events currently scheduled.</p></div>";
      return;
    }
    adminEventsContainer.innerHTML = "";
    events.forEach((event) => {
      const item = document.createElement("div");
      item.className = "admin-event-item";
      const info = document.createElement("div");
      info.className = "admin-event-info";
      const title = document.createElement("strong");
      title.className = "admin-event-title";
      title.textContent = event.title;
      const meta = document.createElement("p");
      meta.className = "admin-event-meta";
      meta.textContent = `${event.date} at ${event.time} • ${event.location || "TBA"}`;
      info.append(title, meta);
      const remove = document.createElement("button");
      remove.className = "button button-small button-danger";
      remove.type = "button";
      remove.textContent = "Delete";
      remove.addEventListener("click", async () => {
        if (!confirm("Are you sure you want to delete this event?")) return;
        try {
          await request(`/api/events/${encodeURIComponent(event.id)}`, { method: "DELETE" });
          renderAdminEventsList();
        } catch (error) { alert(error.message); }
      });
      item.append(info, remove);
      adminEventsContainer.append(item);
    });
  } catch (error) {
    adminEventsContainer.textContent = error.message;
  }
};

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await request("/api/auth", {
      method: "POST",
      body: JSON.stringify({ action: "login", username: usernameInput.value, password: passwordInput.value }),
    });
    showAdmin();
  } catch (_) {
    loginError.hidden = false;
    passwordInput.value = "";
    passwordInput.focus();
  }
});

logoutButton.addEventListener("click", async () => {
  await request("/api/auth", { method: "POST", body: JSON.stringify({ action: "logout" }) }).catch(() => {});
  showLogin();
});

navigationLinks.forEach((link) => link.addEventListener("click", () => {
  const targetId = link.getAttribute("href").slice(1);
  navigationLinks.forEach((item) => item.classList.toggle("is-active", item === link));
  adminSections.forEach((section) => { section.hidden = section.id !== targetId; });
}));

createEventForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(createEventForm);
  try {
    await request("/api/events", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(form.entries())),
    });
    createEventForm.reset();
    renderAdminEventsList();
  } catch (error) { alert(error.message); }
});

request("/api/auth")
  .then((session) => session.authenticated ? showAdmin() : showLogin())
  .catch(showLogin);
