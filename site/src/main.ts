import Prism from "prismjs";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-bash";

// Highlight active nav link
const currentPath = window.location.pathname;
document.querySelectorAll("nav a").forEach((link) => {
  const el = link as HTMLAnchorElement;
  if (el.classList.contains("logo")) return;
  el.classList.remove("active");

  // Resolve the href to an absolute path via the anchor's built-in resolution
  const resolved = new URL(el.href).pathname.replace(/\/index\.html$/, "/");
  const normalized = currentPath.replace(/\/index\.html$/, "/");

  if (resolved === normalized) {
    el.classList.add("active");
  }
});

// Syntax highlighting
Prism.highlightAll();
