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
const teamMemberForm = document.querySelector("#team-member-form");
const teamMembersContainer = document.querySelector("#admin-team-members-container");
const teamMemberFormTitle = document.querySelector("#team-member-form-title");
const teamMemberSubmit = document.querySelector("#team-member-submit");
const teamMemberCancel = document.querySelector("#team-member-cancel");
const teamMemberImage = document.querySelector("#member-image");
let editingMemberId = null;

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
  renderTeamMembersList();
};

const resetTeamMemberForm = () => {
  if (!teamMemberForm) return;
  editingMemberId = null;
  teamMemberForm.reset();
  teamMemberForm.elements.sortOrder.value = "0";
  teamMemberFormTitle.textContent = "Add team member";
  teamMemberSubmit.textContent = "Add member";
  teamMemberCancel.hidden = true;
};

const uploadTeamImage = async (file) => {
  const formData = new FormData();
  formData.append("image", file);
  const response = await fetch("/api/uploads/team-image", { method: "POST", credentials: "same-origin", body: formData });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Image upload failed.");
  return data.imageUrl;
};

const renderTeamMembersList = async () => {
  if (!teamMembersContainer) return;
  try {
    const members = await request("/api/team-members");
    if (!members.length) {
      teamMembersContainer.innerHTML = "<div class=\"admin-empty-events\"><p>No team members yet.</p></div>";
      return;
    }
    teamMembersContainer.replaceChildren();
    members.forEach((member) => {
      const item = document.createElement("div");
      item.className = "admin-event-item";
      const info = document.createElement("div");
      info.className = "admin-event-info";
      const name = document.createElement("strong");
      name.className = "admin-event-title";
      name.textContent = member.name;
      const meta = document.createElement("p");
      meta.className = "admin-event-meta";
      meta.textContent = `${member.role} · Display order: ${member.sortOrder}${member.instagramUrl ? " · Instagram linked" : ""}`;
      info.append(name, meta);
      const actions = document.createElement("div");
      actions.className = "admin-team-member-actions";
      const edit = document.createElement("button");
      edit.className = "button button-small";
      edit.type = "button";
      edit.textContent = "Edit";
      edit.addEventListener("click", () => {
        editingMemberId = member.id;
        teamMemberForm.elements.name.value = member.name;
        teamMemberForm.elements.role.value = member.role;
        teamMemberForm.elements.imageUrl.value = member.imageUrl || "";
        teamMemberForm.elements.instagramUrl.value = member.instagramUrl || "";
        teamMemberForm.elements.sortOrder.value = member.sortOrder;
        teamMemberForm.elements.bio.value = member.bio;
        teamMemberFormTitle.textContent = "Edit team member";
        teamMemberSubmit.textContent = "Save changes";
        teamMemberCancel.hidden = false;
        teamMemberForm.elements.name.focus();
      });
      const remove = document.createElement("button");
      remove.className = "button button-small button-danger";
      remove.type = "button";
      remove.textContent = "Delete";
      remove.addEventListener("click", async () => {
        if (!confirm(`Delete ${member.name}?`)) return;
        try {
          await request(`/api/team-members/${encodeURIComponent(member.id)}`, { method: "DELETE" });
          if (editingMemberId === member.id) resetTeamMemberForm();
          renderTeamMembersList();
        } catch (error) { alert(error.message); }
      });
      actions.append(edit, remove);
      item.append(info, actions);
      teamMembersContainer.append(item);
    });
  } catch (error) {
    teamMembersContainer.textContent = error.message;
  }
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

teamMemberForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const member = Object.fromEntries(new FormData(teamMemberForm).entries());
  try {
    if (teamMemberImage.files[0]) member.imageUrl = await uploadTeamImage(teamMemberImage.files[0]);
    delete member.image;
    await request(editingMemberId ? `/api/team-members/${encodeURIComponent(editingMemberId)}` : "/api/team-members", {
      method: editingMemberId ? "PUT" : "POST",
      body: JSON.stringify(member),
    });
    resetTeamMemberForm();
    renderTeamMembersList();
  } catch (error) { alert(error.message); }
});

teamMemberCancel?.addEventListener("click", resetTeamMemberForm);

request("/api/auth")
  .then((session) => session.authenticated ? showAdmin() : showLogin())
  .catch(showLogin);
