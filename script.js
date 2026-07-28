const currentYearElement = document.querySelector("#currentYear");
const menuToggle = document.querySelector(".menu-toggle");
const mainNavigation = document.querySelector("#main-navigation");
const navigationLinks = document.querySelectorAll("#main-navigation a");
const featuredTeamMembers = document.querySelector("#featured-team-members");
const allTeamMembers = document.querySelector("#all-team-members");

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

const createMemberCard = (member) => {
  const card = document.createElement("article");
  card.className = "card team-card";
  const avatar = member.imageUrl ? document.createElement("img") : document.createElement("div");
  avatar.className = member.imageUrl ? "player-avatar player-image" : "player-avatar";
  if (member.imageUrl) {
    avatar.src = member.imageUrl;
    avatar.alt = `Profile photo of ${member.name}`;
  } else {
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = member.name.charAt(0).toUpperCase();
  }
  const name = document.createElement("h2");
  name.textContent = member.name;
  const role = document.createElement("p");
  role.className = "player-role";
  role.textContent = member.role;
  const bio = document.createElement("p");
  bio.textContent = member.bio;
  card.append(avatar, name, role, bio);
  if (member.instagramUrl) {
    const instagram = document.createElement("a");
    instagram.className = "instagram-link";
    instagram.href = member.instagramUrl;
    instagram.target = "_blank";
    instagram.rel = "noopener noreferrer";
    instagram.textContent = "Instagram";
    card.append(instagram);
  }
  return card;
};

const createAllMembersLink = () => {
  const link = document.createElement("a");
  link.className = "card team-card team-card-link";
  link.href = "./team.html";
  link.setAttribute("aria-label", "View all team members");
  link.innerHTML = "<h2>All team members</h2><p class=\"player-role\">Meet the team</p><span class=\"team-card-cta\">View all members &rarr;</span>";
  return link;
};

if (featuredTeamMembers || allTeamMembers) {
  fetch("/api/team-members")
    .then((response) => response.ok ? response.json() : Promise.reject(new Error("Unable to load team members.")))
    .then((members) => {
      if (featuredTeamMembers) {
        featuredTeamMembers.replaceChildren(...members.slice(0, 2).map(createMemberCard), createAllMembersLink());
      }
      if (allTeamMembers) {
        allTeamMembers.replaceChildren(...members.map(createMemberCard));
      }
    })
    .catch(() => {});
}
