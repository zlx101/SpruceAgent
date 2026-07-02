const root = document.documentElement;

const preferredLanguage = navigator.language || "en";
root.lang = preferredLanguage.toLowerCase().startsWith("zh") ? "zh-CN" : "en";

document.querySelectorAll("a[href^='#']").forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});
