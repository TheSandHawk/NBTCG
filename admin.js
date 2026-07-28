const loginView = document.querySelector("#admin-login");
const passwordChangeView = document.querySelector("#admin-password-change");
const adminApp = document.querySelector("#admin-app");
const loginForm = document.querySelector("#admin-login-form");
const usernameInput = document.querySelector("#username");
const passwordInput = document.querySelector("#password");
const loginError = document.querySelector("#login-error");
const passwordChangeForm = document.querySelector("#password-change-form");
const passwordChangeError = document.querySelector("#password-change-error");
const passwordChangeLogout = document.querySelector("#password-change-logout");
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
const usersNavigation = document.querySelector("#users-navigation");
const eventsNavigation = document.querySelector("#events-navigation");
const teamMembersNavigation = document.querySelector("#team-members-navigation");
const userForm = document.querySelector("#user-form");
const usersContainer = document.querySelector("#admin-users-container");
const userFormTitle = document.querySelector("#user-form-title");
const userSubmit = document.querySelector("#user-submit");
const userCancel = document.querySelector("#user-cancel");
const overviewTeamCount = document.querySelector("#overview-team-count");
const overviewEventCount = document.querySelector("#overview-event-count");
const overviewAccessLabel = document.querySelector("#overview-access-label");
const overviewAccessValue = document.querySelector("#overview-access-value");
const overviewAccessDescription = document.querySelector("#overview-access-description");
let currentUserRole = null;
let editingUserId = null;
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

const showAdmin = (session) => {
  currentUserRole = session.role;
  loginView.hidden = true;
  passwordChangeView.hidden = true;
  adminApp.hidden = false;
  document.title = "Administration | Northbound TCG";
  usersNavigation.hidden = currentUserRole !== "admin";
  eventsNavigation.hidden = !["admin", "editor", "event_manager"].includes(currentUserRole);
  teamMembersNavigation.hidden = !["admin", "editor", "team_manager"].includes(currentUserRole);
  renderAdminEventsList();
  renderTeamMembersList();
  renderOverview();
  if (currentUserRole === "admin") renderUsersList();
};

const showPasswordChange = () => {
  loginView.hidden = true;
  adminApp.hidden = true;
  passwordChangeView.hidden = false;
  passwordChangeForm.reset();
  passwordChangeError.hidden = true;
  passwordChangeForm.elements.newPassword.focus();
};

const roleDetails = {
  admin: { name: "Administrator", description: "Full access, including user management." },
  editor: { name: "Editor", description: "Can manage events, team members, and images." },
  team_manager: { name: "Team Manager", description: "Can manage team members and profile images." },
  event_manager: { name: "Event Manager", description: "Can manage events only." },
};

const renderOverview = async () => {
  const access = roleDetails[currentUserRole] || { name: "Limited", description: "Your available permissions are limited." };
  overviewAccessValue.textContent = access.name;
  overviewAccessDescription.textContent = access.description;
  if (currentUserRole === "admin") overviewAccessLabel.textContent = "Your access";
  try {
    const [members, events] = await Promise.all([request("/api/team-members"), request("/api/events")]);
    overviewTeamCount.textContent = members.length.toString();
    const today = new Date().toISOString().slice(0, 10);
    overviewEventCount.textContent = events.filter((event) => event.date >= today).length.toString();
  } catch (_) {
    overviewTeamCount.textContent = "—";
    overviewEventCount.textContent = "—";
  }
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

const resetUserForm = () => {
  if (!userForm) return;
  editingUserId = null;
  userForm.reset();
  userForm.elements.mustChangePassword.checked = true;
  userForm.elements.password.required = true;
  userForm.elements.password.placeholder = "";
  userFormTitle.textContent = "Add user";
  userSubmit.textContent = "Add user";
  userCancel.hidden = true;
};

const renderUsersList = async () => {
  if (!usersContainer || currentUserRole !== "admin") return;
  try {
    const users = await request("/api/users");
    usersContainer.replaceChildren();
    users.forEach((user) => {
      const item = document.createElement("div");
      item.className = "admin-event-item";
      const info = document.createElement("div");
      info.className = "admin-event-info";
      const name = document.createElement("strong");
      name.className = "admin-event-title";
      name.textContent = user.username;
      const meta = document.createElement("p");
      meta.className = "admin-event-meta";
      const roleLabels = {
        admin: "Administrator — full access",
        editor: "Editor — events and team",
        team_manager: "Team Manager — team and images",
        event_manager: "Event Manager — events only",
      };
      meta.textContent = `${roleLabels[user.role] || user.role}${user.isProtected ? " · Primary administrator" : ""}${user.mustChangePassword ? " · Password change required" : ""}`;
      info.append(name, meta);
      const actions = document.createElement("div");
      actions.className = "admin-team-member-actions";
      const edit = document.createElement("button");
      edit.className = "button button-small";
      edit.type = "button";
      edit.textContent = "Edit";
      edit.addEventListener("click", () => {
        editingUserId = user.id;
        userForm.elements.username.value = user.username;
        userForm.elements.password.value = "";
        userForm.elements.password.required = false;
        userForm.elements.password.placeholder = "Leave empty to keep unchanged";
        userForm.elements.role.value = user.role;
        userForm.elements.mustChangePassword.checked = Boolean(user.mustChangePassword);
        userFormTitle.textContent = "Edit user";
        userSubmit.textContent = "Save changes";
        userCancel.hidden = false;
        userForm.elements.username.focus();
      });
      actions.append(edit);
      if (!user.isProtected) {
        const remove = document.createElement("button");
        remove.className = "button button-small button-danger";
        remove.type = "button";
        remove.textContent = "Delete";
        remove.addEventListener("click", async () => {
          if (!confirm(`Delete ${user.username}?`)) return;
          try { await request(`/api/users/${encodeURIComponent(user.id)}`, { method: "DELETE" }); renderUsersList(); } catch (error) { alert(error.message); }
        });
        actions.append(remove);
      }
      item.append(info, actions);
      usersContainer.append(item);
    });
  } catch (error) { usersContainer.textContent = error.message; }
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
  passwordChangeView.hidden = true;
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
    const session = await request("/api/auth", {
      method: "POST",
      body: JSON.stringify({ action: "login", username: usernameInput.value, password: passwordInput.value }),
    });
    session.mustChangePassword ? showPasswordChange() : showAdmin(session);
  } catch (_) {
    loginError.hidden = false;
    passwordInput.value = "";
    passwordInput.focus();
  }
});

passwordChangeForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const newPassword = passwordChangeForm.elements.newPassword.value;
  const confirmation = document.querySelector("#confirm-password").value;
  if (newPassword !== confirmation) {
    passwordChangeError.textContent = "The new passwords do not match.";
    passwordChangeError.hidden = false;
    return;
  }
  try {
    const session = await request("/api/auth", { method: "POST", body: JSON.stringify({ action: "change-password", newPassword }) });
    showAdmin(session);
  } catch (error) {
    passwordChangeError.textContent = error.message;
    passwordChangeError.hidden = false;
  }
});

passwordChangeLogout?.addEventListener("click", async () => {
  await request("/api/auth", { method: "POST", body: JSON.stringify({ action: "logout" }) }).catch(() => {});
  showLogin();
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

userForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const user = Object.fromEntries(new FormData(userForm).entries());
  try {
    await request(editingUserId ? `/api/users/${encodeURIComponent(editingUserId)}` : "/api/users", {
      method: editingUserId ? "PUT" : "POST",
      body: JSON.stringify(user),
    });
    resetUserForm();
    renderUsersList();
  } catch (error) { alert(error.message); }
});

userCancel?.addEventListener("click", resetUserForm);

request("/api/auth")
  .then((session) => session.authenticated ? (session.mustChangePassword ? showPasswordChange() : showAdmin(session)) : showLogin())
  .catch(showLogin);
