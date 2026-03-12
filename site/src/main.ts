// Highlight active nav link
const currentPath = window.location.pathname;
document.querySelectorAll("nav a").forEach((link) => {
  const el = link as HTMLAnchorElement;
  if (el.classList.contains("logo")) return;
  el.classList.remove("active");
  const href = el.getAttribute("href");
  if (href && currentPath.endsWith(href.replace("./", ""))) {
    el.classList.add("active");
  }
  if (href === "./" && (currentPath.endsWith("/") || currentPath.endsWith("/index.html"))) {
    el.classList.add("active");
  }
});
