// Global Social Links Configuration (Single Source of Truth)
const SOCIAL_LINKS = [
  {
    name: "Instagram",
    url: "https://www.instagram.com/ntb_tcg",
    svg: `<svg class="social-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>`
  },
  {
    name: "YouTube",
    url: "https://www.youtube.com/@ntb_tcg",
    svg: `<svg class="social-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor" stroke="none"></polygon></svg>`
  },
  {
    name: "Twitch",
    url: "https://www.twitch.tv/northbound_tcg",
    svg: `<svg class="social-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2H3v16h5v4l4-4h5l4-4V2z"></path><path d="M11 11V7"></path><path d="M16 11V7"></path></svg>`
  },
  {
    name: "TikTok",
    url: "https://www.tiktok.com/@northbound582",
    svg: `<svg class="social-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path></svg>`
  }
];

const renderSocialLinks = () => {
  const containers = document.querySelectorAll(".social-links");
  if (!containers.length) return;

  const html = SOCIAL_LINKS.map(
    (link) => `
    <a href="${link.url}" target="_blank" rel="noopener noreferrer" aria-label="${link.name}" title="${link.name}" class="social-button">
      ${link.svg}
    </a>
  `
  ).join("");

  containers.forEach((container) => {
    container.innerHTML = html;
  });
};

renderSocialLinks();

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
