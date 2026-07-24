const currentYearElement = document.querySelector("#currentYear");
const menuToggle = document.querySelector(".menu-toggle");
const mainNavigation = document.querySelector("#main-navigation");
const navigationLinks = document.querySelectorAll("#main-navigation a");

if (currentYearElement) {
  currentYearElement.textContent = new Date().getFullYear().toString();
}

if (menuToggle && mainNavigation) {
  menuToggle.addEventListener("click", () => {
    const isOpen = mainNavigation.classList.toggle("is-open");

    menuToggle.setAttribute("aria-expanded", isOpen.toString());
    menuToggle.textContent = isOpen ? "Close" : "Menu";

    document.body.classList.toggle("menu-open", isOpen);
  });
}

navigationLinks.forEach((navigationLink) => {
  navigationLink.addEventListener("click", () => {
    if (!menuToggle || !mainNavigation) {
      return;
    }

    mainNavigation.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.textContent = "Menu";

    document.body.classList.remove("menu-open");
  });
});
