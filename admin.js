const ADMIN_USERNAME = "Administrator";
const ADMIN_PASSWORD_HASH =
  "a76c9ba2c1a1828cf1f3f93199896b7da99cd936f713e54c31ddec60964d92f5";
const AUTHENTICATION_KEY = "northbound-admin-authenticated";

const loginView = document.querySelector("#admin-login");
const adminApp = document.querySelector("#admin-app");
const loginForm = document.querySelector("#admin-login-form");
const usernameInput = document.querySelector("#username");
const passwordInput = document.querySelector("#password");
const loginError = document.querySelector("#login-error");
const logoutButton = document.querySelector("#admin-logout");
const navigationLinks = document.querySelectorAll(".admin-navigation a");

const hashValue = async (value) => {
  const encodedValue = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encodedValue);

  return Array.from(new Uint8Array(hashBuffer), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
};

const showAdmin = () => {
  loginView.hidden = true;
  adminApp.hidden = false;
  document.title = "Administration | Northbound TCG";
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

navigationLinks.forEach((navigationLink) => {
  navigationLink.addEventListener("click", () => {
    navigationLinks.forEach((link) => {
      link.classList.remove("is-active");
      link.removeAttribute("aria-current");
    });

    navigationLink.classList.add("is-active");
    navigationLink.setAttribute("aria-current", "page");
  });
});
